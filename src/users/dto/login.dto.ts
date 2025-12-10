import { IsString, IsOptional, ValidateIf, IsEmail, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsString()
  password: string;
}
