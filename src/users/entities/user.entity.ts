import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  Index,
  OneToOne,
} from 'typeorm';
import { UserRole } from './user-role.enum';
import { Profile } from '../../profile/entities/profile.entity';

@Entity('users')
@Check(`"email" IS NOT NULL OR "phone" IS NOT NULL`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  // Social authentication fields
  @Column({ name: 'google_id', type: 'varchar', length: 255, unique: true, nullable: true })
  googleId: string | null;

  @Column({ name: 'facebook_id', type: 'varchar', length: 255, unique: true, nullable: true })
  facebookId: string | null;

  // Password reset fields
  @Column({ name: 'reset_token', type: 'varchar', length: 255, nullable: true })
  resetToken: string | null;

  @Column({ name: 'reset_token_expires', type: 'timestamp', nullable: true })
  resetTokenExpires: Date | null;

  // Refresh token field
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  // Account status
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Online presence fields
  @Column({ name: 'is_online', type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ name: 'last_seen', type: 'timestamp', nullable: true })
  lastSeen: Date | null;

  @Column({ name: 'socket_id', type: 'varchar', length: 255, nullable: true })
  socketId: string | null;

  // Relationship to Profile
  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true, eager: true })
  profile: Profile;
}

