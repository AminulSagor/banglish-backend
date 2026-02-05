import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsPhoneNumber,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileDto } from '../../profile/dto/create-profile.dto';

export class RegisterDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile: CreateProfileDto;
}
