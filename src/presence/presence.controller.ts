import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PresenceService } from './presence.service';
import { ActiveUsersQueryDto } from './dto/active-users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  PRESENCE_TIMEOUT_MINUTES,
  RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES,
} from './presence.constants';

@ApiTags('Presence')
@ApiBearerAuth('JWT-auth')
@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('online')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set online status',
    description: 'Mark current user as online',
  })
  @ApiResponse({ status: 200, description: 'User marked online with config' })
  async setOnline(@CurrentUser() user: User) {
    await this.presenceService.setOnline(user.id);
    return {
      success: true,
      message: 'You are now online',
      config: {
        timeoutMinutes: PRESENCE_TIMEOUT_MINUTES,
        recommendedHeartbeatMinutes: RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES,
      },
    };
  }

  @Post('offline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set offline status',
    description: 'Mark current user as offline',
  })
  @ApiResponse({ status: 200, description: 'User marked offline' })
  async setOffline(@CurrentUser() user: User) {
    await this.presenceService.setOffline(user.id);
    return { success: true, message: 'You are now offline' };
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send heartbeat',
    description: 'Keep user online and update lastSeen',
  })
  @ApiResponse({ status: 200, description: 'Heartbeat received' })
  async heartbeat(@CurrentUser() user: User) {
    await this.presenceService.heartbeat(user.id);
    return { success: true };
  }

  @Get('config')
  @ApiOperation({
    summary: 'Get presence config',
    description: 'Get timeout and heartbeat interval settings',
  })
  @ApiResponse({ status: 200, description: 'Presence configuration' })
  getConfig() {
    return {
      timeoutMinutes: PRESENCE_TIMEOUT_MINUTES,
      recommendedHeartbeatMinutes: RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES,
      description: `User will be marked offline if no heartbeat received for ${PRESENCE_TIMEOUT_MINUTES} minutes. Frontend should send heartbeat every ${RECOMMENDED_HEARTBEAT_INTERVAL_MINUTES} minutes.`,
    };
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active users',
    description: 'Get all online users with pagination',
  })
  @ApiResponse({ status: 200, description: 'List of online users' })
  async getActiveUsers(@Query() query: ActiveUsersQueryDto) {
    return this.presenceService.getActiveUsers(query);
  }

  @Get('count')
  @ApiOperation({
    summary: 'Get online count',
    description: 'Get count of online users',
  })
  @ApiResponse({ status: 200, description: 'Online user count' })
  async getOnlineCount() {
    const count = await this.presenceService.getOnlineCount();
    return { count };
  }
}
