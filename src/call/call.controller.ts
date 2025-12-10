import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { CallService } from './call.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('call')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  /**
   * Get call history for current user
   */
  @Get('history')
  async getCallHistory(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.callService.getCallHistory(
      req.user.sub,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * Get Agora App ID (for client initialization)
   */
  @Get('config')
  getConfig() {
    return {
      agoraAppId: process.env.AGORA_APPID || '',
    };
  }
}
