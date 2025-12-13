import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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

@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@Controller('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get my profile',
    description: 'Get the current user profile',
  })
  @ApiResponse({ status: 200, description: 'User profile data' })
  getMyProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update my profile',
    description: 'Update current user profile fields',
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  @Patch('me/picture')
  @ApiOperation({
    summary: 'Update profile picture',
    description: 'Update current user profile picture URL',
  })
  @ApiResponse({ status: 200, description: 'Profile picture updated' })
  updateMyProfilePicture(
    @CurrentUser() user: User,
    @Body() updateProfilePictureDto: UpdateProfilePictureDto,
  ) {
    return this.profileService.updateProfilePicture(
      user.id,
      updateProfilePictureDto.profilePicture,
    );
  }

  @Get('languages')
  @ApiOperation({
    summary: 'Get all languages',
    description: 'List all available languages',
  })
  @ApiResponse({ status: 200, description: 'List of languages' })
  findAllLanguages() {
    return this.profileService.findAllLanguages();
  }

  @Get('languages/stats')
  @ApiOperation({
    summary: 'Get language statistics',
    description: 'Get languages with user counts',
  })
  @ApiResponse({ status: 200, description: 'Languages with user counts' })
  getLanguagesWithUserCount() {
    return this.profileService.getLanguagesWithUserCount();
  }

  @Get('languages/:id')
  @ApiOperation({
    summary: 'Get language by ID',
    description: 'Get a specific language by ID',
  })
  @ApiParam({ name: 'id', description: 'Language UUID' })
  @ApiResponse({ status: 200, description: 'Language data' })
  findLanguageById(@Param('id') id: string) {
    return this.profileService.findLanguageById(id);
  }

  @Post('languages')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create language (Admin)',
    description: 'Add a new language - Admin only',
  })
  @ApiResponse({ status: 201, description: 'Language created' })
  createLanguage(@Body() createLanguageDto: CreateLanguageDto) {
    return this.profileService.createLanguage(createLanguageDto);
  }

  @Delete('languages/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete language (Admin)',
    description: 'Delete a language - Admin only',
  })
  @ApiParam({ name: 'id', description: 'Language UUID' })
  @ApiResponse({ status: 200, description: 'Language deleted' })
  deleteLanguage(@Param('id') id: string) {
    return this.profileService.deleteLanguage(id);
  }

  @Get('users/by-language')
  @ApiOperation({
    summary: 'Find users by language',
    description: 'Get users who speak a specific language',
  })
  @ApiQuery({ name: 'language', description: 'Language name to filter by' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findUsersByLanguage(@Query('language') language: string) {
    return this.profileService.findUsersByOwnLanguage(language);
  }
}
