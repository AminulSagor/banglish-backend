import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';

export class ForgotPasswordDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;
}
