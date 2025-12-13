import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { PresenceTasks } from './presence.tasks';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ScheduleModule.forRoot()],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceTasks],
  exports: [PresenceService],
})
export class PresenceModule {}
