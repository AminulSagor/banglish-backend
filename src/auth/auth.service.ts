import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { Language } from '../profile/entities/language.entity';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { RefreshTokenDto } from '../users/dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Initialize email transporter for Zoho Mail
    const smtpSecure = this.configService.get<string>('SMTP_SECURE') === 'true';
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async register(registerDto: RegisterDto) {
    const { email, phone, password, profile } = registerDto;

    // Check if user already exists
    if (email) {
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException('Email already registered');
      }
    }

    if (phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone },
      });
      if (existingUser) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Fetch interested languages if provided
    let interestedLanguages: Language[] = [];
    if (
      profile?.interestedLanguageIds &&
      profile.interestedLanguageIds.length > 0
    ) {
      interestedLanguages = await this.languageRepository.find({
        where: { id: In(profile.interestedLanguageIds) },
      });
    }

    // Create user with profile
    const user = this.userRepository.create({
      email,
      phone,
      passwordHash,
      profile: profile
        ? {
            fullName: profile.fullName,
            country: profile.country,
            division: profile.division,
            district: profile.district,
            profilePicture: profile.profilePicture,
            bio: profile.bio,
            dateOfBirth: profile.dateOfBirth
              ? new Date(profile.dateOfBirth)
              : null,
            gender: profile.gender,
            address: profile.address,
            postalCode: profile.postalCode,
            ownLanguage: profile.ownLanguage,
            interestedLanguages,
          }
        : undefined,
    });

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, phone, password } = loginDto;

    // Find user by email or phone
    const user = await this.userRepository.findOne({
      where: email ? { email } : { phone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Please use social login or reset your password',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email, phone } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: email ? { email } : { phone },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If the account exists, a reset link will be sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await this.userRepository.save(user);

    // Send reset token via email or SMS
    if (email) {
      await this.sendPasswordResetEmail(email, resetToken);
    } else if (phone) {
      await this.sendPasswordResetSMS(phone, resetToken);
    }

    return { message: 'If the account exists, a reset link will be sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { resetToken },
    });

    if (
      !user ||
      !user.resetTokenExpires ||
      user.resetTokenExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = passwordHash;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successful' };
  }

  async validateGoogleUser(profile: any): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    let user = await this.userRepository.findOne({
      where: { googleId: id },
    });

    if (!user && email) {
      user = await this.userRepository.findOne({ where: { email } });
    }

    if (!user) {
      user = this.userRepository.create({
        googleId: id,
        email,
        isVerified: true,
        profile: {
          fullName: displayName,
          profilePicture: photos?.[0]?.value,
        },
      });
      await this.userRepository.save(user);
    } else if (!user.googleId) {
      user.googleId = id;
      if (!user.profile) {
        user.profile = this.userRepository.manager.create('Profile', {
          fullName: displayName,
          profilePicture: photos?.[0]?.value,
        });
      } else if (!user.profile.profilePicture && photos?.[0]?.value) {
        user.profile.profilePicture = photos[0].value;
      }
      await this.userRepository.save(user);
    }

    return user;
  }

  async validateFacebookUser(profile: any): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    let user = await this.userRepository.findOne({
      where: { facebookId: id },
    });

    if (!user && email) {
      user = await this.userRepository.findOne({ where: { email } });
    }

    if (!user) {
      user = this.userRepository.create({
        facebookId: id,
        email,
        isVerified: true,
        profile: {
          fullName: displayName,
          profilePicture: photos?.[0]?.value,
        },
      });
      await this.userRepository.save(user);
    } else if (!user.facebookId) {
      user.facebookId = id;
      if (!user.profile) {
        user.profile = this.userRepository.manager.create('Profile', {
          fullName: displayName,
          profilePicture: photos?.[0]?.value,
        });
      } else if (!user.profile.profilePicture && photos?.[0]?.value) {
        user.profile.profilePicture = photos[0].value;
      }
      await this.userRepository.save(user);
    }

    return user;
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '30d';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';

    const [accessToken, refreshToken] = await Promise.all([
      // Access token - short lived (15 minutes)
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: accessExpiresIn as any,
      }),
      // Refresh token - long lived (7 days)
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    // Hash and store refresh token in database
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new ForbiddenException('Access denied');
      }

      // Verify the stored hashed refresh token matches
      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new ForbiddenException('Access denied');
      }

      if (!user.isActive) {
        throw new ForbiddenException('Account is deactivated');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.userRepository.update(userId, { refreshToken: null });
    return { message: 'Logged out successfully' };
  }

  /**
   * Generate single token (for OAuth callbacks)
   */
  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Generate tokens for OAuth (async version for callbacks)
   */
  async generateTokensForOAuth(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.generateTokens(user);
  }

  private sanitizeUser(user: User) {
    const {
      passwordHash,
      resetToken,
      resetTokenExpires,
      refreshToken,
      ...sanitized
    } = user;
    return sanitized;
  }

  private async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const fromEmail = this.configService.get<string>('SMTP_FROM');
    const fromName =
      this.configService.get<string>('SMTP_FROM_NAME') || 'Banglish';

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You requested a password reset for your account. Click the button below to reset your password:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4CAF50;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      // Log error but don't throw - we don't want to reveal if email exists
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error instanceof Error ? error.stack : error,
      );
      // In production, you might want to queue this for retry or alert admins
    }
  }

  private async sendPasswordResetSMS(phone: string, resetToken: string) {
    const smsApiKey = this.configService.get<string>('SMS_API_KEY');
    const smsApiUrl = this.configService.get<string>('SMS_API_URL');
    const smsSenderId = this.configService.get<string>('SMS_SENDER_ID');
    const smsContentId = this.configService.get<string>('SMS_CONTENT_ID');

    if (!smsApiKey || !smsApiUrl) {
      this.logger.warn(
        'SMS service not configured. Password reset SMS not sent.',
      );
      return;
    }

    // Format phone number for Bangladesh (ensure it starts with 880)
    let formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '880' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('880')) {
      formattedPhone = '880' + formattedPhone;
    }

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const message = `Your password reset link: ${resetUrl}. This link will expire in 1 hour. If you didn't request this, please ignore.`;

    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('api_key', smsApiKey);
      formData.append('msg', message);
      formData.append('to', formattedPhone);

      if (smsSenderId) {
        formData.append('sender_id', smsSenderId);
      }

      if (smsContentId) {
        formData.append('content_id', smsContentId);
      }

      const response = await fetch(smsApiUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.error === 0) {
        this.logger.log(
          `Password reset SMS sent to ${formattedPhone}. Request ID: ${result.data?.request_id}`,
        );
      } else {
        this.logger.error(
          `SMS sending failed. Error code: ${result.error}, Message: ${result.msg}`,
        );
      }
    } catch (error) {
      // Log error but don't throw - we don't want to reveal if phone exists
      this.logger.error(
        `Failed to send password reset SMS to ${formattedPhone}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
