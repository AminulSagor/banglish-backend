# Chat WebSocket Documentation

## Connection

**Namespace:** `/chat`  
**URL:** `ws://localhost:3000/chat`

> **Note:** Connecting to `/chat` now also tracks your online presence. You don't need to connect to the root namespace separately.

### Authentication

Connect with JWT token using one of these methods:

```javascript
// Method 1: auth object (recommended)
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});

// Method 2: Authorization header
const socket = io('http://localhost:3000/chat', {
  extraHeaders: { Authorization: 'Bearer your-jwt-token' }
});

// Method 3: Query parameter
const socket = io('http://localhost:3000/chat?token=your-jwt-token');
```

### Connection Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:connected` | Server → Client | Confirms successful connection |
| `error` | Server → Client | Authentication/connection error |

**`chat:connected` payload:**
```json
{
  "userId": "uuid",
  "roomCount": 5
}
```

---

## Direct Messages (1:1 Chat)

### Send Direct Message

**Event:** `chat:sendDirect`  
**Direction:** Client → Server

```json
{
  "receiverId": "user-uuid",
  "content": "Hello!",
  "type": "text"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receiverId` | UUID | Yes | Recipient user ID |
| `content` | string | Yes | Message content |
| `type` | enum | No | `text` (default), `image`, `file`, `system` |

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "content": "Hello!",
    "type": "text",
    "senderId": "uuid",
    "sender": { "id": "uuid", "email": "...", "profile": {...} },
    "receiverId": "uuid",
    "roomId": null,
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Receive Direct Message

**Event:** `chat:newMessage`  
**Direction:** Server → Client

Emitted to both sender and receiver when a DM is sent.

```json
{
  "id": "uuid",
  "content": "Hello!",
  "type": "text",
  "senderId": "uuid",
  "sender": { "id": "uuid", "email": "...", "profile": {...} },
  "receiverId": "uuid",
  "roomId": null,
  "isRead": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Direct Message History

**Event:** `chat:getDirectHistory`  
**Direction:** Client → Server

```json
{
  "userId": "partner-uuid",
  "page": 1,
  "limit": 50
}
```

**Response:**
```json
{
  "messages": [...],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

### Get Conversations List

**Event:** `chat:getConversations`  
**Direction:** Client → Server

No payload required.

**Response:**
```json
{
  "conversations": [
    {
      "partner": { "id": "uuid", "email": "...", "profile": {...}, "isOnline": true },
      "lastMessage": {...},
      "unreadCount": 2
    }
  ]
}
```

### Mark Messages as Read

**Event:** `chat:markRead`  
**Direction:** Client → Server

```json
{
  "senderId": "uuid"
}
```

**Broadcast:** `chat:messagesRead` to sender
```json
{
  "readBy": "uuid"
}
```

### Get Unread Count

**Event:** `chat:getUnreadCount`  
**Direction:** Client → Server

No payload required.

**Response:**
```json
{
  "count": 5
}
```

---

## Group Chat

### Create Room

**Event:** `chat:createRoom`  
**Direction:** Client → Server

```json
{
  "name": "My Group",
  "memberIds": ["uuid-1", "uuid-2"],
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "uuid",
    "name": "My Group",
    "members": [...],
    "admins": [...],
    "memberCount": 3
  }
}
```

**Broadcast:** `chat:roomCreated` to all members

### Join Group (Self-join)

**Event:** `chat:joinGroup`  
**Direction:** Client → Server

```json
{
  "roomId": "room-uuid"
}
```

**Broadcast:** `chat:memberJoined` to room
```json
{
  "roomId": "uuid",
  "userId": "uuid"
}
```

### Join Socket Room

**Event:** `chat:joinRoom`  
**Direction:** Client → Server

Use this to subscribe to a room's socket events (called automatically on connection for existing rooms).

```json
{
  "roomId": "room-uuid"
}
```

### Send Room Message

**Event:** `chat:sendToRoom`  
**Direction:** Client → Server

```json
{
  "roomId": "room-uuid",
  "content": "Hello everyone!",
  "type": "text"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "content": "Hello everyone!",
    "senderId": "uuid",
    "sender": {...},
    "roomId": "uuid",
    "receiverId": null
  }
}
```

**Broadcast:** `chat:newRoomMessage` to all room members

### Receive Room Message

**Event:** `chat:newRoomMessage`  
**Direction:** Server → Client

```json
{
  "id": "uuid",
  "content": "Hello everyone!",
  "type": "text",
  "senderId": "uuid",
  "sender": {...},
  "roomId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Room Message History

**Event:** `chat:getRoomHistory`  
**Direction:** Client → Server

```json
{
  "roomId": "room-uuid",
  "page": 1,
  "limit": 50
}
```

### Get My Rooms

**Event:** `chat:getMyRooms`  
**Direction:** Client → Server

No payload required.

**Response:**
```json
{
  "rooms": [...]
}
```

### Get Room Details

**Event:** `chat:getRoom`  
**Direction:** Client → Server

```json
{
  "roomId": "room-uuid"
}
```

### Add Member (Admin Only)

**Event:** `chat:addMember`  
**Direction:** Client → Server

```json
{
  "roomId": "room-uuid",
  "userId": "user-to-add-uuid"
}
```

**Broadcast:**
- `chat:addedToRoom` to new member
- `chat:memberAdded` to room

### Remove Member (Admin Only)

**Event:** `chat:removeMember`  
**Direction:** Client → Server

```json
{
  "roomId": "room-uuid",
  "userId": "user-to-remove-uuid"
}
```

**Broadcast:**
- `chat:removedFromRoom` to removed user
- `chat:memberRemoved` to room

### Leave Room

**Event:** `chat:leaveRoom`  
**Direction:** Client → Server

```json
{
  "roomId": "room-uuid"
}
```

**Broadcast:** `chat:memberLeft` to room
```json
{
  "roomId": "uuid",
  "userId": "uuid"
}
```

---

## Typing Indicator

**Event:** `chat:typing`  
**Direction:** Client → Server

For Direct Messages:
```json
{
  "receiverId": "user-uuid",
  "isTyping": true
}
```

For Group Chat:
```json
{
  "roomId": "room-uuid",
  "isTyping": true
}
```

**Broadcast:** `chat:userTyping`
```json
{
  "userId": "uuid",
  "isTyping": true,
  "roomId": "uuid"  // only for group chat
}
```

---

## Presence (Online Status)

> Presence is now integrated into the `/chat` namespace. Connecting marks you online, disconnecting marks you offline.

### Get Active Users

**Event:** `presence:getActiveUsers`  
**Direction:** Client → Server

```json
{
  "page": 1,
  "limit": 50
}
```

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "isOnline": true,
      "lastSeen": "2024-01-01T00:00:00.000Z",
      "profile": {
        "fullName": "John Doe",
        "profilePicture": "url",
        "country": "Bangladesh",
        "interestedLanguages": [...]
      }
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

### Get Online Count

**Event:** `presence:getCount`  
**Direction:** Client → Server

No payload required.

**Response:**
```json
{
  "count": 10
}
```

### Check If User Is Online

**Event:** `presence:isOnline`  
**Direction:** Client → Server

```json
{
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "userId": "uuid",
  "isOnline": true
}
```

### Heartbeat

**Event:** `presence:heartbeat`  
**Direction:** Client → Server

No payload. Keeps connection alive and updates `lastSeen`.

**Response:**
```json
{
  "ok": true
}
```

### User Online/Offline Broadcasts

**Event:** `user:online`  
**Direction:** Server → Client (broadcast to all)

```json
{
  "userId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Event:** `user:offline`  
**Direction:** Server → Client (broadcast to all)

```json
{
  "userId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Server → Client Events Summary

| Event | When Triggered |
|-------|---------------|
| `chat:connected` | Successful connection (you are now online) |
| `chat:newMessage` | New DM received |
| `chat:newRoomMessage` | New group message |
| `chat:messagesRead` | Your messages were read |
| `chat:userTyping` | Someone is typing |
| `chat:roomCreated` | Added to a new room |
| `chat:addedToRoom` | You were added to a room |
| `chat:memberAdded` | New member joined your room |
| `chat:memberJoined` | Someone self-joined your room |
| `chat:removedFromRoom` | You were removed from a room |
| `chat:memberRemoved` | Someone was removed from your room |
| `chat:memberLeft` | Someone left your room |
| `user:online` | A user came online |
| `user:offline` | A user went offline |
| `error` | Error occurred |

---

## Testing with Postman

1. Open Postman and go to **New → WebSocket Request**
2. Enter URL: `ws://localhost:3000/chat`
3. Go to **Settings** tab and add header: `Authorization: Bearer <token>`
4. Connect
5. Send events as JSON in the **Message** tab:
   ```
   42["chat:sendDirect", {"receiverId": "uuid", "content": "Hello"}]
   ```

Note: `42` is Socket.IO's event message prefix.

---

## Example Client Implementation

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Connection (you are now online!)
socket.on('chat:connected', (data) => {
  console.log('Connected!', data); // { userId, roomCount, isOnline: true }
});

// ========== PRESENCE ==========

// Listen for other users coming online/offline
socket.on('user:online', (data) => {
  console.log(`User ${data.userId} is now online`);
});

socket.on('user:offline', (data) => {
  console.log(`User ${data.userId} went offline`);
});

// Get all active users
socket.emit('presence:getActiveUsers', { page: 1, limit: 50 }, (response) => {
  console.log('Active users:', response.users);
  console.log('Total online:', response.total);
});

// Get online count
socket.emit('presence:getCount', {}, (response) => {
  console.log('Online count:', response.count);
});

// Check if specific user is online
socket.emit('presence:isOnline', { userId: 'user-uuid' }, (response) => {
  console.log(`User online: ${response.isOnline}`);
});

// ========== DIRECT MESSAGES ==========

socket.on('chat:newMessage', (message) => {
  console.log('New DM:', message);
});

socket.emit('chat:sendDirect', {
  receiverId: 'user-uuid',
  content: 'Hello!'
}, (response) => {
  console.log('Message sent:', response);
});

// ========== GROUP MESSAGES ==========

socket.on('chat:newRoomMessage', (message) => {
  console.log('New group message:', message);
});

socket.emit('chat:sendToRoom', {
  roomId: 'room-uuid',
  content: 'Hello team!'
}, (response) => {
  console.log('Message sent:', response);
});

// ========== TYPING INDICATOR ==========

socket.on('chat:userTyping', (data) => {
  console.log(`User ${data.userId} is ${data.isTyping ? 'typing...' : 'stopped typing'}`);
});

socket.emit('chat:typing', {
  receiverId: 'user-uuid',
  isTyping: true
});
```
