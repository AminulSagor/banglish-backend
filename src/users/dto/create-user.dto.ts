import { IsEmail, IsOptional, IsString, IsEnum, IsPhoneNumber, ValidateIf } from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

export class CreateUserDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  passwordHash?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  division?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  facebookId?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsOptional()
  isVerified?: boolean;

  @IsOptional()
  isActive?: boolean;
}
