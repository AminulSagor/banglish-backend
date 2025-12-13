import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PresenceService } from './presence.service';

/**
 * Scheduled tasks for presence management
 *
 * This runs a cleanup job to mark stale users as offline.
 * The interval is configurable in presence.constants.ts
 *
 * To change the cron interval, modify the @Cron decorator below.
 * Common cron expressions:
 *   EVERY_MINUTE, EVERY_5_MINUTES, EVERY_10_MINUTES,
 *   EVERY_30_MINUTES, EVERY_HOUR
 */
@Injectable()
export class PresenceTasks {
  private readonly logger = new Logger(PresenceTasks.name);

  constructor(private readonly presenceService: PresenceService) {}

  /**
   * Cleanup job - marks users as offline if no heartbeat received
   * Default: Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStaleUsersCleanup() {
    this.logger.debug('Running stale users cleanup...');
    const count = await this.presenceService.markStaleUsersOffline();
    if (count > 0) {
      this.logger.log(`Cleanup complete: ${count} users marked offline`);
    }
  }
}
