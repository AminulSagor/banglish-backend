# Postman Testing Guide

## 📦 Import Collection

1. Open Postman
2. Click **Import** button
3. Select `Banglish_API.postman_collection.json`
4. Collection will be imported with all endpoints

## 🔧 Setup

### 1. Set Base URL

The collection uses a variable `{{base_url}}` which defaults to `http://localhost:3000`

To change it:
1. Click on the collection name
2. Go to **Variables** tab
3. Update `base_url` value

### 2. Environment Variables

The collection automatically manages these variables:
- `jwt_token` - Stored after login/register
- `user_id` - Stored after login/register
- `reset_token` - You need to set this manually from email/SMS

## 📋 Testing Flow

### Step 1: Register a New User

**Endpoint:** `POST /auth/register`

**Option A - Register with Email:**
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

**Option B - Register with Phone:**
```json
{
  "phone": "+8801712345678",
  "password": "Password@123",
  "fullName": "Jane Smith",
  "country": "Bangladesh",
  "division": "Chittagong",
  "district": "Chittagong"
}
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "USER",
    "country": "Bangladesh",
    "division": "Dhaka",
    "district": "Dhaka",
    "isVerified": false,
    "isActive": true,
    "createdAt": "2025-11-26T04:00:00.000Z",
    "updatedAt": "2025-11-26T04:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

✅ **JWT token is automatically saved to collection variables**

### Step 2: Login

**Endpoint:** `POST /auth/login`

**With Email:**
```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

**With Phone:**
```json
{
  "phone": "+8801712345678",
  "password": "Password@123"
}
```

**Expected Response (200):**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 3: Get Current User Profile

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
```

**Expected Response (200):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "phone": null,
  "role": "USER",
  "fullName": "John Doe",
  "country": "Bangladesh",
  "division": "Dhaka",
  "district": "Dhaka",
  "googleId": null,
  "facebookId": null,
  "profilePicture": null,
  "isVerified": false,
  "isActive": true,
  "createdAt": "2025-11-26T04:00:00.000Z",
  "updatedAt": "2025-11-26T04:00:00.000Z"
}
```

### Step 4: Update User Profile

**Endpoint:** `PATCH /users/{{user_id}}`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "fullName": "John Doe Updated",
  "country": "Bangladesh",
  "division": "Sylhet",
  "district": "Sylhet"
}
```

**Expected Response (200):**
```json
{
  "id": "uuid-here",
  "fullName": "John Doe Updated",
  "division": "Sylhet",
  "district": "Sylhet",
  ...
}
```

### Step 5: Password Reset Flow

#### 5.1 Request Password Reset

**Endpoint:** `POST /auth/forgot-password`

**With Email:**
```json
{
  "email": "user@example.com"
}
```

**With Phone:**
```json
{
  "phone": "+8801712345678"
}
```

**Expected Response (200):**
```json
{
  "message": "If the account exists, a reset link will be sent"
}
```

**Action Required:**
- Check your email inbox for reset link (Zoho Mail)
- OR check your phone for SMS (SMS.net.bd)
- OR check server console logs for the reset token
- Copy the reset token

#### 5.2 Reset Password

**Endpoint:** `POST /auth/reset-password`

**Body:**
```json
{
  "resetToken": "your-reset-token-from-email-or-sms",
  "newPassword": "NewPassword@123"
}
```

**Expected Response (200):**
```json
{
  "message": "Password reset successful"
}
```

### Step 6: Admin Operations

First, create an admin user:
```bash
npm run create:admin
```

Then login as admin to get admin JWT token.

#### Get All Users (Admin Only)

**Endpoint:** `GET /users`

**Headers:**
```
Authorization: Bearer {{admin_jwt_token}}
```

**Expected Response (200):**
```json
[
  {
    "id": "uuid-1",
    "email": "user1@example.com",
    "fullName": "User One",
    "role": "USER",
    ...
  },
  {
    "id": "uuid-2",
    "email": "admin@banglish.com",
    "fullName": "Admin User",
    "role": "ADMIN",
    ...
  }
]
```

#### Deactivate User (Admin Only)

**Endpoint:** `PATCH /users/{{user_id}}/deactivate`

**Headers:**
```
Authorization: Bearer {{admin_jwt_token}}
```

**Expected Response (200):**
```json
{
  "id": "uuid-here",
  "isActive": false,
  ...
}
```

#### Activate User (Admin Only)

**Endpoint:** `PATCH /users/{{user_id}}/activate`

**Expected Response (200):**
```json
{
  "id": "uuid-here",
  "isActive": true,
  ...
}
```

#### Delete User (Admin Only)

**Endpoint:** `DELETE /users/{{user_id}}`

**Expected Response (200):**
```
User deleted successfully
```

## 🧪 Validation Tests

### Test Invalid Email
```json
{
  "email": "invalid-email",
  "password": "Password@123"
}
```
**Expected:** 400 Bad Request - Invalid email format

### Test Short Password
```json
{
  "email": "test@example.com",
  "password": "12345"
}
```
**Expected:** 400 Bad Request - Password must be at least 6 characters

### Test Missing Required Fields
```json
{
  "password": "Password@123"
}
```
**Expected:** 400 Bad Request - Email or phone is required

### Test Wrong Password
```json
{
  "email": "user@example.com",
  "password": "WrongPassword"
}
```
**Expected:** 401 Unauthorized - Invalid credentials

### Test Without JWT Token
Try accessing `/users/me` without Authorization header

**Expected:** 401 Unauthorized

### Test Non-Admin Access
Try accessing `/users` (admin endpoint) with regular user token

**Expected:** 403 Forbidden

## 📊 Complete Endpoint List

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| GET | `/auth/google` | Google OAuth (browser) |
| GET | `/auth/facebook` | Facebook OAuth (browser) |

### Protected Endpoints (JWT Required)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/auth/profile` | Get current user | Any |
| GET | `/users/me` | Get current user | Any |
| GET | `/users/:id` | Get user by ID | Any |
| PATCH | `/users/:id` | Update user | Own/Admin |

### Admin Only Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users |
| POST | `/users` | Create user |
| DELETE | `/users/:id` | Delete user |
| PATCH | `/users/:id/activate` | Activate user |
| PATCH | `/users/:id/deactivate` | Deactivate user |

## 🔍 Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Invalid/missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate email/phone |
| 500 | Server Error | Internal server error |

## 💡 Tips

1. **Auto-Save Tokens**: Login/Register requests automatically save JWT tokens
2. **Use Variables**: Use `{{jwt_token}}` and `{{user_id}}` in requests
3. **Check Console**: Server logs show email/SMS sending status
4. **Test Validation**: Use the "Validation Tests" folder
5. **Admin Testing**: Create admin user first with `npm run create:admin`

## 🐛 Troubleshooting

### Token Not Saving
- Check the "Tests" tab in Login/Register requests
- Ensure response is successful (200/201)
- Manually copy token to collection variables

### 401 Unauthorized
- Verify JWT token is set in collection variables
- Check token hasn't expired (7 days default)
- Re-login to get fresh token

### 403 Forbidden
- Endpoint requires ADMIN role
- Login with admin credentials
- Check user role in response

### Email/SMS Not Received
- Check server console logs
- Verify SMTP/SMS credentials in `.env.development`
- Check email spam folder
- Verify SMS balance (SMS.net.bd)

## 📝 Example Test Scenarios

### Scenario 1: Complete User Journey
1. Register new user
2. Login
3. Get profile
4. Update profile
5. Request password reset
6. Reset password
7. Login with new password

### Scenario 2: Admin Management
1. Login as admin
2. Get all users
3. Create new user
4. Deactivate user
5. Activate user
6. Delete user

### Scenario 3: Validation Testing
1. Try invalid email
2. Try short password
3. Try missing fields
4. Try wrong password
5. Try without token
6. Try admin endpoint as user

## 🚀 Quick Start

1. Import collection to Postman
2. Start server: `npm run start:dev`
3. Run "Register with Email" request
4. JWT token auto-saved
5. Test other endpoints

Happy Testing! 🎉
