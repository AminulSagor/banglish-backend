# Quick Start Guide

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit `.env.development` and update the following:

**Required (Minimum to run):**
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - Your PostgreSQL credentials
- `JWT_SECRET` - Change to a strong random string

**Optional (for full functionality):**
- Google OAuth credentials
- Facebook OAuth credentials
- SMTP credentials for email
- Twilio credentials for SMS

### 3. Start PostgreSQL Database

Using Docker:
```bash
docker run --name banglish-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=banglish -p 5432:5432 -d postgres
```

Or use your local PostgreSQL installation.

### 4. Run the Application

```bash
npm run start:dev
```

The application will start on `http://localhost:3000` and automatically create database tables.

### 5. Create Admin User

```bash
npm run create:admin
```

This will create an admin user with:
- Email: `admin@banglish.com`
- Password: `Admin@123456`

You can customize by setting environment variables:
```bash
ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=YourPassword npm run create:admin
```

## Testing the API

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456",
    "fullName": "Test User",
    "country": "Bangladesh",
    "division": "Dhaka",
    "district": "Dhaka"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

Save the returned token for authenticated requests.

### 3. Get Profile

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Current User

```bash
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## API Endpoints Summary

### Public Endpoints (No Authentication Required)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/google` - Google OAuth login
- `GET /auth/facebook` - Facebook OAuth login

### Protected Endpoints (Authentication Required)
- `GET /auth/profile` - Get current user profile
- `GET /users/me` - Get current user details
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user (own profile or admin)

### Admin Only Endpoints
- `GET /users` - Get all users
- `POST /users` - Create user
- `DELETE /users/:id` - Delete user
- `PATCH /users/:id/deactivate` - Deactivate user
- `PATCH /users/:id/activate` - Activate user

## User Roles

- **USER**: Default role, can manage own profile
- **ADMIN**: Can manage all users and access admin endpoints

## Authentication Flow

1. **Email/Phone Registration**: User registers with email or phone + password
2. **Login**: User logs in and receives JWT token
3. **Token Usage**: Include token in Authorization header: `Bearer {token}`
4. **Social Auth**: User can also login via Google or Facebook OAuth

## Password Reset Flow

1. User requests password reset via `/auth/forgot-password`
2. System sends reset token via email or SMS
3. User submits reset token and new password to `/auth/reset-password`
4. Password is updated

## Profile Fields

Users can provide:
- Email or Phone (at least one required)
- Password (required for email/phone auth)
- Full Name
- Country
- Division (administrative division)
- District

## Next Steps

1. Configure OAuth providers (see `AUTH_SETUP.md`)
2. Set up email service for password reset
3. (Optional) Configure SMS service
4. Customize user roles and permissions
5. Add additional profile fields as needed
6. Implement frontend integration

## Troubleshooting

**Database Connection Error:**
- Verify PostgreSQL is running
- Check credentials in `.env.development`

**JWT Error:**
- Ensure JWT_SECRET is set in `.env.development`
- Check token format: `Bearer {token}`

**Social Auth Not Working:**
- Verify OAuth credentials are configured
- Check callback URLs match exactly

For detailed documentation, see `AUTH_SETUP.md`.
