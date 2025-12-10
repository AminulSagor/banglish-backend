import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Message, MessageType } from './entities/message.entity';
import { ChatRoom, RoomType } from './entities/chat-room.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(ChatRoom)
    private roomRepo: Repository<ChatRoom>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // Helper to sanitize user data (remove sensitive fields)
  private sanitizeUser(user: User) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      profile: user.profile ? {
        id: user.profile.id,
        fullName: user.profile.fullName,
        profilePicture: user.profile.profilePicture,
      } : null,
    };
  }

  // Helper to sanitize message data
  private sanitizeMessage(message: Message) {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      senderId: message.senderId,
      sender: message.sender ? this.sanitizeUser(message.sender) : null,
      receiverId: message.receiverId,
      roomId: message.roomId,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }

  // Helper to sanitize room data
  private sanitizeRoom(room: ChatRoom) {
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      avatarUrl: room.avatarUrl,
      createdById: room.createdById,
      createdBy: room.createdBy ? this.sanitizeUser(room.createdBy) : null,
      members: room.members ? room.members.map(m => this.sanitizeUser(m)) : [],
      admins: room.admins ? room.admins.map(a => this.sanitizeUser(a)) : [],
      memberCount: room.members?.length || 0,
      isActive: room.isActive,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  // ==================== DIRECT MESSAGES ====================

  async sendDirectMessage(
    senderId: string,
    receiverId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
  ) {
    const message = this.messageRepo.create({
      senderId,
      receiverId,
      content,
      type,
    });

    const saved = await this.messageRepo.save(message);

    // Return with sender info
    const result = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['sender', 'sender.profile'],
    });

    return this.sanitizeMessage(result!);
  }

  async getDirectMessages(
    userId1: string,
    userId2: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const [messages, total] = await this.messageRepo.findAndCount({
      where: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
      relations: ['sender', 'sender.profile'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages: messages.reverse().map(m => this.sanitizeMessage(m)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markDirectMessagesAsRead(receiverId: string, senderId: string) {
    await this.messageRepo.update(
      { senderId, receiverId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getConversations(userId: string) {
    // Get all messages involving this user (direct messages only)
    const messages = await this.messageRepo
      .createQueryBuilder('msg')
      .select([
        'CASE WHEN msg.sender_id = :userId THEN msg.receiver_id ELSE msg.sender_id END AS "partnerId"',
      ])
      .where('(msg.sender_id = :userId OR msg.receiver_id = :userId)', { userId })
      .andWhere('msg.room_id IS NULL')
      .groupBy('"partnerId"')
      .getRawMany();

    const partnerIds = messages
      .map((m) => m.partnerId)
      .filter((id) => id && id !== userId);

    if (partnerIds.length === 0) return [];

    // Get partner details
    const partners = await this.userRepo.find({
      where: { id: In(partnerIds) },
      relations: ['profile'],
    });

    // Build conversation list with last message and unread count
    return Promise.all(
      partners.map(async (partner) => {
        const lastMessage = await this.messageRepo.findOne({
          where: [
            { senderId: userId, receiverId: partner.id },
            { senderId: partner.id, receiverId: userId },
          ],
          order: { createdAt: 'DESC' },
        });

        const unreadCount = await this.messageRepo.count({
          where: { senderId: partner.id, receiverId: userId, isRead: false },
        });

        return {
          partner: {
            id: partner.id,
            email: partner.email,
            profile: partner.profile
              ? {
                  fullName: partner.profile.fullName,
                  profilePicture: partner.profile.profilePicture,
                }
              : null,
            isOnline: partner.isOnline,
            lastSeen: partner.lastSeen,
          },
          lastMessage: lastMessage ? this.sanitizeMessage(lastMessage) : null,
          unreadCount,
        };
      }),
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepo.count({
      where: { receiverId: userId, isRead: false, roomId: IsNull() },
    });
  }

  // ==================== GROUP CHAT ====================

  async createRoom(
    creatorId: string,
    name: string,
    memberIds: string[],
    description?: string,
  ) {
    const allMemberIds = [...new Set([creatorId, ...memberIds])];

    const members = await this.userRepo.find({
      where: { id: In(allMemberIds) },
      relations: ['profile'],
    });

    const creator = members.find((m) => m.id === creatorId);

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const room = this.roomRepo.create({
      name,
      description,
      type: RoomType.GROUP,
      createdById: creatorId,
      members,
      admins: [creator],
    });

    const savedRoom = await this.roomRepo.save(room);

    const result = await this.roomRepo.findOne({
      where: { id: savedRoom.id },
      relations: ['members', 'members.profile', 'admins', 'admins.profile', 'createdBy', 'createdBy.profile'],
    });

    return this.sanitizeRoom(result!);
  }

  async sendRoomMessage(
    senderId: string,
    roomId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
  ) {
    const isMember = await this.isRoomMember(roomId, senderId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this room');
    }

    const message = this.messageRepo.create({
      senderId,
      roomId,
      content,
      type,
    });

    const saved = await this.messageRepo.save(message);

    // Update room's updatedAt
    await this.roomRepo.update(roomId, { updatedAt: new Date() });

    const result = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['sender', 'sender.profile'],
    });

    return this.sanitizeMessage(result!);
  }

  async getRoomMessages(roomId: string, page: number = 1, limit: number = 50) {
    const [messages, total] = await this.messageRepo.findAndCount({
      where: { roomId },
      relations: ['sender', 'sender.profile'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages: messages.reverse().map(m => this.sanitizeMessage(m)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserRooms(userId: string) {
    const rooms = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('member.profile', 'profile')
      .leftJoinAndSelect('room.admins', 'admin')
      .leftJoinAndSelect('admin.profile', 'adminProfile')
      .leftJoinAndSelect('room.createdBy', 'creator')
      .leftJoinAndSelect('creator.profile', 'creatorProfile')
      .where('member.id = :userId', { userId })
      .andWhere('room.isActive = :isActive', { isActive: true })
      .orderBy('room.updatedAt', 'DESC')
      .getMany();
    
    return rooms.map(r => this.sanitizeRoom(r));
  }

  // Get all public/group rooms that users can discover and join
  async getAllPublicRooms() {
    const rooms = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('room.createdBy', 'creator')
      .leftJoinAndSelect('creator.profile', 'creatorProfile')
      .where('room.type = :type', { type: RoomType.GROUP })
      .andWhere('room.isActive = :isActive', { isActive: true })
      .orderBy('room.updatedAt', 'DESC')
      .getMany();
    
    return rooms.map(r => this.sanitizeRoom(r));
  }

  async getRoom(roomId: string) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['members', 'members.profile', 'admins', 'admins.profile', 'createdBy', 'createdBy.profile'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return this.sanitizeRoom(room);
  }

  async isRoomMember(roomId: string, userId: string): Promise<boolean> {
    const count = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoin('room.members', 'member')
      .where('room.id = :roomId', { roomId })
      .andWhere('member.id = :userId', { userId })
      .getCount();

    return count > 0;
  }

  async isRoomAdmin(roomId: string, userId: string): Promise<boolean> {
    const count = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoin('room.admins', 'admin')
      .where('room.id = :roomId', { roomId })
      .andWhere('admin.id = :userId', { userId })
      .getCount();

    return count > 0;
  }

  // Anyone can join a room themselves
  async joinRoom(roomId: string, userId: string) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId, isActive: true },
      relations: ['members'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const alreadyMember = room.members.some((m) => m.id === userId);
    if (alreadyMember) {
      throw new ForbiddenException('Already a member of this room');
    }

    room.members.push(user);
    await this.roomRepo.save(room);

    return this.getRoom(roomId);
  }

  // Admin can add other members
  async addMember(roomId: string, userId: string, requesterId: string) {
    // If adding yourself, use joinRoom instead
    if (userId === requesterId) {
      return this.joinRoom(roomId, userId);
    }

    // Only admins can add other users
    const isAdmin = await this.isRoomAdmin(roomId, requesterId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can add other members');
    }

    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['members'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const alreadyMember = room.members.some((m) => m.id === userId);
    if (alreadyMember) {
      throw new ForbiddenException('User is already a member');
    }

    room.members.push(user);
    await this.roomRepo.save(room);

    return this.getRoom(roomId);
  }

  async removeMember(roomId: string, userId: string, requesterId: string) {
    const isAdmin = await this.isRoomAdmin(roomId, requesterId);
    if (!isAdmin && userId !== requesterId) {
      throw new ForbiddenException('Only admins can remove members');
    }

    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['members', 'admins'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    room.members = room.members.filter((m) => m.id !== userId);
    room.admins = room.admins.filter((a) => a.id !== userId);

    await this.roomRepo.save(room);
  }

  async leaveRoom(roomId: string, userId: string) {
    return this.removeMember(roomId, userId, userId);
  }

  async updateRoom(
    roomId: string,
    userId: string,
    updates: { name?: string; description?: string; avatarUrl?: string },
  ) {
    const isAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update the room');
    }

    await this.roomRepo.update(roomId, updates);
    return this.getRoom(roomId);
  }

  async deleteRoom(roomId: string, userId: string) {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.createdById !== userId) {
      throw new ForbiddenException('Only the room creator can delete the room');
    }

    await this.roomRepo.update(roomId, { isActive: false });
  }
}
