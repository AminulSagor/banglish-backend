import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_balances')
export class UserBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Free minutes given to user (set by admin, default from config)
  @Column({ name: 'free_minutes', type: 'int', default: 0 })
  freeMinutes: number;

  // Free minutes already used
  @Column({ name: 'free_minutes_used', type: 'int', default: 0 })
  freeMinutesUsed: number;

  // Paid minutes purchased by user
  @Column({ name: 'paid_minutes', type: 'int', default: 0 })
  paidMinutes: number;

  // Paid minutes already used
  @Column({ name: 'paid_minutes_used', type: 'int', default: 0 })
  paidMinutesUsed: number;

  // Total money spent (for analytics)
  @Column({
    name: 'total_spent',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalSpent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties
  get remainingFreeMinutes(): number {
    return Math.max(0, this.freeMinutes - this.freeMinutesUsed);
  }

  get remainingPaidMinutes(): number {
    return Math.max(0, this.paidMinutes - this.paidMinutesUsed);
  }

  get totalRemainingMinutes(): number {
    return this.remainingFreeMinutes + this.remainingPaidMinutes;
  }
}
