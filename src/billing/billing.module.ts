import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SSLCommerzService } from './sslcommerz.service';
import { PaymentConfig } from './entities/payment-config.entity';
import { UserBalance } from './entities/user-balance.entity';
import { Transaction } from './entities/transaction.entity';
import { MinutePackage } from './entities/minute-package.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PaymentConfig,
      UserBalance,
      Transaction,
      MinutePackage,
      User,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService, SSLCommerzService],
  exports: [BillingService],
})
export class BillingModule {}
