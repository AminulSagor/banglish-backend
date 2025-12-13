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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateRoomDto,
  AddMemberDto,
  UpdateRoomDto,
} from './dto/create-room.dto';
import { MessageQueryDto } from './dto/message-query.dto';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== DIRECT MESSAGES ====================

  @Get('conversations')
  @ApiOperation({
    summary: 'Get conversations',
    description: 'Get list of users you have chatted with',
  })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.sub);
  }

  @Get('direct/:userId')
  @ApiOperation({
    summary: 'Get direct messages',
    description: 'Get message history with a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User UUID to get messages with' })
  @ApiResponse({ status: 200, description: 'Message history' })
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

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread count',
    description: 'Get total unread message count',
  })
  @ApiResponse({ status: 200, description: 'Unread message count' })
  async getUnreadCount(@Request() req) {
    const count = await this.chatService.getUnreadCount(req.user.sub);
    return { count };
  }

  @Post('mark-read/:senderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark messages as read',
    description: 'Mark all messages from a sender as read',
  })
  @ApiParam({ name: 'senderId', description: 'Sender UUID' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @Request() req,
    @Param('senderId', ParseUUIDPipe) senderId: string,
  ) {
    await this.chatService.markDirectMessagesAsRead(req.user.sub, senderId);
    return { success: true };
  }

  // ==================== GROUP CHAT ROOMS ====================

  @Get('rooms/public')
  @ApiOperation({
    summary: 'Get public rooms',
    description: 'Get all public rooms for discovery',
  })
  @ApiResponse({ status: 200, description: 'List of public rooms' })
  async getPublicRooms() {
    const rooms = await this.chatService.getAllPublicRooms();
    return { rooms };
  }

  @Get('rooms')
  @ApiOperation({
    summary: 'Get my rooms',
    description: 'Get all rooms the user is a member of',
  })
  @ApiResponse({ status: 200, description: 'List of rooms' })
  async getMyRooms(@Request() req) {
    const rooms = await this.chatService.getUserRooms(req.user.sub);
    return { rooms };
  }

  @Post('rooms')
  @ApiOperation({
    summary: 'Create room',
    description: 'Create a new chat room',
  })
  @ApiResponse({ status: 201, description: 'Room created' })
  async createRoom(@Request() req, @Body() dto: CreateRoomDto) {
    const room = await this.chatService.createRoom(
      req.user.sub,
      dto.name,
      dto.memberIds,
      dto.description,
    );
    return { room };
  }

  @Get('rooms/:roomId')
  @ApiOperation({
    summary: 'Get room details',
    description: 'Get details of a specific room',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room details' })
  @ApiResponse({ status: 403, description: 'Not a member of this room' })
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

  @Get('rooms/:roomId/messages')
  @ApiOperation({
    summary: 'Get room messages',
    description: 'Get message history for a room',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Message history' })
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

  @Post('rooms/:roomId/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join room', description: 'Join a chat room' })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Joined room' })
  async joinRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    const room = await this.chatService.joinRoom(roomId, req.user.sub);
    return { room };
  }

  @Patch('rooms/:roomId')
  @ApiOperation({
    summary: 'Update room (Admin)',
    description: 'Update room details - Admin only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  @ApiResponse({ status: 403, description: 'Only admins can update' })
  async updateRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const room = await this.chatService.updateRoom(roomId, req.user.sub, dto);
    return { room };
  }

  @Post('rooms/:roomId/members')
  @ApiOperation({
    summary: 'Add member (Admin)',
    description: 'Add a member to room - Admin only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Member added' })
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

  @Delete('rooms/:roomId/members/:userId')
  @ApiOperation({
    summary: 'Remove member (Admin)',
    description: 'Remove a member from room - Admin only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.chatService.removeMember(roomId, userId, req.user.sub);
    return { success: true };
  }

  @Post('rooms/:roomId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave room', description: 'Leave a chat room' })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Left room' })
  async leaveRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    await this.chatService.leaveRoom(roomId, req.user.sub);
    return { success: true };
  }

  @Post('rooms/:roomId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate room (Admin)',
    description: 'Soft delete room - Admin only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room deactivated' })
  async deactivateRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    await this.chatService.deactivateRoom(roomId, req.user.sub);
    return { success: true, message: 'Room deactivated' };
  }

  @Post('rooms/:roomId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reactivate room (Creator)',
    description: 'Restore deactivated room - Creator only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room reactivated' })
  async reactivateRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    await this.chatService.reactivateRoom(roomId, req.user.sub);
    return { success: true, message: 'Room reactivated' };
  }

  @Delete('rooms/:roomId')
  @ApiOperation({
    summary: 'Delete room (Creator)',
    description: 'Permanently delete room - Creator only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room deleted' })
  async deleteRoom(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    await this.chatService.deleteRoom(roomId, req.user.sub);
    return { success: true, message: 'Room permanently deleted' };
  }

  // ==================== ADMIN MANAGEMENT ====================

  @Get('rooms/:roomId/admins')
  @ApiOperation({
    summary: 'Get room admins',
    description: 'Get list of admins for a room',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'List of admins' })
  async getRoomAdmins(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    const isMember = await this.chatService.isRoomMember(roomId, req.user.sub);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this room');
    }
    const admins = await this.chatService.getRoomAdmins(roomId);
    return { admins };
  }

  @Post('rooms/:roomId/admins/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Make admin',
    description: 'Promote member to admin - Admin only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to promote' })
  @ApiResponse({ status: 200, description: 'User promoted' })
  async makeAdmin(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.chatService.makeAdmin(roomId, userId, req.user.sub);
    return { success: true, message: 'User promoted to admin' };
  }

  @Delete('rooms/:roomId/admins/:userId')
  @ApiOperation({
    summary: 'Remove admin',
    description: 'Demote admin to member - Admin only',
  })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to demote' })
  @ApiResponse({ status: 200, description: 'Admin demoted' })
  async removeAdmin(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.chatService.removeAdmin(roomId, userId, req.user.sub);
    return { success: true, message: 'Admin demoted to member' };
  }
}
