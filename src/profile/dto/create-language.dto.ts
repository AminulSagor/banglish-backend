import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(10)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nativeName?: string;
}
