import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  thana: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  ownLanguage?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  interestedLanguageIds?: string[];
}
