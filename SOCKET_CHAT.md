# Socket.IO Chat System

## Overview

Real-time chat system supporting both 1:1 direct messaging and group chat rooms using Socket.IO with a separate `/chat` namespace.

---

## Quick Start Checklist

### Setup
- [ ] Server running: `npm run start:dev`
- [ ] JWT token obtained from login
- [ ] Connected to `http://localhost:3000/chat` (not just `/`)

### 1:1 Direct Messaging
- [ ] Send DM: `chat:sendDirect` with `{receiverId, content}`
- [ ] Receive DM: Listen to `chat:newMessage`
- [ ] Get history: `chat:getDirectHistory` with `{userId}`
- [ ] Get conversations: `chat:getConversations`
- [ ] Mark as read: `chat:markRead` with `{senderId}`

### Group Chat
- [ ] Create room: `chat:createRoom` with `{name, memberIds[]}`
- [ ] Join room: `chat:joinGroup` with `{roomId}` (anyone can join)
- [ ] Send to room: `chat:sendToRoom` with `{roomId, content}`
- [ ] Receive room msg: Listen to `chat:newRoomMessage`
- [ ] Get room history: `chat:getRoomHistory` with `{roomId}`
- [ ] Get my rooms: `chat:getMyRooms`
- [ ] Leave room: `chat:leaveRoom` with `{roomId}`

### Admin Actions (Group)
- [ ] Add member: `chat:addMember` with `{roomId, userId}`
- [ ] Remove member: `chat:removeMember` with `{roomId, userId}`

## Database Tables

### Messages Table
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `content` | text | Message content |
| `type` | enum | text, image, file, system |
| `sender_id` | UUID | Message sender |
| `receiver_id` | UUID | For DMs (nullable) |
| `room_id` | UUID | For group chat (nullable) |
| `is_read` | boolean | Read status |
| `read_at` | timestamp | When message was read |
| `created_at` | timestamp | Message timestamp |

### Chat Rooms Table
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | varchar(100) | Room name |
| `description` | text | Room description |
| `type` | enum | direct, group |
| `avatar_url` | varchar(500) | Room avatar |
| `created_by` | UUID | Room creator |
| `is_active` | boolean | Soft delete flag |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last activity |

### Junction Tables
- `chat_room_members` - Room membership (many-to-many)
- `chat_room_admins` - Room admins (many-to-many)

---

## REST API Endpoints

All endpoints require JWT authentication.

### Direct Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/conversations` | Get all DM conversations |
| GET | `/chat/direct/:userId` | Get message history with user |
| GET | `/chat/unread-count` | Get unread message count |
| POST | `/chat/mark-read/:senderId` | Mark messages as read |

### Group Chat Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/rooms` | Get user's rooms |
| POST | `/chat/rooms` | Create a room |
| GET | `/chat/rooms/:roomId` | Get room details |
| GET | `/chat/rooms/:roomId/messages` | Get room messages |
| POST | `/chat/rooms/:roomId/members` | Add member (admin) |
| DELETE | `/chat/rooms/:roomId/members/:userId` | Remove member |
| POST | `/chat/rooms/:roomId/leave` | Leave room |
| DELETE | `/chat/rooms/:roomId` | Delete room (creator) |

---

## Socket.IO Events

### Connection

Connect to the `/chat` namespace with JWT token:

```javascript
const chatSocket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});
```

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:connected` | `{ userId, roomCount }` | Connection confirmed |
| `chat:newMessage` | `Message` | New direct message received |
| `chat:newRoomMessage` | `Message` | New group message received |
| `chat:messagesRead` | `{ readBy }` | Your messages were read |
| `chat:roomCreated` | `ChatRoom` | Added to a new room |
| `chat:addedToRoom` | `{ roomId, room }` | You were added to a room |
| `chat:removedFromRoom` | `{ roomId }` | You were removed from a room |
| `chat:memberAdded` | `{ roomId, userId }` | Member added to room |
| `chat:memberRemoved` | `{ roomId, userId }` | Member removed from room |
| `chat:memberLeft` | `{ roomId, userId }` | Member left room |
| `chat:userTyping` | `{ userId, isTyping, roomId? }` | Typing indicator |
| `error` | `{ message }` | Error occurred |

### Client → Server Events

#### Direct Messages

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `chat:sendDirect` | `{ receiverId, content, type? }` | `{ success, message }` | Send DM |
| `chat:getDirectHistory` | `{ userId, page?, limit? }` | `{ messages, total, ... }` | Get DM history |
| `chat:getConversations` | - | `{ conversations }` | Get all DM conversations |
| `chat:markRead` | `{ senderId }` | `{ success }` | Mark messages as read |
| `chat:getUnreadCount` | - | `{ count }` | Get unread count |

#### Group Chat

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `chat:createRoom` | `{ name, memberIds[], description? }` | `{ success, room }` | Create room |
| `chat:joinRoom` | `{ roomId }` | `{ success }` | Join socket room |
| `chat:getMyRooms` | - | `{ rooms }` | Get user's rooms |
| `chat:getRoom` | `{ roomId }` | `{ room }` | Get room details |
| `chat:sendToRoom` | `{ roomId, content, type? }` | `{ success, message }` | Send to room |
| `chat:getRoomHistory` | `{ roomId, page?, limit? }` | `{ messages, total, ... }` | Get room messages |
| `chat:addMember` | `{ roomId, userId }` | `{ success, room }` | Add member (admin) |
| `chat:removeMember` | `{ roomId, userId }` | `{ success }` | Remove member |
| `chat:leaveRoom` | `{ roomId }` | `{ success }` | Leave room |

#### Typing Indicator

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:typing` | `{ receiverId?, roomId?, isTyping }` | Send typing status |

---

## Frontend Integration Example

```javascript
import { io } from 'socket.io-client';

// Connect to chat namespace
const chatSocket = io('http://localhost:3000/chat', {
  auth: { token: localStorage.getItem('jwt_token') }
});

// Connection confirmed
chatSocket.on('chat:connected', (data) => {
  console.log(`Connected! You have ${data.roomCount} rooms`);
});

// ==================== DIRECT MESSAGES ====================

// Send a direct message
function sendDirectMessage(receiverId, content) {
  chatSocket.emit('chat:sendDirect', { receiverId, content }, (response) => {
    if (response.success) {
      console.log('Message sent:', response.message);
    } else {
      console.error('Error:', response.error);
    }
  });
}

// Listen for incoming direct messages
chatSocket.on('chat:newMessage', (message) => {
  console.log('New DM from:', message.sender.profile?.fullName);
  console.log('Content:', message.content);
});

// Get conversation history
function getDirectHistory(userId) {
  chatSocket.emit('chat:getDirectHistory', { userId, page: 1, limit: 50 }, (response) => {
    console.log('Messages:', response.messages);
  });
}

// Mark messages as read
function markAsRead(senderId) {
  chatSocket.emit('chat:markRead', { senderId });
}

// Listen for read receipts
chatSocket.on('chat:messagesRead', (data) => {
  console.log(`User ${data.readBy} read your messages`);
});

// ==================== GROUP CHAT ====================

// Create a group
function createGroup(name, memberIds) {
  chatSocket.emit('chat:createRoom', { name, memberIds }, (response) => {
    if (response.success) {
      console.log('Room created:', response.room);
    }
  });
}

// Send message to group
function sendGroupMessage(roomId, content) {
  chatSocket.emit('chat:sendToRoom', { roomId, content }, (response) => {
    if (response.success) {
      console.log('Group message sent');
    }
  });
}

// Listen for group messages
chatSocket.on('chat:newRoomMessage', (message) => {
  console.log(`[${message.room?.name}] ${message.sender.profile?.fullName}: ${message.content}`);
});

// Get room history
function getRoomHistory(roomId) {
  chatSocket.emit('chat:getRoomHistory', { roomId, page: 1, limit: 50 }, (response) => {
    console.log('Room messages:', response.messages);
  });
}

// ==================== TYPING INDICATOR ====================

// Send typing status (for DM)
function setTypingDM(receiverId, isTyping) {
  chatSocket.emit('chat:typing', { receiverId, isTyping });
}

// Send typing status (for group)
function setTypingGroup(roomId, isTyping) {
  chatSocket.emit('chat:typing', { roomId, isTyping });
}

// Listen for typing indicator
chatSocket.on('chat:userTyping', (data) => {
  if (data.isTyping) {
    console.log(`User ${data.userId} is typing...`);
  } else {
    console.log(`User ${data.userId} stopped typing`);
  }
});

// ==================== ROOM MANAGEMENT ====================

// Get all rooms
chatSocket.emit('chat:getMyRooms', {}, (response) => {
  console.log('My rooms:', response.rooms);
});

// Leave a room
function leaveRoom(roomId) {
  chatSocket.emit('chat:leaveRoom', { roomId }, (response) => {
    if (response.success) {
      console.log('Left room');
    }
  });
}

// Listen for room events
chatSocket.on('chat:addedToRoom', (data) => {
  console.log('You were added to room:', data.room.name);
  // Join the socket room
  chatSocket.emit('chat:joinRoom', { roomId: data.roomId });
});

chatSocket.on('chat:removedFromRoom', (data) => {
  console.log('You were removed from room:', data.roomId);
});

// Handle errors
chatSocket.on('error', (error) => {
  console.error('Socket error:', error.message);
});

// Handle disconnect
chatSocket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Client                          │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │ presenceSocket       │    │ chatSocket                   │   │
│  │ io('localhost:3000') │    │ io('localhost:3000/chat')    │   │
│  └──────────┬───────────┘    └──────────────┬───────────────┘   │
└─────────────┼───────────────────────────────┼───────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NestJS Server :3000                         │
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │ PresenceModule       │    │ ChatModule                   │   │
│  │ namespace: '/'       │    │ namespace: '/chat'           │   │
│  │                      │    │                              │   │
│  │ • user:online        │    │ • chat:sendDirect            │   │
│  │ • user:offline       │    │ • chat:newMessage            │   │
│  │ • presence:*         │    │ • chat:sendToRoom            │   │
│  │                      │    │ • chat:newRoomMessage        │   │
│  │ PresenceGateway      │    │ ChatGateway                  │   │
│  │ PresenceService      │    │ ChatService                  │   │
│  │ PresenceController   │    │ ChatController               │   │
│  └──────────┬───────────┘    └──────────────┬───────────────┘   │
│             │                               │                    │
│             └───────────────┬───────────────┘                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      PostgreSQL                              ││
│  │  users | messages | chat_rooms | chat_room_members | admins ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Room Types

### Socket Rooms (In-Memory)

| Room Pattern | Purpose |
|--------------|---------|
| `user:${userId}` | Personal room for DMs |
| `room:${roomId}` | Group chat room |

### Auto-Join Behavior

On chat connection:
1. User joins `user:${userId}` room
2. User auto-joins all `room:${roomId}` rooms they belong to

---

## Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text message (default) |
| `image` | Image attachment |
| `file` | File attachment |
| `system` | System notification |

---

## File Structure

```
src/chat/
├── chat.module.ts
├── chat.gateway.ts
├── chat.service.ts
├── chat.controller.ts
├── dto/
│   ├── send-message.dto.ts
│   ├── create-room.dto.ts
│   └── message-query.dto.ts
└── entities/
    ├── message.entity.ts
    └── chat-room.entity.ts
```
