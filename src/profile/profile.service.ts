import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { Language } from './entities/language.entity';
import { User } from '../users/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateLanguageDto } from './dto/create-language.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Profile methods
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'profile.interestedLanguages'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    const { interestedLanguageIds, ...profileData } = updateProfileDto;

    // Update basic profile fields
    Object.assign(user.profile, profileData);

    // Update interested languages if provided
    if (interestedLanguageIds !== undefined) {
      if (interestedLanguageIds.length > 0) {
        const languages = await this.languageRepository.find({
          where: { id: In(interestedLanguageIds) },
        });
        user.profile.interestedLanguages = languages;
      } else {
        user.profile.interestedLanguages = [];
      }
    }

    return await this.profileRepository.save(user.profile);
  }

  async updateProfilePicture(userId: string, profilePicture: string): Promise<Profile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    user.profile.profilePicture = profilePicture;
    return await this.profileRepository.save(user.profile);
  }

  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['interestedLanguages'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    return profile;
  }

  // Language methods
  async createLanguage(createLanguageDto: CreateLanguageDto): Promise<Language> {
    const existingByCode = await this.languageRepository.findOne({
      where: { code: createLanguageDto.code },
    });

    if (existingByCode) {
      throw new ConflictException(`Language with code ${createLanguageDto.code} already exists`);
    }

    const existingByName = await this.languageRepository.findOne({
      where: { name: createLanguageDto.name },
    });

    if (existingByName) {
      throw new ConflictException(`Language with name ${createLanguageDto.name} already exists`);
    }

    const language = this.languageRepository.create(createLanguageDto);
    return await this.languageRepository.save(language);
  }

  async findAllLanguages(): Promise<Language[]> {
    return await this.languageRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findLanguageById(id: string): Promise<Language> {
    const language = await this.languageRepository.findOne({ where: { id } });
    if (!language) {
      throw new NotFoundException(`Language with ID ${id} not found`);
    }
    return language;
  }

  async getLanguagesWithUserCount(): Promise<{ language: Language; userCount: number }[]> {
    const languages = await this.languageRepository.find({
      order: { name: 'ASC' },
    });

    const result = await Promise.all(
      languages.map(async (language) => {
        const userCount = await this.profileRepository.count({
          where: { ownLanguage: language.name },
        });
        return { language, userCount };
      }),
    );

    return result;
  }

  async findUsersByOwnLanguage(ownLanguage: string): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['profile', 'profile.interestedLanguages'],
      where: {
        profile: {
          ownLanguage,
        },
        isActive: true,
      },
    });
  }

  async deleteLanguage(id: string): Promise<void> {
    const language = await this.findLanguageById(id);
    await this.languageRepository.remove(language);
  }
}
