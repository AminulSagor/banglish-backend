# Banglish Backend - Complete API Documentation

## Overview

**Base URL:** `http://localhost:3000`  
**WebSocket URL:** `ws://localhost:3000/chat`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

---

## 📁 Modules

| Module | Description |
|--------|-------------|
| **Auth** | Registration, Login, OAuth, Password Reset |
| **Users** | User management (Admin) |
| **Profile** | User profile & Languages |
| **Chat** | Direct messages & Group rooms (REST + WebSocket) |
| **Presence** | Online status tracking |

---

# 🏠 Root

## Health Check

```
GET /
```

**Auth:** None  
**Response:** `Hello World!`

---

# 🔐 Auth

## Register

```
POST /auth/register
```

**Auth:** None

**Body (Email):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "profile": {
    "fullName": "John Doe",
    "country": "Bangladesh",
    "division": "Dhaka",
    "district": "Dhaka",
    "bio": "Hello!",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "ownLanguage": "Bengali",
    "interestedLanguageIds": ["uuid1", "uuid2"]
  }
}
```

**Body (Phone):**
```json
{
  "phone": "+8801712345678",
  "password": "password123"
}
```

**Required:** `email` OR `phone`, `password`  
**Optional:** `profile` object

---

## Login

```
POST /auth/login
```

**Auth:** None

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    ...
  }
}
```

---

## Refresh Tokens

```
POST /auth/refresh
```

**Auth:** None

**Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response:** New `accessToken` and `refreshToken`

---

## Logout

```
POST /auth/logout
```

**Auth:** Required

---

## Forgot Password

```
POST /auth/forgot-password
```

**Auth:** None

**Body:**
```json
{
  "email": "user@example.com"
}
```

---

## Reset Password

```
POST /auth/reset-password
```

**Auth:** None

**Body:**
```json
{
  "resetToken": "token-from-email",
  "newPassword": "newpassword123"
}
```

---

## Get Auth Profile

```
GET /auth/profile
```

**Auth:** Required

---

## OAuth

| Endpoint | Description |
|----------|-------------|
| `GET /auth/google` | Initiate Google OAuth (browser) |
| `GET /auth/google/callback` | Google OAuth callback |
| `GET /auth/facebook` | Initiate Facebook OAuth (browser) |
| `GET /auth/facebook/callback` | Facebook OAuth callback |

---

# 👤 Users (Admin)

## Get Current User

```
GET /users/me
```

**Auth:** Required

---

## Get All Users

```
GET /users
```

**Auth:** ADMIN only

---

## Get User by ID

```
GET /users/:id
```

**Auth:** Required

---

## Create User

```
POST /users
```

**Auth:** ADMIN only

**Body:**
```json
{
  "email": "user@example.com",
  "passwordHash": "hashed",
  "role": "user",
  "fullName": "Name",
  "isActive": true
}
```

---

## Update User

```
PATCH /users/:id
```

**Auth:** Required (own profile) or ADMIN

**Body:**
```json
{
  "fullName": "New Name"
}
```

---

## Delete User

```
DELETE /users/:id
```

**Auth:** ADMIN only

---

## Deactivate User

```
PATCH /users/:id/deactivate
```

**Auth:** ADMIN only

---

## Activate User

```
PATCH /users/:id/activate
```

**Auth:** ADMIN only

---

# 📝 Profile

## Get My Profile

```
GET /profile/me
```

**Auth:** Required

---

## Update My Profile

```
PATCH /profile/me
```

**Auth:** Required

**Body:**
```json
{
  "fullName": "John Doe",
  "bio": "About me",
  "country": "Bangladesh",
  "division": "Dhaka",
  "district": "Dhaka",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "address": "123 Main St",
  "postalCode": "1205",
  "ownLanguage": "Bengali",
  "interestedLanguageIds": ["lang-uuid-1"]
}
```

---

## Update Profile Picture

```
PATCH /profile/me/picture
```

**Auth:** Required

**Body:**
```json
{
  "profilePicture": "https://example.com/image.jpg"
}
```

---

## Languages

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/profile/languages` | GET | Required | Get all languages |
| `/profile/languages/stats` | GET | Required | Languages with user count |
| `/profile/languages/:id` | GET | Required | Get language by ID |
| `/profile/languages` | POST | ADMIN | Create language |
| `/profile/languages/:id` | DELETE | ADMIN | Delete language |

**Create Language Body:**
```json
{
  "name": "Bengali",
  "code": "bn",
  "nativeName": "বাংলা"
}
```

---

## Find Users by Language

```
GET /profile/users/by-language?language=Bengali
```

**Auth:** Required

---

# 💬 Chat (REST API)

## Direct Messages

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/conversations` | GET | Get all conversation partners |
| `/chat/direct/:userId` | GET | Get messages with a user |
| `/chat/unread-count` | GET | Get unread message count |
| `/chat/mark-read/:senderId` | POST | Mark messages as read |

**Query params for `/chat/direct/:userId`:**
- `page` (default: 1)
- `limit` (default: 50)

---

## Group Rooms

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/rooms` | GET | Get my rooms |
| `/chat/rooms` | POST | Create room |
| `/chat/rooms/:roomId` | GET | Get room details |
| `/chat/rooms/:roomId` | PATCH | Update room (admin) |
| `/chat/rooms/:roomId` | DELETE | Delete room (creator) |
| `/chat/rooms/:roomId/messages` | GET | Get room messages |
| `/chat/rooms/:roomId/join` | POST | Join room |
| `/chat/rooms/:roomId/leave` | POST | Leave room |
| `/chat/rooms/:roomId/members` | POST | Add member (admin) |
| `/chat/rooms/:roomId/members/:userId` | DELETE | Remove member (admin) |

**Create Room Body:**
```json
{
  "name": "Room Name",
  "description": "Optional description",
  "memberIds": ["user-uuid-1", "user-uuid-2"]
}
```

**Update Room Body:**
```json
{
  "name": "New Name",
  "description": "New description",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Add Member Body:**
```json
{
  "userId": "user-uuid"
}
```

---

# 🟢 Presence

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/presence/online` | POST | Mark yourself online |
| `/presence/offline` | POST | Mark yourself offline |
| `/presence/heartbeat` | POST | Keep alive (call every 2-3 min) |
| `/presence/config` | GET | Get timeout configuration |
| `/presence/active` | GET | Get online users (paginated) |
| `/presence/count` | GET | Get online user count |

**Presence Flow:**
1. User opens app → `POST /presence/online`
2. While app open → `POST /presence/heartbeat` every 2-3 min
3. User closes app → `POST /presence/offline`
4. Server cron → Marks users offline if no heartbeat for 5+ min

---

# 🔌 WebSocket (Chat)

## Connection

**URL:** `ws://localhost:3000/chat`

**Authentication:**
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});
```

---

## Events Summary

### Client → Server (Emit)

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:sendDirect` | `{ receiverId, content, type? }` | Send DM |
| `chat:getDirectHistory` | `{ userId, page?, limit? }` | Get DM history |
| `chat:getConversations` | none | Get conversation list |
| `chat:markRead` | `{ senderId }` | Mark messages read |
| `chat:getUnreadCount` | none | Get unread count |
| `chat:createRoom` | `{ name, memberIds, description? }` | Create room |
| `chat:joinRoom` | `{ roomId }` | Subscribe to room events |
| `chat:joinGroup` | `{ roomId }` | Join public room |
| `chat:getRoom` | `{ roomId }` | Get room details |
| `chat:sendToRoom` | `{ roomId, content, type? }` | Send room message |
| `chat:getRoomHistory` | `{ roomId, page?, limit? }` | Get room messages |
| `chat:getMyRooms` | none | Get user's rooms |
| `chat:addMember` | `{ roomId, userId }` | Add member (admin) |
| `chat:removeMember` | `{ roomId, userId }` | Remove member (admin) |
| `chat:leaveRoom` | `{ roomId }` | Leave room |
| `chat:typing` | `{ roomId?, receiverId?, isTyping }` | Typing indicator |

### Server → Client (Listen)

| Event | When Triggered |
|-------|---------------|
| `chat:connected` | Connection successful |
| `chat:newMessage` | New direct message |
| `chat:newRoomMessage` | New room message |
| `chat:messagesRead` | Your messages were read |
| `chat:userTyping` | Someone is typing |
| `chat:roomCreated` | Added to new room |
| `chat:addedToRoom` | You were added to room |
| `chat:memberAdded` | Member joined room |
| `chat:memberJoined` | Someone self-joined |
| `chat:removedFromRoom` | You were removed |
| `chat:memberRemoved` | Member was removed |
| `chat:memberLeft` | Member left room |
| `error` | Error occurred |

---

## WebSocket Examples

### Send Direct Message

```javascript
socket.emit('chat:sendDirect', {
  receiverId: 'user-uuid',
  content: 'Hello!',
  type: 'text'
}, (response) => {
  console.log(response); // { success: true, message: {...} }
});
```

### Listen for Messages

```javascript
socket.on('chat:newMessage', (message) => {
  console.log('New DM:', message);
});

socket.on('chat:newRoomMessage', (message) => {
  console.log('New room message:', message);
});
```

### Typing Indicator

```javascript
// Start typing
socket.emit('chat:typing', {
  receiverId: 'user-uuid', // for DM
  isTyping: true
});

// Stop typing
socket.emit('chat:typing', {
  receiverId: 'user-uuid',
  isTyping: false
});

// Listen for others typing
socket.on('chat:userTyping', (data) => {
  console.log(`${data.userId} is ${data.isTyping ? 'typing...' : 'stopped'}`);
});
```

### Create & Use Room

```javascript
// Create room
socket.emit('chat:createRoom', {
  name: 'My Group',
  memberIds: ['user1', 'user2'],
  description: 'A cool group'
}, (response) => {
  const roomId = response.room.id;
});

// Send to room
socket.emit('chat:sendToRoom', {
  roomId: 'room-uuid',
  content: 'Hello team!'
});

// Listen for room messages
socket.on('chat:newRoomMessage', (message) => {
  console.log(`[${message.roomId}] ${message.content}`);
});
```

---

## Complete Client Example

```javascript
import { io } from 'socket.io-client';

// Connect
const socket = io('http://localhost:3000/chat', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Connection events
socket.on('chat:connected', (data) => {
  console.log('Connected!', data);
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

// DM events
socket.on('chat:newMessage', (msg) => {
  displayMessage(msg);
});

// Room events
socket.on('chat:newRoomMessage', (msg) => {
  displayRoomMessage(msg);
});

// Typing
socket.on('chat:userTyping', (data) => {
  showTypingIndicator(data.userId, data.isTyping);
});

// Room notifications
socket.on('chat:roomCreated', (room) => {
  addRoomToList(room);
});

socket.on('chat:memberJoined', (data) => {
  showNotification(`New member in ${data.roomId}`);
});
```

---

## Error Handling

All WebSocket events return a response object:

**Success:**
```json
{
  "success": true,
  "message": { ... }
}
```

**Error:**
```json
{
  "error": "Error message here"
}
```

---

# 📊 Response Formats

## Pagination

```json
{
  "messages": [...],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

## Standard Success

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "error": "BadRequestException",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

---

# 🔒 Role-Based Access

| Role | Description |
|------|-------------|
| `user` | Default role. Can manage own profile, chat. |
| `admin` | Full access. Can manage users, languages, etc. |

---

# 📌 Quick Reference

## All REST Endpoints

| Module | Endpoint | Method | Auth |
|--------|----------|--------|------|
| Root | `/` | GET | No |
| Auth | `/auth/register` | POST | No |
| Auth | `/auth/login` | POST | No |
| Auth | `/auth/refresh` | POST | No |
| Auth | `/auth/logout` | POST | Yes |
| Auth | `/auth/forgot-password` | POST | No |
| Auth | `/auth/reset-password` | POST | No |
| Auth | `/auth/profile` | GET | Yes |
| Auth | `/auth/google` | GET | No |
| Auth | `/auth/google/callback` | GET | No |
| Auth | `/auth/facebook` | GET | No |
| Auth | `/auth/facebook/callback` | GET | No |
| Users | `/users` | GET | Admin |
| Users | `/users` | POST | Admin |
| Users | `/users/me` | GET | Yes |
| Users | `/users/:id` | GET | Yes |
| Users | `/users/:id` | PATCH | Yes* |
| Users | `/users/:id` | DELETE | Admin |
| Users | `/users/:id/deactivate` | PATCH | Admin |
| Users | `/users/:id/activate` | PATCH | Admin |
| Profile | `/profile/me` | GET | Yes |
| Profile | `/profile/me` | PATCH | Yes |
| Profile | `/profile/me/picture` | PATCH | Yes |
| Profile | `/profile/languages` | GET | Yes |
| Profile | `/profile/languages` | POST | Admin |
| Profile | `/profile/languages/stats` | GET | Yes |
| Profile | `/profile/languages/:id` | GET | Yes |
| Profile | `/profile/languages/:id` | DELETE | Admin |
| Profile | `/profile/users/by-language` | GET | Yes |
| Chat | `/chat/conversations` | GET | Yes |
| Chat | `/chat/direct/:userId` | GET | Yes |
| Chat | `/chat/unread-count` | GET | Yes |
| Chat | `/chat/mark-read/:senderId` | POST | Yes |
| Chat | `/chat/rooms` | GET | Yes |
| Chat | `/chat/rooms` | POST | Yes |
| Chat | `/chat/rooms/:roomId` | GET | Yes |
| Chat | `/chat/rooms/:roomId` | PATCH | Yes |
| Chat | `/chat/rooms/:roomId` | DELETE | Yes |
| Chat | `/chat/rooms/:roomId/messages` | GET | Yes |
| Chat | `/chat/rooms/:roomId/join` | POST | Yes |
| Chat | `/chat/rooms/:roomId/leave` | POST | Yes |
| Chat | `/chat/rooms/:roomId/members` | POST | Yes |
| Chat | `/chat/rooms/:roomId/members/:userId` | DELETE | Yes |
| Presence | `/presence/online` | POST | Yes |
| Presence | `/presence/offline` | POST | Yes |
| Presence | `/presence/heartbeat` | POST | Yes |
| Presence | `/presence/config` | GET | Yes |
| Presence | `/presence/active` | GET | Yes |
| Presence | `/presence/count` | GET | Yes |

**Total: 44 REST endpoints + WebSocket events**

---

*Generated on: December 8, 2025*
