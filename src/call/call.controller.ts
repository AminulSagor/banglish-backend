import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CallService } from './call.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Call')
@ApiBearerAuth('JWT-auth')
@Controller('call')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Get('history')
  @ApiOperation({
    summary: 'Get call history',
    description: 'Get paginated call history for current user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({ status: 200, description: 'Call history list' })
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

  @Get('config')
  @ApiOperation({
    summary: 'Get Agora config',
    description: 'Get Agora App ID for client initialization',
  })
  @ApiResponse({ status: 200, description: 'Agora configuration' })
  getConfig() {
    return {
      agoraAppId: process.env.AGORA_APPID || '',
    };
  }
}
