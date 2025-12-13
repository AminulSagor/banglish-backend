import {
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsNumber,
  IsString,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Package DTOs ====================

export class CreatePackageDto {
  @ApiProperty({ description: 'Package name', example: 'Starter Pack' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Package description',
    example: 'Perfect for trying out our service',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Number of minutes', example: 30 })
  @IsInt()
  @Min(1)
  minutes: number;

  @ApiProperty({ description: 'Price in currency', example: 50 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'BDT' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Discount percentage', example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Original price before discount',
    example: 62.5,
  })
  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @ApiPropertyOptional({ description: 'Badge text', example: 'Best Value' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is package active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is featured package', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdatePackageDto {
  @ApiPropertyOptional({ description: 'Package name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Package description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Number of minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minutes?: number;

  @ApiPropertyOptional({ description: 'Price in currency' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Original price before discount' })
  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @ApiPropertyOptional({ description: 'Badge text' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is package active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is featured package' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class PurchasePackageDto {
  @ApiProperty({ description: 'Package ID to purchase' })
  @IsUUID()
  packageId: string;

  @ApiPropertyOptional({ description: 'Customer name for payment' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone for payment' })
  @IsOptional()
  @IsString()
  customerPhone?: string;
}

export class PackageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  minutes: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty()
  originalPrice: number;

  @ApiProperty()
  badge: string;

  @ApiProperty()
  pricePerMinute: number;

  @ApiProperty()
  isFeatured: boolean;
}

// ==================== Config DTOs ====================

export class UpdateConfigDto {
  @ApiProperty({ description: 'Configuration key' })
  key: string;

  @ApiProperty({ description: 'Configuration value' })
  value: string;

  @ApiPropertyOptional({ description: 'Description of the config' })
  @IsOptional()
  description?: string;
}

export class SetFreeMinutesDto {
  @ApiProperty({
    description: 'Number of free minutes for new users',
    example: 30,
  })
  @IsInt()
  @Min(0)
  freeMinutes: number;
}

export class SetUserBalanceDto {
  @ApiPropertyOptional({ description: 'Free minutes to set', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeMinutes?: number;

  @ApiPropertyOptional({ description: 'Paid minutes to add', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  paidMinutes?: number;

  @ApiPropertyOptional({ description: 'Reason for adjustment' })
  @IsOptional()
  reason?: string;
}

export class PurchaseMinutesDto {
  @ApiProperty({ description: 'Number of minutes to purchase', example: 60 })
  @IsInt()
  @Min(1)
  minutes: number;

  @ApiProperty({
    description: 'Payment method',
    enum: ['STRIPE', 'SSLCOMMERZ', 'BKASH', 'NAGAD'],
    example: 'STRIPE',
  })
  @IsEnum(['STRIPE', 'SSLCOMMERZ', 'BKASH', 'NAGAD'])
  paymentMethod: string;
}

export class DeductMinutesDto {
  @ApiProperty({ description: 'Minutes to deduct' })
  @IsInt()
  @Min(1)
  minutes: number;

  @ApiPropertyOptional({ description: 'Call session ID for tracking' })
  @IsOptional()
  callSessionId?: string;
}

export class BalanceResponseDto {
  @ApiProperty()
  freeMinutes: number;

  @ApiProperty()
  freeMinutesUsed: number;

  @ApiProperty()
  remainingFreeMinutes: number;

  @ApiProperty()
  paidMinutes: number;

  @ApiProperty()
  paidMinutesUsed: number;

  @ApiProperty()
  remainingPaidMinutes: number;

  @ApiProperty()
  totalRemainingMinutes: number;

  @ApiProperty()
  totalSpent: number;
}

export class PricingResponseDto {
  @ApiProperty({ description: 'Free minutes for new users' })
  freeMinutesForNewUsers: number;

  @ApiProperty({ description: 'Price per minute in BDT' })
  pricePerMinute: number;

  @ApiProperty({ description: 'Minimum minutes to purchase' })
  minPurchaseMinutes: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;
}
