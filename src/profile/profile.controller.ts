import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { CreateLanguageDto } from './dto/create-language.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Current user profile routes
  @Get('me')
  getMyProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  @Patch('me/picture')
  updateMyProfilePicture(@CurrentUser() user: User, @Body() updateProfilePictureDto: UpdateProfilePictureDto) {
    return this.profileService.updateProfilePicture(user.id, updateProfilePictureDto.profilePicture);
  }

  // Language endpoints
  @Get('languages')
  findAllLanguages() {
    return this.profileService.findAllLanguages();
  }

  @Get('languages/stats')
  getLanguagesWithUserCount() {
    return this.profileService.getLanguagesWithUserCount();
  }

  @Get('languages/:id')
  findLanguageById(@Param('id') id: string) {
    return this.profileService.findLanguageById(id);
  }

  @Post('languages')
  @Roles(UserRole.ADMIN)
  createLanguage(@Body() createLanguageDto: CreateLanguageDto) {
    return this.profileService.createLanguage(createLanguageDto);
  }

  @Delete('languages/:id')
  @Roles(UserRole.ADMIN)
  deleteLanguage(@Param('id') id: string) {
    return this.profileService.deleteLanguage(id);
  }

  // Filter users by language
  @Get('users/by-language')
  findUsersByLanguage(@Query('language') language: string) {
    return this.profileService.findUsersByOwnLanguage(language);
  }
}
