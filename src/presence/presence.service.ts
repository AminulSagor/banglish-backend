import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  ActiveUsersQueryDto,
  ActiveUsersResponseDto,
  ActiveUserDto,
} from './dto/active-users-query.dto';
import { PRESENCE_TIMEOUT_MINUTES } from './presence.constants';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ==================== HTTP-BASED PRESENCE ====================

  /**
   * Mark user as online (HTTP call from frontend)
   * Called when user opens the app/website
   */
  async setOnline(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });
    this.logger.log(`User ${userId} marked online via HTTP`);
  }

  /**
   * Mark user as offline (HTTP call from frontend)
   * Called when user closes the app/website
   */
  async setOffline(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });
    this.logger.log(`User ${userId} marked offline via HTTP`);
  }

  /**
   * Update heartbeat - keeps user online and updates lastSeen
   * Frontend should call this every few minutes
   */
  async heartbeat(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });
  }

  /**
   * Mark stale users as offline
   * Called by cron job to clean up users who didn't send heartbeat
   */
  async markStaleUsersOffline(): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - PRESENCE_TIMEOUT_MINUTES);

    const result = await this.userRepository.update(
      {
        isOnline: true,
        lastSeen: LessThan(cutoffTime),
      },
      {
        isOnline: false,
      },
    );

    const affected = result.affected || 0;
    if (affected > 0) {
      this.logger.log(
        `Marked ${affected} stale users as offline (no heartbeat for ${PRESENCE_TIMEOUT_MINUTES} min)`,
      );
    }
    return affected;
  }

  /**
   * Check if a specific user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['isOnline'],
    });
    return user?.isOnline ?? false;
  }

  /**
   * Get all active (online) users with pagination
   * Returns: id, isOnline, lastSeen, profile (fullName, profilePicture, country, interestedLanguages)
   */
  async getActiveUsers(
    query: ActiveUsersQueryDto,
  ): Promise<ActiveUsersResponseDto> {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      where: {
        isOnline: true,
        isActive: true,
      },
      relations: ['profile', 'profile.interestedLanguages'],
      order: { lastSeen: 'DESC' },
      skip,
      take: limit,
    });

    const activeUsers: ActiveUserDto[] = users.map((user) => ({
      id: user.id,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            profilePicture: user.profile.profilePicture,
            country: user.profile.country,
            interestedLanguages:
              user.profile.interestedLanguages?.map((lang) => ({
                id: lang.id,
                name: lang.name,
                code: lang.code,
                nativeName: lang.nativeName,
              })) || [],
          }
        : null,
    }));

    return {
      users: activeUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get count of online users
   */
  async getOnlineCount(): Promise<number> {
    return this.userRepository.count({
      where: { isOnline: true, isActive: true },
    });
  }

  /**
   * Mark all users as offline (useful for server restart)
   */
  async setAllUsersOffline(): Promise<void> {
    await this.userRepository.update({ isOnline: true }, { isOnline: false });
  }
}
