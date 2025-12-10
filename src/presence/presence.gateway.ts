import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PresenceService } from './presence.service';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/',
})
export class PresenceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  constructor(
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
    // Mark all users as offline on server start (clean state)
    this.presenceService.setAllUsersOffline();
  }

  /**
   * Handle new socket connection
   * Client should send JWT token in auth header or query param
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token as string, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.userId = userId;

      // Mark user as online
      await this.presenceService.setUserOnline(userId, client.id);

      // Join user's personal room (for targeted messages later)
      client.join(`user:${userId}`);

      // Broadcast to all clients that this user is now online
      this.server.emit('user:online', {
        userId,
        timestamp: new Date(),
      });

      // Send current online count to the connected user
      const onlineCount = await this.presenceService.getOnlineCount();
      client.emit('presence:count', { count: onlineCount });

      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  /**
   * Handle socket disconnection
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      let userId = client.userId;

      // If userId not in socket, try to find by socketId
      if (!userId) {
        const user = await this.presenceService.getUserBySocketId(client.id);
        userId = user?.id;
      }

      if (userId) {
        // Mark user as offline
        await this.presenceService.setUserOffline(userId);

        // Broadcast to all clients that this user is now offline
        this.server.emit('user:offline', {
          userId,
          timestamp: new Date(),
        });

        this.logger.log(`User ${userId} disconnected`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Client can request list of active users
   * Returns data directly to callback
   */
  @SubscribeMessage('presence:getActiveUsers')
  async handleGetActiveUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { page?: number; limit?: number },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated', users: [], total: 0 };
    }

    try {
      const result = await this.presenceService.getActiveUsers({
        page: data?.page || 1,
        limit: data?.limit || 50,
      });
      this.logger.log(`Returning ${result.users.length} active users to ${client.userId}`);
      return result; // Return data directly for callback
    } catch (error) {
      this.logger.error(`Error getting active users: ${error.message}`);
      return { error: error.message, users: [], total: 0 };
    }
  }

  /**
   * Client can request online count
   */
  @SubscribeMessage('presence:getCount')
  async handleGetCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated', count: 0 };
    }

    try {
      const count = await this.presenceService.getOnlineCount();
      return { count }; // Return data directly for callback
    } catch (error) {
      this.logger.error(`Error getting online count: ${error.message}`);
      return { error: error.message, count: 0 };
    }
  }

  /**
   * Check if a specific user is online
   */
  @SubscribeMessage('presence:isOnline')
  async handleIsOnline(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated', isOnline: false };
    }

    try {
      const isOnline = await this.presenceService.isUserOnline(data.userId);
      return { userId: data.userId, isOnline }; // Return data directly
    } catch (error) {
      return { error: error.message, isOnline: false };
    }
  }

  /**
   * Heartbeat to keep connection alive and update lastSeen
   */
  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.userId) {
      await this.presenceService.setUserOnline(client.userId, client.id);
      return { ok: true }; // Return data directly
    }
    return { error: 'Not authenticated', ok: false };
  }
}
