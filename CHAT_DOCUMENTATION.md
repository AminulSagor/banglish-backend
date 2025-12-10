# Chat System Complete Documentation

## Table of Contents
1. [Quick Start Checklist](#quick-start-checklist)
2. [Postman Socket.IO Testing](#postman-socketio-testing)
3. [All Socket Events Reference](#all-socket-events-reference)
4. [Response Data Formats](#response-data-formats)
5. [REST API Endpoints](#rest-api-endpoints)
6. [Permissions & Rules](#permissions--rules)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start Checklist

### Initial Setup
- [ ] Start server: `npm run start:dev`
- [ ] Get JWT token via login: `POST /auth/login`
- [ ] Token expires in: **30 days** (configured in `.env.development`)

### Postman Socket.IO Setup
- [ ] Create new **Socket.IO** request (not WebSocket)
- [ ] URL: `http://localhost:3000/chat` (⚠️ must include `/chat`)
- [ ] Settings → Auth: `{"token": "YOUR_JWT_TOKEN"}`
- [ ] Add event listeners (see below)
- [ ] Click **Connect**

### Event Listeners to Add
- [ ] `chat:connected` - Connection confirmed
- [ ] `chat:newMessage` - New DM received
- [ ] `chat:newRoomMessage` - New group message
- [ ] `chat:roomCreated` - Added to new room
- [ ] `chat:memberJoined` - Someone joined room
- [ ] `chat:messagesRead` - Your messages were read
- [ ] `chat:userTyping` - Typing indicator
- [ ] `error` - Error events

---

## Postman Socket.IO Testing

### Step 1: Get JWT Token
```
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "your@email.com",
  "password": "yourpassword"
}
```
Copy the `accessToken` from response.

### Step 2: Connect to Chat
1. New → Socket.IO
2. URL: `http://localhost:3000/chat`
3. Settings → Handshake → Auth:
```json
{
  "token": "paste-your-jwt-token-here"
}
```
4. Click **Connect**

### Step 3: Verify Connection
You should see:
```
← chat:connected {"userId":"your-uuid","roomCount":0}
```

---

## All Socket Events Reference

### 📤 EMIT Events (You Send)

#### Direct Messages (1:1)

| Event | Args | Description |
|-------|------|-------------|
| `chat:sendDirect` | `{"receiverId": "uuid", "content": "Hello!"}` | Send DM |
| `chat:getDirectHistory` | `{"userId": "uuid", "page": 1, "limit": 50}` | Get chat history |
| `chat:getConversations` | `{}` | List all DM conversations |
| `chat:markRead` | `{"senderId": "uuid"}` | Mark messages as read |
| `chat:getUnreadCount` | `{}` | Get unread message count |

#### Group Chat

| Event | Args | Description |
|-------|------|-------------|
| `chat:createRoom` | `{"name": "Group Name", "memberIds": ["uuid1", "uuid2"]}` | Create group |
| `chat:joinGroup` | `{"roomId": "uuid"}` | Join a room (anyone) |
| `chat:sendToRoom` | `{"roomId": "uuid", "content": "Hello!"}` | Send to group |
| `chat:getRoomHistory` | `{"roomId": "uuid", "page": 1, "limit": 50}` | Get group history |
| `chat:getMyRooms` | `{}` | List my groups |
| `chat:getRoom` | `{"roomId": "uuid"}` | Get room details |
| `chat:leaveRoom` | `{"roomId": "uuid"}` | Leave group |

#### Admin Actions

| Event | Args | Description |
|-------|------|-------------|
| `chat:addMember` | `{"roomId": "uuid", "userId": "uuid"}` | Add member (admin only for others) |
| `chat:removeMember` | `{"roomId": "uuid", "userId": "uuid"}` | Remove member (admin only) |

#### Typing Indicator

| Event | Args | Description |
|-------|------|-------------|
| `chat:typing` | `{"receiverId": "uuid", "isTyping": true}` | Typing in DM |
| `chat:typing` | `{"roomId": "uuid", "isTyping": true}` | Typing in group |

---

### 📥 LISTEN Events (You Receive)

| Event | Payload | When |
|-------|---------|------|
| `chat:connected` | `{userId, roomCount}` | Successfully connected |
| `chat:newMessage` | Message object | New DM received |
| `chat:newRoomMessage` | Message object | New group message |
| `chat:messagesRead` | `{readBy}` | Your messages were read |
| `chat:roomCreated` | Room object | You were added to new room |
| `chat:memberJoined` | `{roomId, userId}` | Someone joined room |
| `chat:memberAdded` | `{roomId, userId}` | Admin added someone |
| `chat:memberRemoved` | `{roomId, userId}` | Admin removed someone |
| `chat:memberLeft` | `{roomId, userId}` | Someone left room |
| `chat:addedToRoom` | `{roomId, room}` | You were added by admin |
| `chat:removedFromRoom` | `{roomId}` | You were removed |
| `chat:userTyping` | `{userId, isTyping, roomId?}` | Someone typing |
| `error` | `{message}` | Error occurred |

---

## Response Data Formats

### Message Object (Sanitized)
```json
{
  "id": "uuid",
  "content": "Hello!",
  "type": "text",
  "senderId": "uuid",
  "sender": {
    "id": "uuid",
    "email": "user@example.com",
    "isOnline": true,
    "lastSeen": "2025-12-07T06:00:00.000Z",
    "profile": {
      "id": "uuid",
      "fullName": "John Doe",
      "profilePicture": null
    }
  },
  "receiverId": "uuid",
  "roomId": null,
  "isRead": false,
  "readAt": null,
  "createdAt": "2025-12-07T06:00:00.000Z"
}
```

### Room Object (Sanitized)
```json
{
  "id": "uuid",
  "name": "My Group",
  "description": null,
  "type": "group",
  "avatarUrl": null,
  "createdById": "uuid",
  "createdBy": {
    "id": "uuid",
    "email": "creator@example.com",
    "isOnline": false,
    "lastSeen": null,
    "profile": {
      "id": "uuid",
      "fullName": "Creator Name",
      "profilePicture": null
    }
  },
  "members": [...],
  "admins": [...],
  "memberCount": 3,
  "isActive": true,
  "createdAt": "2025-12-07T06:00:00.000Z",
  "updatedAt": "2025-12-07T06:00:00.000Z"
}
```

### Conversation Object
```json
{
  "partner": {
    "id": "uuid",
    "email": "partner@example.com",
    "profile": {
      "fullName": "Partner Name",
      "profilePicture": null
    },
    "isOnline": true,
    "lastSeen": "2025-12-07T06:00:00.000Z"
  },
  "lastMessage": { ... },
  "unreadCount": 5
}
```

---

## REST API Endpoints

All require `Authorization: Bearer <token>` header.

### Direct Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/chat/conversations` | Get all DM conversations |
| `GET` | `/chat/direct/:userId?page=1&limit=50` | Get DM history |
| `GET` | `/chat/unread-count` | Get unread count |
| `POST` | `/chat/mark-read/:senderId` | Mark as read |

### Group Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/chat/rooms` | Get my rooms |
| `POST` | `/chat/rooms` | Create room |
| `GET` | `/chat/rooms/:roomId` | Get room details |
| `GET` | `/chat/rooms/:roomId/messages?page=1&limit=50` | Get room messages |
| `POST` | `/chat/rooms/:roomId/members` | Add member |
| `DELETE` | `/chat/rooms/:roomId/members/:userId` | Remove member |
| `POST` | `/chat/rooms/:roomId/leave` | Leave room |
| `DELETE` | `/chat/rooms/:roomId` | Delete room |

---

## Permissions & Rules

### Room Permissions

| Action | Who Can Do It |
|--------|---------------|
| Create room | Any authenticated user |
| Join room | Anyone (`chat:joinGroup`) |
| Send message | Room members only |
| View messages | Room members only |
| Add yourself | Anyone |
| Add others | Admins only |
| Remove members | Admins only |
| Leave room | Any member |
| Delete room | Creator only |

### Message Permissions

| Action | Who Can Do It |
|--------|---------------|
| Send DM | Any authenticated user |
| Read DM | Sender or receiver only |
| Mark as read | Receiver only |

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `jwt expired` | Get new token via `/auth/login` |
| `Not authenticated` | Check token in Settings → Auth |
| No response | Check JSON format (no trailing commas) |
| DM not received | Receiver must connect to `/chat` namespace |
| Room msg not received | User must be room member |
| `Only admins can add` | Use `chat:joinGroup` to join yourself |

### Connection Checklist

1. ✅ URL is `http://localhost:3000/chat` (not just `localhost:3000`)
2. ✅ Token is in Settings → Auth (not query param)
3. ✅ Token format: `{"token": "eyJ..."}`
4. ✅ Token is not expired
5. ✅ Server is running

### JSON Format Rules

✅ **Correct:**
```json
{"receiverId": "uuid", "content": "Hello"}
```

❌ **Wrong (trailing comma):**
```json
{"receiverId": "uuid", "content": "Hello",}
```

❌ **Wrong (single quotes):**
```json
{'receiverId': 'uuid', 'content': 'Hello'}
```

---

## Testing Flow Examples

### Test 1: Direct Message

1. **User A** connects to `/chat`
2. **User B** connects to `/chat`
3. **User A** sends: `chat:sendDirect` → `{"receiverId": "B_ID", "content": "Hi!"}`
4. **User B** receives: `chat:newMessage` event
5. **User B** replies: `chat:sendDirect` → `{"receiverId": "A_ID", "content": "Hello!"}`
6. **User A** receives: `chat:newMessage` event

### Test 2: Group Chat

1. **User A** creates room: `chat:createRoom` → `{"name": "Test", "memberIds": []}`
2. **User A** gets room ID from response
3. **User B** joins: `chat:joinGroup` → `{"roomId": "ROOM_ID"}`
4. **User A** sees: `chat:memberJoined` event
5. **User A** sends: `chat:sendToRoom` → `{"roomId": "ROOM_ID", "content": "Welcome!"}`
6. **User B** sees: `chat:newRoomMessage` event

---

## File Structure

```
src/chat/
├── chat.module.ts       # Module configuration
├── chat.gateway.ts      # WebSocket handlers
├── chat.service.ts      # Business logic
├── chat.controller.ts   # REST endpoints
├── dto/
│   ├── send-message.dto.ts
│   ├── create-room.dto.ts
│   └── message-query.dto.ts
└── entities/
    ├── message.entity.ts
    └── chat-room.entity.ts
```

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Client                       │
│  ┌─────────────────┐      ┌─────────────────────────┐   │
│  │ presenceSocket  │      │ chatSocket              │   │
│  │ io(':3000')     │      │ io(':3000/chat')        │   │
│  └────────┬────────┘      └────────────┬────────────┘   │
└───────────┼────────────────────────────┼────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│                  NestJS Server :3000                     │
│  ┌─────────────────┐      ┌─────────────────────────┐   │
│  │ PresenceModule  │      │ ChatModule              │   │
│  │ namespace: '/'  │      │ namespace: '/chat'      │   │
│  └─────────────────┘      └─────────────────────────┘   │
│                            │                             │
│                            ▼                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │                    PostgreSQL                        ││
│  │  users | messages | chat_rooms | members | admins   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```
