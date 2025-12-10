# Authentication System Documentation

## Overview

This authentication system provides comprehensive user management with the following features:

- **User Roles**: USER and ADMIN
- **Multiple Identifiers**: Email or Phone Number
- **Profile Management**: Full name, country, division, district
- **Social Authentication**: Google and Facebook OAuth
- **Password Recovery**: Email and SMS-based password reset
- **JWT Authentication**: Secure token-based authentication

## User Entity

The User entity includes:

- `id`: UUID primary key
- `email`: Unique email address (optional if phone provided)
- `phone`: Unique phone number (optional if email provided)
- `passwordHash`: Hashed password (nullable for social auth users)
- `role`: USER or ADMIN (default: USER)
- `fullName`: User's full name
- `country`: Country of residence
- `division`: Administrative division
- `district`: District
- `googleId`: Google OAuth ID
- `facebookId`: Facebook OAuth ID
- `profilePicture`: Profile picture URL
- `resetToken`: Password reset token
- `resetTokenExpires`: Reset token expiration
- `isVerified`: Email/phone verification status
- `isActive`: Account active status
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

## API Endpoints

### Authentication Endpoints

#### 1. Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",  // Optional if phone provided
  "phone": "+1234567890",        // Optional if email provided
  "password": "securePassword123",
  "fullName": "John Doe",
  "country": "Bangladesh",
  "division": "Dhaka",
  "district": "Dhaka"
}

Response:
{
  "user": { ...user object },
  "token": "jwt-token"
}
```

#### 2. Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",  // Or use phone
  "password": "securePassword123"
}

Response:
{
  "user": { ...user object },
  "token": "jwt-token"
}
```

#### 3. Forgot Password
```
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"  // Or use phone
}

Response:
{
  "message": "If the account exists, a reset link will be sent"
}
```

#### 4. Reset Password
```
POST /auth/reset-password
Content-Type: application/json

{
  "resetToken": "token-from-email-or-sms",
  "newPassword": "newSecurePassword123"
}

Response:
{
  "message": "Password reset successful"
}
```

#### 5. Google OAuth
```
GET /auth/google
// Redirects to Google OAuth consent screen

GET /auth/google/callback
// Google redirects here after authentication
// Redirects to frontend with token: {FRONTEND_URL}/auth/callback?token={jwt-token}
```

#### 6. Facebook OAuth
```
GET /auth/facebook
// Redirects to Facebook OAuth consent screen

GET /auth/facebook/callback
// Facebook redirects here after authentication
// Redirects to frontend with token: {FRONTEND_URL}/auth/callback?token={jwt-token}
```

#### 7. Get Profile
```
GET /auth/profile
Authorization: Bearer {jwt-token}

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  ...
}
```

### User Management Endpoints

All user endpoints require JWT authentication.

#### 1. Get Current User
```
GET /users/me
Authorization: Bearer {jwt-token}

Response: User profile object
```

#### 2. Get All Users (Admin Only)
```
GET /users
Authorization: Bearer {jwt-token}

Response: Array of user objects
```

#### 3. Get User by ID
```
GET /users/:id
Authorization: Bearer {jwt-token}

Response: User object
```

#### 4. Update User
```
PATCH /users/:id
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "fullName": "Updated Name",
  "country": "Bangladesh",
  "division": "Chittagong",
  "district": "Chittagong"
}

Note: Users can only update their own profile unless they're admin
```

#### 5. Delete User (Admin Only)
```
DELETE /users/:id
Authorization: Bearer {jwt-token}
```

#### 6. Deactivate User (Admin Only)
```
PATCH /users/:id/deactivate
Authorization: Bearer {jwt-token}
```

#### 7. Activate User (Admin Only)
```
PATCH /users/:id/activate
Authorization: Bearer {jwt-token}
```

## Environment Variables Setup

Update `.env.development` with your credentials:

### Required for Basic Auth
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRES_IN`: Token expiration time (e.g., "7d")

### Required for Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Set environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL`

### Required for Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Add valid OAuth redirect URI: `http://localhost:3000/auth/facebook/callback`
5. Set environment variables:
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
   - `FACEBOOK_CALLBACK_URL`

### Required for Email (Password Reset)
Configure SMTP settings:
- `SMTP_HOST`: SMTP server (e.g., smtp.gmail.com)
- `SMTP_PORT`: SMTP port (e.g., 587)
- `SMTP_USER`: Email address
- `SMTP_PASS`: App password (not regular password)
- `SMTP_FROM`: From email address

For Gmail:
1. Enable 2-factor authentication
2. Generate app password: https://myaccount.google.com/apppasswords

### Optional for SMS (Password Reset)
Configure Twilio:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

Get credentials from [Twilio Console](https://console.twilio.com/)

## Database Setup

The system uses PostgreSQL. Ensure your database is running:

```bash
# Using Docker
docker run --name banglish-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=banglish -p 5432:5432 -d postgres

# Or install PostgreSQL locally
```

The database schema will be automatically created when you run the application (synchronize is enabled in development).

## Running the Application

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Build for production
npm run build

# Run in production
npm run start:prod
```

## Security Best Practices

1. **Change JWT_SECRET**: Use a strong, random secret in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Secure Cookies**: Configure secure cookies for tokens
4. **Rate Limiting**: Implement rate limiting for auth endpoints
5. **Input Validation**: All inputs are validated using class-validator
6. **Password Hashing**: Passwords are hashed using bcrypt with salt rounds of 10
7. **Token Expiration**: JWT tokens expire after 7 days by default

## Role-Based Access Control

- **USER**: Can view and update their own profile
- **ADMIN**: Can manage all users, view all profiles, activate/deactivate accounts

Use the `@Roles()` decorator to protect endpoints:
```typescript
@Roles(UserRole.ADMIN)
@Get('admin-only')
adminOnlyEndpoint() {
  // Only admins can access
}
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Troubleshooting

### Social Auth Not Working
- Verify OAuth credentials in `.env.development`
- Check redirect URIs match exactly
- Ensure OAuth apps are not in development mode (for production)

### Email Not Sending
- Verify SMTP credentials
- Check firewall/network settings
- For Gmail, ensure app password is used, not regular password

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env.development`
- Ensure database exists

### JWT Errors
- Verify JWT_SECRET is set
- Check token expiration
- Ensure Authorization header format: `Bearer {token}`

## Next Steps

1. Configure OAuth credentials for Google and Facebook
2. Set up SMTP for email notifications
3. (Optional) Configure Twilio for SMS
4. Create first admin user manually in database
5. Test all authentication flows
6. Implement frontend integration
