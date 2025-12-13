import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('minute_packages')
export class MinutePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "Starter Pack", "Popular Pack", "Premium Pack"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  minutes: number; // Number of minutes in the package

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Price in currency

  @Column({ default: 'BDT' })
  currency: string;

  // Discount percentage (e.g., 20 for 20% off)
  @Column({ name: 'discount_percent', type: 'int', default: 0 })
  discountPercent: number;

  // Original price before discount (for display purposes)
  @Column({
    name: 'original_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  originalPrice: number;

  // Badge text (e.g., "Best Value", "Most Popular")
  @Column({ nullable: true })
  badge: string;

  // Sort order for display
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  // Whether this package is active and visible to users
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Whether this is a featured/highlighted package
  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed: price per minute
  get pricePerMinute(): number {
    return this.minutes > 0 ? Number(this.price) / this.minutes : 0;
  }
}
