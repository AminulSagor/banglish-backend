import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  PURCHASE = 'PURCHASE', // User bought minutes
  USAGE = 'USAGE', // Minutes deducted for call
  ADMIN_CREDIT = 'ADMIN_CREDIT', // Admin added free minutes
  REFUND = 'REFUND', // Refund issued
  BONUS = 'BONUS', // Promotional bonus
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  STRIPE = 'STRIPE',
  SSLCOMMERZ = 'SSLCOMMERZ',
  BKASH = 'BKASH',
  NAGAD = 'NAGAD',
  ADMIN = 'ADMIN', // Admin granted
  SYSTEM = 'SYSTEM', // System action (usage deduction)
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  // Minutes involved in this transaction
  @Column({ type: 'int', default: 0 })
  minutes: number;

  // Amount in currency (for purchases)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  // Currency code
  @Column({ default: 'BDT' })
  currency: string;

  // External payment gateway transaction ID
  @Column({ name: 'external_transaction_id', nullable: true })
  externalTransactionId: string;

  // Call session ID (for usage transactions)
  @Column({ name: 'call_session_id', nullable: true })
  callSessionId: string;

  // Additional metadata (JSON)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Description
  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
