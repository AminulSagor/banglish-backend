import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Check database connection - used by load balancers',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('detailed')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Check database, memory, and disk - for monitoring',
  })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  checkDetailed() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  @Get('ping')
  @Public()
  @ApiOperation({ summary: 'Simple ping', description: 'Quick uptime check' })
  @ApiResponse({ status: 200, description: 'Pong with timestamp and uptime' })
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
