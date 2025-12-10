import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { CallService } from '../call/call.service';
import { Logger } from '@nestjs/common';
import { MessageType } from './entities/message.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Call timeout management (socket layer responsibility)
  private callTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly chatService: ChatService,
    private readonly callService: CallService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Set timeout for unanswered call (30 seconds)
   */
  private setCallTimeout(callId: string, callback: () => Promise<void>, ms: number = 30000): void {
    this.clearCallTimeout(callId); // Clear any existing timeout
    const timeout = setTimeout(callback, ms);
    this.callTimeouts.set(callId, timeout);
  }

  /**
   * Clear call timeout
   */
  private clearCallTimeout(callId: string): void {
    const timeout = this.callTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(callId);
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Chat client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.userId = userId;

      // Join personal room for direct messages
      client.join(`user:${userId}`);

      // Auto-join all group rooms the user belongs to
      const rooms = await this.chatService.getUserRooms(userId);
      rooms.forEach((room) => {
        client.join(`room:${room.id}`);
      });

      this.logger.log(
        `User ${userId} connected to chat with ${rooms.length} rooms`,
      );

      // Send connection confirmation with room count
      client.emit('chat:connected', {
        userId,
        roomCount: rooms.length,
      });
    } catch (error) {
      this.logger.error(`Chat connection error: ${error.message}`);
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`User ${client.userId} disconnected from chat`);
      
      // Check if user was in a call and end it (DB-based)
      const activeCallId = await this.callService.getActiveCallId(client.userId);
      if (activeCallId) {
        try {
          const result = await this.callService.endCall(activeCallId, client.userId);
          this.server.to(`call:${activeCallId}`).emit('call:ended', {
            callId: activeCallId,
            duration: result.duration,
            reason: 'disconnect',
          });
          // Clear any pending timeout for this call
          this.clearCallTimeout(activeCallId);
        } catch (error) {
          this.logger.error(`Error ending call on disconnect: ${error.message}`);
        }
      }
    }
  }

  // ==================== DIRECT MESSAGES ====================

  @SubscribeMessage('chat:sendDirect')
  async handleDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    rawData: { receiverId: string; content: string; type?: MessageType } | string,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Parse data if it's a string (Postman sends as string sometimes)
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    
    this.logger.log(`Direct message from ${client.userId}: ${JSON.stringify(data)}`);

    if (!data.receiverId || !data.content) {
      return { error: 'receiverId and content are required' };
    }

    try {
      const message = await this.chatService.sendDirectMessage(
        client.userId,
        data.receiverId,
        data.content,
        data.type,
      );

      // Send to receiver's personal room
      const receiverRoom = `user:${data.receiverId}`;
      this.logger.log(`Emitting chat:newMessage to room: ${receiverRoom}`);
      this.server.to(receiverRoom).emit('chat:newMessage', message);

      // Also send to sender (so they see their own message)
      client.emit('chat:newMessage', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Direct message error: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:getDirectHistory')
  async handleGetDirectHistory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string; page?: number; limit?: number },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      return await this.chatService.getDirectMessages(
        client.userId,
        data.userId,
        data.page || 1,
        data.limit || 50,
      );
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:getConversations')
  async handleGetConversations(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const conversations = await this.chatService.getConversations(
        client.userId,
      );
      return { conversations };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:markRead')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { senderId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      await this.chatService.markDirectMessagesAsRead(
        client.userId,
        data.senderId,
      );

      // Notify sender that their messages were read
      this.server.to(`user:${data.senderId}`).emit('chat:messagesRead', {
        readBy: client.userId,
      });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:getUnreadCount')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const count = await this.chatService.getUnreadCount(client.userId);
      return { count };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ==================== GROUP CHAT ====================

  @SubscribeMessage('chat:createRoom')
  async handleCreateRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    rawData: { name: string; memberIds: string[]; description?: string } | string,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Parse data if it's a string
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.name || !data.memberIds || !Array.isArray(data.memberIds)) {
      return { error: 'name and memberIds (array) are required' };
    }

    try {
      const room = await this.chatService.createRoom(
        client.userId,
        data.name,
        data.memberIds,
        data.description,
      );

      // Join creator's socket to room
      client.join(`room:${room.id}`);

      // Notify all members about the new room
      const allMemberIds = [...new Set([client.userId, ...data.memberIds])];
      allMemberIds.forEach((memberId) => {
        this.server.to(`user:${memberId}`).emit('chat:roomCreated', room);
      });

      return { success: true, room };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const isMember = await this.chatService.isRoomMember(
        data.roomId,
        client.userId,
      );
      if (!isMember) {
        return { error: 'Not a member of this room' };
      }

      client.join(`room:${data.roomId}`);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:getMyRooms')
  async handleGetMyRooms(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const rooms = await this.chatService.getUserRooms(client.userId);
      return { rooms };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Anyone can join a public room
  @SubscribeMessage('chat:joinGroup')
  async handleJoinGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { roomId: string } | string,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Parse data if it's a string
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.roomId) {
      return { error: 'roomId is required' };
    }

    try {
      const room = await this.chatService.joinRoom(data.roomId, client.userId);

      // Join the socket room
      client.join(`room:${data.roomId}`);

      // Notify room members about new member
      this.server.to(`room:${data.roomId}`).emit('chat:memberJoined', {
        roomId: data.roomId,
        userId: client.userId,
      });

      return { success: true, room };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:getRoom')
  async handleGetRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const isMember = await this.chatService.isRoomMember(
        data.roomId,
        client.userId,
      );
      if (!isMember) {
        return { error: 'Not a member of this room' };
      }

      const room = await this.chatService.getRoom(data.roomId);
      return { room };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:sendToRoom')
  async handleRoomMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    rawData: { roomId: string; content: string; type?: MessageType } | string,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Parse data if it's a string
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.roomId || !data.content) {
      return { error: 'roomId and content are required' };
    }

    try {
      const message = await this.chatService.sendRoomMessage(
        client.userId,
        data.roomId,
        data.content,
        data.type,
      );

      // Broadcast to all room members
      this.server.to(`room:${data.roomId}`).emit('chat:newRoomMessage', message);

      return { success: true, message };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:getRoomHistory')
  async handleGetRoomHistory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; page?: number; limit?: number },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const isMember = await this.chatService.isRoomMember(
        data.roomId,
        client.userId,
      );
      if (!isMember) {
        return { error: 'Not a member of this room' };
      }

      return await this.chatService.getRoomMessages(
        data.roomId,
        data.page || 1,
        data.limit || 50,
      );
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:addMember')
  async handleAddMember(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { roomId: string; userId: string } | string,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Parse data if it's a string
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.roomId || !data.userId) {
      return { error: 'roomId and userId are required' };
    }

    this.logger.log(`Add member: room=${data.roomId}, user=${data.userId}, requester=${client.userId}`);

    try {
      const room = await this.chatService.addMember(
        data.roomId,
        data.userId,
        client.userId,
      );

      // Notify the new member
      this.server.to(`user:${data.userId}`).emit('chat:addedToRoom', {
        roomId: data.roomId,
        room,
      });

      // Notify existing room members
      this.server.to(`room:${data.roomId}`).emit('chat:memberAdded', {
        roomId: data.roomId,
        userId: data.userId,
      });

      return { success: true, room };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:removeMember')
  async handleRemoveMember(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      await this.chatService.removeMember(
        data.roomId,
        data.userId,
        client.userId,
      );

      // Notify removed member
      this.server.to(`user:${data.userId}`).emit('chat:removedFromRoom', {
        roomId: data.roomId,
      });

      // Notify room members
      this.server.to(`room:${data.roomId}`).emit('chat:memberRemoved', {
        roomId: data.roomId,
        userId: data.userId,
      });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      await this.chatService.leaveRoom(data.roomId, client.userId);
      client.leave(`room:${data.roomId}`);

      // Notify room members
      this.server.to(`room:${data.roomId}`).emit('chat:memberLeft', {
        roomId: data.roomId,
        userId: client.userId,
      });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ==================== TYPING INDICATOR ====================

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { roomId?: string; receiverId?: string; isTyping: boolean },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const payload = { userId: client.userId, isTyping: data.isTyping };

    if (data.roomId) {
      // Typing in group - broadcast to room except sender
      client.to(`room:${data.roomId}`).emit('chat:userTyping', {
        ...payload,
        roomId: data.roomId,
      });
    } else if (data.receiverId) {
      // Typing in DM - send to receiver only
      this.server.to(`user:${data.receiverId}`).emit('chat:userTyping', payload);
    }

    return { success: true };
  }

  // ==================== VOICE CALL EVENTS ====================

  /**
   * Initiate a 1:1 direct call
   */
  @SubscribeMessage('call:initiate')
  async handleInitiateCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { receiverId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.receiverId) {
      return { error: 'receiverId is required' };
    }

    try {
      // Check if receiver is online
      const receiverRoom = `user:${data.receiverId}`;
      const receiverSockets = await this.server.in(receiverRoom).fetchSockets();
      
      if (receiverSockets.length === 0) {
        return { error: 'User is offline' };
      }

      // Create call via service
      const result = await this.callService.initiateDirectCall(
        client.userId,
        data.receiverId,
      );

      // Join caller to call room
      client.join(`call:${result.callSession.id}`);

      // Get caller info for the incoming call notification
      const callerInfo = await this.callService.getUserInfo(client.userId);

      // Notify receiver about incoming call
      this.server.to(receiverRoom).emit('call:incoming', {
        callId: result.callSession.id,
        callerId: client.userId,
        callerInfo,
      });

      // Set 30s timeout for unanswered call (managed by gateway)
      this.setCallTimeout(result.callSession.id, async () => {
        const missedCall = await this.callService.missCall(result.callSession.id);
        this.server.to(`call:${result.callSession.id}`).emit('call:missed', {
          callId: result.callSession.id,
        });
        this.server.to(receiverRoom).emit('call:missed', {
          callId: result.callSession.id,
        });
      });

      this.logger.log(`Call initiated: ${result.callSession.id} from ${client.userId} to ${data.receiverId}`);

      return {
        success: true,
        callId: result.callSession.id,
        agoraToken: result.agoraToken,
        agoraAppId: result.agoraAppId,
        channelName: result.callSession.id,
        uid: result.uid,
      };
    } catch (error) {
      this.logger.error(`Call initiate error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Accept an incoming call
   */
  @SubscribeMessage('call:accept')
  async handleAcceptCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId) {
      return { error: 'callId is required' };
    }

    try {
      // Clear the timeout since call is being accepted
      this.clearCallTimeout(data.callId);

      const result = await this.callService.acceptCall(data.callId, client.userId);

      // Join receiver to call room
      client.join(`call:${data.callId}`);

      // Notify caller that call was accepted
      client.to(`call:${data.callId}`).emit('call:accepted', {
        callId: data.callId,
      });

      this.logger.log(`Call accepted: ${data.callId} by ${client.userId}`);

      return {
        success: true,
        agoraToken: result.agoraToken,
        agoraAppId: result.agoraAppId,
        channelName: data.callId,
        uid: result.uid,
      };
    } catch (error) {
      this.logger.error(`Call accept error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Reject an incoming call
   */
  @SubscribeMessage('call:reject')
  async handleRejectCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId) {
      return { error: 'callId is required' };
    }

    try {
      // Clear the timeout since call is being rejected
      this.clearCallTimeout(data.callId);

      await this.callService.rejectCall(data.callId, client.userId);

      // Notify caller that call was rejected
      this.server.to(`call:${data.callId}`).emit('call:rejected', {
        callId: data.callId,
      });

      this.logger.log(`Call rejected: ${data.callId} by ${client.userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Call reject error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Cancel an outgoing call (before answer)
   */
  @SubscribeMessage('call:cancel')
  async handleCancelCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId) {
      return { error: 'callId is required' };
    }

    try {
      // Clear the timeout since call is being cancelled
      this.clearCallTimeout(data.callId);

      const call = await this.callService.getCall(data.callId);
      await this.callService.cancelCall(data.callId, client.userId);

      // Notify receiver that call was cancelled
      this.server.to(`user:${call.receiverId}`).emit('call:cancelled', {
        callId: data.callId,
      });

      this.logger.log(`Call cancelled: ${data.callId} by ${client.userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Call cancel error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * End an ongoing call
   */
  @SubscribeMessage('call:end')
  async handleEndCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId) {
      return { error: 'callId is required' };
    }

    try {
      const result = await this.callService.endCall(data.callId, client.userId);

      // Notify all participants
      this.server.to(`call:${data.callId}`).emit('call:ended', {
        callId: data.callId,
        duration: result.duration,
        endedBy: client.userId,
      });

      // Leave the call room
      client.leave(`call:${data.callId}`);

      this.logger.log(`Call ended: ${data.callId} by ${client.userId}, duration: ${result.duration}s`);

      return { success: true, duration: result.duration };
    } catch (error) {
      this.logger.error(`Call end error: ${error.message}`);
      return { error: error.message };
    }
  }

  // ==================== GROUP CALL EVENTS ====================

  /**
   * Initiate a group call
   */
  @SubscribeMessage('call:initiateGroup')
  async handleInitiateGroupCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { roomId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.roomId) {
      return { error: 'roomId is required' };
    }

    try {
      // Verify user is room member
      const isMember = await this.chatService.isRoomMember(data.roomId, client.userId);
      if (!isMember) {
        return { error: 'Not a member of this room' };
      }

      const result = await this.callService.initiateGroupCall(client.userId, data.roomId);

      // Join caller to call socket room
      client.join(`call:${result.callSession.id}`);

      // Get caller info
      const callerInfo = await this.callService.getUserInfo(client.userId);

      // Notify all room members EXCEPT caller
      client.to(`room:${data.roomId}`).emit('call:incoming', {
        callId: result.callSession.id,
        callerId: client.userId,
        callerInfo,
        roomId: data.roomId,
        isGroupCall: true,
      });

      this.logger.log(`Group call initiated: ${result.callSession.id} in room ${data.roomId}`);

      return {
        success: true,
        callId: result.callSession.id,
        agoraToken: result.agoraToken,
        agoraAppId: result.agoraAppId,
        channelName: result.callSession.id,
        uid: result.uid,
        hostId: result.callSession.hostId, // Caller is the host
        isHost: true,
      };
    } catch (error) {
      this.logger.error(`Group call initiate error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Join an ongoing group call
   */
  @SubscribeMessage('call:joinGroup')
  async handleJoinGroupCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId) {
      return { error: 'callId is required' };
    }

    try {
      const result = await this.callService.joinGroupCall(data.callId, client.userId);

      // Join socket room
      client.join(`call:${data.callId}`);

      // Notify others in the call
      const userInfo = await this.callService.getUserInfo(client.userId);
      client.to(`call:${data.callId}`).emit('call:userJoined', {
        callId: data.callId,
        userId: client.userId,
        userInfo,
      });

      this.logger.log(`User ${client.userId} joined group call ${data.callId}`);

      return {
        success: true,
        agoraToken: result.agoraToken,
        agoraAppId: result.agoraAppId,
        channelName: data.callId,
        uid: result.uid,
        participants: result.callSession.participants,
        hostId: result.callSession.hostId,
        participantDetails: result.callSession.participantDetails,
      };
    } catch (error) {
      this.logger.error(`Join group call error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Leave a group call (doesn't end it for others)
   */
  @SubscribeMessage('call:leaveGroup')
  async handleLeaveGroupCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId) {
      return { error: 'callId is required' };
    }

    try {
      const result = await this.callService.endCall(data.callId, client.userId);

      // Notify others in the call
      client.to(`call:${data.callId}`).emit('call:userLeft', {
        callId: data.callId,
        userId: client.userId,
      });

      // If call ended (no participants left)
      if (result.callSession.participants.length === 0) {
        this.server.to(`call:${data.callId}`).emit('call:ended', {
          callId: data.callId,
          duration: result.duration,
        });
      }

      // Leave socket room
      client.leave(`call:${data.callId}`);

      this.logger.log(`User ${client.userId} left group call ${data.callId}`);

      return { success: true, duration: result.duration };
    } catch (error) {
      this.logger.error(`Leave group call error: ${error.message}`);
      return { error: error.message };
    }
  }

  // ==================== MUTE CONTROL EVENTS ====================

  /**
   * Toggle self mute (any participant can mute/unmute themselves)
   */
  @SubscribeMessage('call:toggleMute')
  async handleToggleMute(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string; isMuted: boolean } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId || data.isMuted === undefined) {
      return { error: 'callId and isMuted are required' };
    }

    try {
      const result = await this.callService.toggleSelfMute(
        data.callId,
        client.userId,
        data.isMuted,
      );

      // Notify all participants about the mute state change
      this.server.to(`call:${data.callId}`).emit('call:participantMuted', {
        callId: data.callId,
        userId: client.userId,
        isMuted: data.isMuted,
        mutedBy: client.userId, // Self-muted
      });

      this.logger.log(`User ${client.userId} ${data.isMuted ? 'muted' : 'unmuted'} themselves in call ${data.callId}`);

      return { success: true, isMuted: data.isMuted };
    } catch (error) {
      this.logger.error(`Toggle mute error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Host mutes a participant (host only, can only mute, not unmute)
   */
  @SubscribeMessage('call:hostMute')
  async handleHostMute(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string; targetUserId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId || !data.targetUserId) {
      return { error: 'callId and targetUserId are required' };
    }

    try {
      const result = await this.callService.hostMuteParticipant(
        data.callId,
        client.userId,
        data.targetUserId,
        true, // Host can only mute
      );

      // Notify all participants about the mute
      this.server.to(`call:${data.callId}`).emit('call:participantMuted', {
        callId: data.callId,
        userId: data.targetUserId,
        isMuted: true,
        mutedBy: client.userId, // Muted by host
      });

      // Send specific notification to the muted user
      this.server.to(`user:${data.targetUserId}`).emit('call:youWereMuted', {
        callId: data.callId,
        mutedBy: client.userId,
      });

      this.logger.log(`Host ${client.userId} muted user ${data.targetUserId} in call ${data.callId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Host mute error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Transfer host role to another participant
   */
  @SubscribeMessage('call:transferHost')
  async handleTransferHost(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string; newHostId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId || !data.newHostId) {
      return { error: 'callId and newHostId are required' };
    }

    try {
      const callSession = await this.callService.transferHost(
        data.callId,
        client.userId,
        data.newHostId,
      );

      // Notify all participants about the host change
      this.server.to(`call:${data.callId}`).emit('call:hostChanged', {
        callId: data.callId,
        previousHostId: client.userId,
        newHostId: data.newHostId,
      });

      this.logger.log(`Host transferred from ${client.userId} to ${data.newHostId} in call ${data.callId}`);

      return { success: true, newHostId: data.newHostId };
    } catch (error) {
      this.logger.error(`Transfer host error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Host kicks/removes a participant from the call
   */
  @SubscribeMessage('call:kickParticipant')
  async handleKickParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string; targetUserId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId || !data.targetUserId) {
      return { error: 'callId and targetUserId are required' };
    }

    try {
      const callSession = await this.callService.kickParticipant(
        data.callId,
        client.userId,
        data.targetUserId,
      );

      // Notify the kicked user
      this.server.to(`user:${data.targetUserId}`).emit('call:youWereKicked', {
        callId: data.callId,
        kickedBy: client.userId,
      });

      // Notify all remaining participants
      this.server.to(`call:${data.callId}`).emit('call:participantKicked', {
        callId: data.callId,
        userId: data.targetUserId,
        kickedBy: client.userId,
      });

      this.logger.log(`Host ${client.userId} kicked user ${data.targetUserId} from call ${data.callId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Kick participant error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Get participants list with mute status
   */
  @SubscribeMessage('call:getParticipants')
  async handleGetParticipants(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() rawData: { callId: string } | string,
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (!data.callId) {
      return { error: 'callId is required' };
    }

    try {
      const result = await this.callService.getParticipantsWithStatus(data.callId);

      // Get user info for each participant
      const participantsWithInfo = await Promise.all(
        result.participants.map(async (p) => {
          const userInfo = await this.callService.getUserInfo(p.userId);
          return {
            ...p,
            userInfo,
            isHost: p.userId === result.hostId,
          };
        }),
      );

      return {
        success: true,
        hostId: result.hostId,
        participants: participantsWithInfo,
      };
    } catch (error) {
      this.logger.error(`Get participants error: ${error.message}`);
      return { error: error.message };
    }
  }
}
