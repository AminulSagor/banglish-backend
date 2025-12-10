import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRoomDto, AddMemberDto, UpdateRoomDto } from './dto/create-room.dto';
import { MessageQueryDto } from './dto/message-query.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== DIRECT MESSAGES ====================

  /**
   * Get all conversations (list of users you've chatted with)
   */
  @Get('conversations')
  async getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.sub);
  }

  /**
   * Get direct message history with a specific user
   */
  @Get('direct/:userId')
  async getDirectMessages(
    @Request() req,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.chatService.getDirectMessages(
      req.user.sub,
      userId,
      query.page,
      query.limit,
    );
  }

  /**
   * Get unread message count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.chatService.getUnreadCount(req.user.sub);
    return { count };
  }

  /**
   * Mark messages from a sender as read
   */
  @Post('mark-read/:senderId')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req,
    @Param('senderId', ParseUUIDPipe) senderId: string,
  ) {
    await this.chatService.markDirectMessagesAsRead(req.user.sub, senderId);
    return { success: true };
  }

  // ==================== GROUP CHAT ROOMS ====================

  /**
   * Get all public rooms (for discovery/joining)
   */
  @Get('rooms/public')
  async getPublicRooms() {
    const rooms = await this.chatService.getAllPublicRooms();
    return { rooms };
  }

  /**
   * Get all rooms the user is a member of
   */
  @Get('rooms')
  async getMyRooms(@Request() req) {
    const rooms = await this.chatService.getUserRooms(req.user.sub);
    return { rooms };
  }

  /**
   * Create a new chat room
   */
  @Post('rooms')
  async createRoom(@Request() req, @Body() dto: CreateRoomDto) {
    const room = await this.chatService.createRoom(
      req.user.sub,
      dto.name,
      dto.memberIds,
      dto.description,
    );
    return { room };
  }

  /**
   * Get room details
   */
  @Get('rooms/:roomId')
  async getRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    const isMember = await this.chatService.isRoomMember(roomId, req.user.sub);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this room');
    }
    const room = await this.chatService.getRoom(roomId);
    return { room };
  }

  /**
   * Get room message history
   */
  @Get('rooms/:roomId/messages')
  async getRoomMessages(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: MessageQueryDto,
  ) {
    const isMember = await this.chatService.isRoomMember(roomId, req.user.sub);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this room');
    }
    return this.chatService.getRoomMessages(roomId, query.page, query.limit);
  }

  /**
   * Join a room
   */
  @Post('rooms/:roomId/join')
  @HttpCode(HttpStatus.OK)
  async joinRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    const room = await this.chatService.joinRoom(roomId, req.user.sub);
    return { room };
  }

  /**
   * Update room (admin only)
   */
  @Patch('rooms/:roomId')
  async updateRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const room = await this.chatService.updateRoom(roomId, req.user.sub, dto);
    return { room };
  }

  /**
   * Add a member to a room (admin only)
   */
  @Post('rooms/:roomId/members')
  async addMember(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: AddMemberDto,
  ) {
    const room = await this.chatService.addMember(
      roomId,
      dto.userId,
      req.user.sub,
    );
    return { room };
  }

  /**
   * Remove a member from a room (admin only)
   */
  @Delete('rooms/:roomId/members/:userId')
  async removeMember(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.chatService.removeMember(roomId, userId, req.user.sub);
    return { success: true };
  }

  /**
   * Leave a room
   */
  @Post('rooms/:roomId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    await this.chatService.leaveRoom(roomId, req.user.sub);
    return { success: true };
  }

  /**
   * Delete a room (creator only)
   */
  @Delete('rooms/:roomId')
  async deleteRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    await this.chatService.deleteRoom(roomId, req.user.sub);
    return { success: true };
  }
}
