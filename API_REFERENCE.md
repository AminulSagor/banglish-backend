# API Reference - DTOs & Validations

## 📋 Data Transfer Objects (DTOs)

### RegisterDto

**File:** `src/users/dto/register.dto.ts`

```typescript
{
  email?: string;           // Optional if phone provided
  phone?: string;           // Optional if email provided
  password: string;         // Required, min 6 characters
  fullName?: string;        // Optional
  country?: string;         // Optional
  division?: string;        // Optional
  district?: string;        // Optional
}
```

**Validations:**
- ✅ At least one of `email` or `phone` must be provided
- ✅ `email` must be valid email format
- ✅ `phone` must be valid phone number format
- ✅ `password` minimum 6 characters
- ✅ All string fields validated

**Example:**
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

---

### LoginDto

**File:** `src/users/dto/login.dto.ts`

```typescript
{
  email?: string;           // Optional if phone provided
  phone?: string;           // Optional if email provided
  password: string;         // Required
}
```

**Validations:**
- ✅ At least one of `email` or `phone` must be provided
- ✅ `email` must be valid email format
- ✅ `phone` must be valid phone number format
- ✅ `password` is required

**Example:**
```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

---

### ForgotPasswordDto

**File:** `src/users/dto/forgot-password.dto.ts`

```typescript
{
  email?: string;           // Optional if phone provided
  phone?: string;           // Optional if email provided
}
```

**Validations:**
- ✅ At least one of `email` or `phone` must be provided
- ✅ `email` must be valid email format
- ✅ `phone` must be valid phone number format

**Example:**
```json
{
  "email": "user@example.com"
}
```

---

### ResetPasswordDto

**File:** `src/users/dto/reset-password.dto.ts`

```typescript
{
  resetToken: string;       // Required
  newPassword: string;      // Required, min 6 characters
}
```

**Validations:**
- ✅ `resetToken` is required
- ✅ `newPassword` minimum 6 characters

**Example:**
```json
{
  "resetToken": "a1b2c3d4e5f6...",
  "newPassword": "NewPassword@123"
}
```

---

### UpdateUserDto

**File:** `src/users/dto/update-user.dto.ts`

```typescript
{
  email?: string;           // Optional
  phone?: string;           // Optional
  fullName?: string;        // Optional
  country?: string;         // Optional
  division?: string;        // Optional
  district?: string;        // Optional
}
```

**Validations:**
- ✅ All fields are optional
- ✅ `email` must be valid email format if provided
- ✅ `phone` must be valid phone number format if provided

**Example:**
```json
{
  "fullName": "John Doe Updated",
  "division": "Sylhet",
  "district": "Sylhet"
}
```

---

### CreateUserDto (Admin)

**File:** `src/users/dto/create-user.dto.ts`

```typescript
{
  email?: string;           // Optional if phone provided
  phone?: string;           // Optional if email provided
  passwordHash?: string;    // Optional (pre-hashed password)
  role?: UserRole;          // Optional (USER | ADMIN)
  fullName?: string;        // Optional
  country?: string;         // Optional
  division?: string;        // Optional
  district?: string;        // Optional
  googleId?: string;        // Optional
  facebookId?: string;      // Optional
  profilePicture?: string;  // Optional
  isVerified?: boolean;     // Optional
  isActive?: boolean;       // Optional
}
```

**Example:**
```json
{
  "email": "newuser@example.com",
  "passwordHash": "$2b$10$...",
  "role": "USER",
  "fullName": "New User",
  "isVerified": true,
  "isActive": true
}
```

---

## 🔐 User Entity

**File:** `src/users/entities/user.entity.ts`

```typescript
{
  id: string;                       // UUID, auto-generated
  email: string | null;             // Unique, nullable
  phone: string | null;             // Unique, nullable
  passwordHash: string | null;      // Hashed password
  role: UserRole;                   // USER | ADMIN (default: USER)
  
  // Profile fields
  fullName: string | null;
  country: string | null;
  division: string | null;
  district: string | null;
  
  // Social auth
  googleId: string | null;          // Unique, nullable
  facebookId: string | null;        // Unique, nullable
  profilePicture: string | null;
  
  // Password reset
  resetToken: string | null;
  resetTokenExpires: Date | null;
  
  // Account status
  isVerified: boolean;              // Default: false
  isActive: boolean;                // Default: true
  
  // Timestamps
  createdAt: Date;                  // Auto-generated
  updatedAt: Date;                  // Auto-updated
}
```

---

## 📊 Validation Rules Summary

### Email Validation
- Must be valid email format
- Example: `user@example.com`
- Regex: Standard email validation

### Phone Validation
- Must be valid phone number format
- Supports international format
- Example: `+8801712345678`
- Auto-formatted for Bangladesh: `8801712345678`

### Password Validation
- Minimum length: 6 characters
- No maximum length
- Hashed with bcrypt (10 salt rounds)
- Example: `Password@123`

### String Fields
- All string fields validated
- Optional fields can be null
- Trimmed automatically

### Role Validation
- Must be one of: `USER`, `ADMIN`
- Default: `USER`
- Enum validation

---

## 🚫 Common Validation Errors

### 400 Bad Request - Invalid Email
```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

### 400 Bad Request - Short Password
```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 6 characters"],
  "error": "Bad Request"
}
```

### 400 Bad Request - Missing Required Field
```json
{
  "statusCode": 400,
  "message": ["At least one of email or phone must be provided"],
  "error": "Bad Request"
}
```

### 409 Conflict - Duplicate Email
```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "error": "Conflict"
}
```

### 409 Conflict - Duplicate Phone
```json
{
  "statusCode": 409,
  "message": "Phone number already registered",
  "error": "Conflict"
}
```

### 401 Unauthorized - Invalid Credentials
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### 401 Unauthorized - No Token
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden - Insufficient Permissions
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found - User Not Found
```json
{
  "statusCode": 404,
  "message": "User with ID {id} not found",
  "error": "Not Found"
}
```

---

## 🎯 Request/Response Examples

### Successful Registration
**Request:**
```json
POST /auth/register
{
  "email": "user@example.com",
  "password": "Password@123",
  "fullName": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": null,
    "role": "USER",
    "fullName": "John Doe",
    "country": null,
    "division": null,
    "district": null,
    "googleId": null,
    "facebookId": null,
    "profilePicture": null,
    "isVerified": false,
    "isActive": true,
    "createdAt": "2025-11-26T04:00:00.000Z",
    "updatedAt": "2025-11-26T04:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJwaG9uZSI6bnVsbCwicm9sZSI6IlVTRVIiLCJpYXQiOjE3MzI1OTM2MDAsImV4cCI6MTczMzE5ODQwMH0.signature"
}
```

### Successful Login
**Request:**
```json
POST /auth/login
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User
**Request:**
```
GET /users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
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

---

## 🔑 JWT Token Structure

**Payload:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "phone": "+8801712345678",
  "role": "USER",
  "iat": 1732593600,
  "exp": 1733198400
}
```

**Usage:**
```
Authorization: Bearer {token}
```

**Expiration:** 7 days (configurable via `JWT_EXPIRES_IN`)

---

## 📱 Phone Number Formats

### Accepted Input Formats
- `01712345678` (Bangladesh local)
- `+8801712345678` (International)
- `8801712345678` (Country code)

### Stored Format
- Always stored as: `+8801712345678`

### SMS API Format
- Sent as: `8801712345678` (without +)

---

## 🌍 Location Fields

### Country
- Free text field
- Example: `Bangladesh`, `India`, `USA`

### Division
- Administrative division
- Bangladesh examples: `Dhaka`, `Chittagong`, `Sylhet`, `Rajshahi`, `Khulna`, `Barisal`, `Rangpur`, `Mymensingh`

### District
- District within division
- Examples: `Dhaka`, `Chittagong`, `Sylhet`, `Cox's Bazar`

---

## 🎭 User Roles

### USER (Default)
- Can view own profile
- Can update own profile
- Can request password reset
- Cannot access admin endpoints

### ADMIN
- All USER permissions
- Can view all users
- Can create users
- Can update any user
- Can delete users
- Can activate/deactivate users

---

## 🔒 Security Notes

1. **Passwords**: Never sent in plain text, always hashed with bcrypt
2. **JWT Tokens**: Signed with secret key, expires after 7 days
3. **Reset Tokens**: Random 32-byte hex string, expires in 1 hour
4. **Sensitive Fields**: `passwordHash`, `resetToken` excluded from responses
5. **Rate Limiting**: Recommended for forgot-password endpoint
6. **HTTPS**: Always use HTTPS in production

---

## 📚 Related Documentation

- [Postman Testing Guide](./POSTMAN_TESTING_GUIDE.md)
- [Authentication Setup](./AUTH_SETUP.md)
- [Email & SMS Configuration](./EMAIL_SMS_CONFIG.md)
- [Quick Start Guide](./QUICK_START.md)
