import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Sanitize user object by removing sensitive fields
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash' | 'resetToken' | 'resetTokenExpires' | 'refreshToken'> {
    const { passwordHash, resetToken, resetTokenExpires, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findAll() {
    const users = await this.userRepository.find({
      relations: ['profile', 'profile.interestedLanguages'],
    });
    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ['profile', 'profile.interestedLanguages'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.sanitizeUser(user);
  }

  async findOneRaw(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { phone } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOneRaw(id);
    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOneRaw(id);
    await this.userRepository.remove(user);
    this.logger.log(`User ${id} removed successfully`);
  }

  async deactivate(id: string) {
    const user = await this.findOneRaw(id);
    user.isActive = false;
    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User ${id} deactivated`);
    return this.sanitizeUser(savedUser);
  }

  async activate(id: string) {
    const user = await this.findOneRaw(id);
    user.isActive = true;
    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User ${id} activated`);
    return this.sanitizeUser(savedUser);
  }
}
