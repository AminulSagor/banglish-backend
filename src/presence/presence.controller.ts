import { Controller, Get, Post, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { ActiveUsersQueryDto } from './dto/active-users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { 
  PRESENCE_TIMEOUT_MINUTES, 
  RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES 
} from './presence.constants';

@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  // ==================== HTTP-BASED PRESENCE ====================

  /**
   * POST /presence/online
   * Mark current user as online
   * Call this when user opens the app/website
   */
  @Post('online')
  @HttpCode(HttpStatus.OK)
  async setOnline(@CurrentUser() user: User) {
    await this.presenceService.setOnline(user.id);
    return { 
      success: true, 
      message: 'You are now online',
      config: {
        timeoutMinutes: PRESENCE_TIMEOUT_MINUTES,
        recommendedHeartbeatMinutes: RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES,
      }
    };
  }

  /**
   * POST /presence/offline
   * Mark current user as offline
   * Call this when user closes the app/website
   */
  @Post('offline')
  @HttpCode(HttpStatus.OK)
  async setOffline(@CurrentUser() user: User) {
    await this.presenceService.setOffline(user.id);
    return { success: true, message: 'You are now offline' };
  }

  /**
   * POST /presence/heartbeat
   * Keep user online and update lastSeen
   * Frontend should call this every few minutes (see config)
   */
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@CurrentUser() user: User) {
    await this.presenceService.heartbeat(user.id);
    return { success: true };
  }

  /**
   * GET /presence/config
   * Get presence configuration (timeout, recommended heartbeat interval)
   */
  @Get('config')
  getConfig() {
    return {
      timeoutMinutes: PRESENCE_TIMEOUT_MINUTES,
      recommendedHeartbeatMinutes: RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES,
      description: `User will be marked offline if no heartbeat received for ${PRESENCE_TIMEOUT_MINUTES} minutes. Frontend should send heartbeat every ${RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES} minutes.`,
    };
  }

  // ==================== QUERY ENDPOINTS ====================

  /**
   * GET /presence/active
   * Get all active (online) users with pagination
   */
  @Get('active')
  async getActiveUsers(@Query() query: ActiveUsersQueryDto) {
    return this.presenceService.getActiveUsers(query);
  }

  /**
   * GET /presence/count
   * Get count of online users
   */
  @Get('count')
  async getOnlineCount() {
    const count = await this.presenceService.getOnlineCount();
    return { count };
  }
}
