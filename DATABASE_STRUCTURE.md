# Database Structure - Separated User and Profile Tables

## Overview

The database is now structured with **two separate tables**:
1. **Users Table** - Authentication and account data
2. **Profiles Table** - User profile information

This separation follows best practices for:
- ✅ Better data organization
- ✅ Improved query performance
- ✅ Easier to manage permissions
- ✅ Cleaner schema design

## Database Schema

### Users Table

**Table Name:** `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NULLABLE | User email address |
| `phone` | VARCHAR(20) | UNIQUE, NULLABLE | User phone number |
| `password_hash` | TEXT | NULLABLE | Hashed password |
| `role` | ENUM | DEFAULT 'USER' | User role (USER/ADMIN) |
| `google_id` | VARCHAR(255) | UNIQUE, NULLABLE | Google OAuth ID |
| `facebook_id` | VARCHAR(255) | UNIQUE, NULLABLE | Facebook OAuth ID |
| `reset_token` | VARCHAR(255) | NULLABLE | Password reset token |
| `reset_token_expires` | TIMESTAMP | NULLABLE | Reset token expiration |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Email/phone verified |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account active status |
| `created_at` | TIMESTAMP | AUTO | Account creation time |
| `updated_at` | TIMESTAMP | AUTO | Last update time |

**Constraints:**
- CHECK: `email IS NOT NULL OR phone IS NOT NULL`
- INDEX: `email`, `phone`

### Profiles Table

**Table Name:** `profiles`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique profile identifier |
| `user_id` | UUID | FOREIGN KEY, UNIQUE | Reference to users table |
| `full_name` | VARCHAR(255) | NULLABLE | User's full name |
| `country` | VARCHAR(100) | NULLABLE | Country of residence |
| `division` | VARCHAR(100) | NULLABLE | Administrative division |
| `district` | VARCHAR(100) | NULLABLE | District |
| `profile_picture` | TEXT | NULLABLE | Profile picture URL |
| `bio` | TEXT | NULLABLE | User biography |
| `date_of_birth` | DATE | NULLABLE | Date of birth |
| `gender` | VARCHAR(20) | NULLABLE | Gender |
| `address` | VARCHAR(255) | NULLABLE | Full address |
| `postal_code` | VARCHAR(20) | NULLABLE | Postal/ZIP code |
| `created_at` | TIMESTAMP | AUTO | Profile creation time |
| `updated_at` | TIMESTAMP | AUTO | Last update time |

**Relationships:**
- ONE-TO-ONE with Users table
- CASCADE DELETE (when user is deleted, profile is also deleted)

## Entity Relationships

```
┌─────────────────┐         ┌──────────────────┐
│     Users       │ 1     1 │    Profiles      │
│─────────────────│◄────────┤──────────────────│
│ id (PK)         │         │ id (PK)          │
│ email           │         │ user_id (FK)     │
│ phone           │         │ full_name        │
│ password_hash   │         │ country          │
│ role            │         │ division         │
│ google_id       │         │ district         │
│ facebook_id     │         │ profile_picture  │
│ reset_token     │         │ bio              │
│ is_verified     │         │ date_of_birth    │
│ is_active       │         │ gender           │
│ created_at      │         │ address          │
│ updated_at      │         │ postal_code      │
└─────────────────┘         │ created_at       │
                            │ updated_at       │
                            └──────────────────┘
```

## API Request/Response Structure

### Registration Request

**Old Structure (Flat):**
```json
{
  "email": "user@example.com",
  "password": "Password@123",
  "fullName": "John Doe",
  "country": "Bangladesh",
  "division": "Dhaka",
  "district": "Dhaka"
}
```

**New Structure (Nested):**
```json
{
  "email": "user@example.com",
  "password": "Password@123",
  "profile": {
    "fullName": "John Doe",
    "country": "Bangladesh",
    "division": "Dhaka",
    "district": "Dhaka",
    "bio": "Software Developer",
    "dateOfBirth": "1990-01-01",
    "gender": "Male",
    "address": "123 Main St",
    "postalCode": "1200"
  }
}
```

### Response Structure

```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "phone": null,
    "role": "USER",
    "googleId": null,
    "facebookId": null,
    "isVerified": false,
    "isActive": true,
    "createdAt": "2025-11-26T04:00:00.000Z",
    "updatedAt": "2025-11-26T04:00:00.000Z",
    "profile": {
      "id": "profile-uuid",
      "userId": "user-uuid",
      "fullName": "John Doe",
      "country": "Bangladesh",
      "division": "Dhaka",
      "district": "Dhaka",
      "profilePicture": null,
      "bio": "Software Developer",
      "dateOfBirth": "1990-01-01",
      "gender": "Male",
      "address": "123 Main St",
      "postalCode": "1200",
      "createdAt": "2025-11-26T04:00:00.000Z",
      "updatedAt": "2025-11-26T04:00:00.000Z"
    }
  },
  "token": "jwt-token-here"
}
```

## DTOs (Data Transfer Objects)

### RegisterDto
```typescript
{
  email?: string;           // Optional if phone provided
  phone?: string;           // Optional if email provided
  password: string;         // Required
  profile?: {               // Optional nested profile
    fullName?: string;
    country?: string;
    division?: string;
    district?: string;
    profilePicture?: string;
    bio?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    postalCode?: string;
  }
}
```

### UpdateUserDto
```typescript
{
  email?: string;
  phone?: string;
  profile?: {               // Nested profile updates
    fullName?: string;
    country?: string;
    division?: string;
    district?: string;
    profilePicture?: string;
    bio?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    postalCode?: string;
  }
}
```

## Benefits of Separation

### 1. Better Organization
- Authentication data separate from profile data
- Clearer responsibility boundaries
- Easier to understand and maintain

### 2. Performance
- Can query users without loading profile data
- Profile data loaded only when needed (eager loading configured)
- Better indexing strategies

### 3. Security
- Sensitive auth data (password, tokens) separate from public profile
- Easier to implement different access controls
- Can expose profile data without auth data

### 4. Scalability
- Easy to add more profile fields without cluttering users table
- Can add profile-specific features (privacy settings, etc.)
- Better for future extensions

### 5. Data Integrity
- CASCADE DELETE ensures no orphaned profiles
- Foreign key constraints maintain referential integrity
- Clear ownership model

## Migration from Old Structure

If you have existing data in the old flat structure:

1. **Create new tables** (already done with auto-sync)
2. **Migrate data:**
```sql
-- Insert profiles from existing user data
INSERT INTO profiles (user_id, full_name, country, division, district, profile_picture, created_at, updated_at)
SELECT id, full_name, country, division, district, profile_picture, created_at, updated_at
FROM users
WHERE full_name IS NOT NULL OR country IS NOT NULL;

-- Drop old columns from users table
ALTER TABLE users 
DROP COLUMN full_name,
DROP COLUMN country,
DROP COLUMN division,
DROP COLUMN district,
DROP COLUMN profile_picture;
```

## Querying Examples

### Get User with Profile
```typescript
const user = await userRepository.findOne({
  where: { id: userId },
  relations: ['profile'], // Load profile relationship
});
```

### Get User without Profile
```typescript
const user = await userRepository.findOne({
  where: { id: userId },
  // No relations specified - profile not loaded
});
```

### Update Profile
```typescript
const user = await userRepository.findOne({
  where: { id: userId },
  relations: ['profile'],
});

if (user.profile) {
  user.profile.fullName = 'New Name';
  user.profile.bio = 'New Bio';
  await userRepository.save(user);
}
```

### Create User with Profile
```typescript
const user = userRepository.create({
  email: 'user@example.com',
  passwordHash: hashedPassword,
  profile: {
    fullName: 'John Doe',
    country: 'Bangladesh',
  },
});

await userRepository.save(user); // Saves both user and profile
```

## Testing with Postman

### Register with Profile
```json
POST /auth/register
{
  "email": "test@example.com",
  "password": "Test@123",
  "profile": {
    "fullName": "Test User",
    "country": "Bangladesh",
    "division": "Dhaka",
    "district": "Dhaka",
    "bio": "Test bio",
    "gender": "Male"
  }
}
```

### Update Profile
```json
PATCH /users/:id
{
  "profile": {
    "fullName": "Updated Name",
    "bio": "Updated bio",
    "division": "Chittagong"
  }
}
```

## Summary

✅ **Users Table**: Authentication, roles, social auth, account status
✅ **Profiles Table**: Personal information, demographics, preferences
✅ **One-to-One Relationship**: Each user has exactly one profile
✅ **Cascade Delete**: Profile deleted when user is deleted
✅ **Eager Loading**: Profile automatically loaded with user
✅ **Nested DTOs**: Clean API structure with nested profile object

This structure provides a solid foundation for future enhancements while maintaining clean separation of concerns.
