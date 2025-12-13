import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { CallSession } from './entities/call-session.entity';
import { User } from '../users/entities/user.entity';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallSession, User]),
    ConfigModule,
    BillingModule,
  ],
  controllers: [CallController],
  providers: [CallService],
  exports: [CallService],
})
export class CallModule {}
