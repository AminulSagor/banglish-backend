import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ActiveUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class ActiveUsersResponseDto {
  users: ActiveUserDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ActiveUserDto {
  id: string;
  isOnline: boolean;
  lastSeen: Date | null;
  profile: {
    fullName: string | null;
    profilePicture: string | null;
    country: string | null;
    interestedLanguages: {
      id: string;
      name: string;
      code: string;
      nativeName: string | null;
    }[];
  } | null;
}
