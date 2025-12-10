import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/users/entities/user-role.enum';
import * as bcrypt from 'bcrypt';

async function createAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    const email = process.env.ADMIN_EMAIL || 'admin@banglish.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const fullName = process.env.ADMIN_NAME || 'System Administrator';

    // Check if admin already exists
    const existingAdmin = await usersService.findByEmail(email);
    if (existingAdmin) {
      console.log('Admin user already exists with email:', email);
      await app.close();
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await usersService.create({
      email,
      passwordHash,
      fullName,
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
    });

    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Please change the password after first login.');
    console.log('User ID:', admin.id);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }

  await app.close();
}

createAdmin();
