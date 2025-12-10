# Socket.IO Presence System

## Overview

Real-time user presence tracking using Socket.IO. Users are marked as online when connected and offline when disconnected.

## New Database Fields (User Entity)

| Field | Type | Description |
|-------|------|-------------|
| `isOnline` | boolean | Whether user is currently online |
| `lastSeen` | timestamp | Last activity timestamp |
| `socketId` | string | Current socket connection ID |

## REST API Endpoints

### GET `/presence/active`
Get all active (online) users with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "phone": null,
      "isOnline": true,
      "lastSeen": "2025-12-04T10:00:00.000Z",
      "profile": {
        "fullName": "John Doe",
        "profilePicture": "https://...",
        "ownLanguage": "Bengali"
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

### GET `/presence/count`
Get count of online users.

**Response:**
```json
{
  "count": 150
}
```

## Socket.IO Events

### Connection

Connect with JWT token:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

Or via query parameter:
```javascript
const socket = io('http://localhost:3000?token=your-jwt-token');
```

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `user:online` | `{ userId, timestamp }` | Broadcast when any user comes online |
| `user:offline` | `{ userId, timestamp }` | Broadcast when any user goes offline |
| `presence:count` | `{ count }` | Sent on connection with current online count |
| `error` | `{ message }` | Error message (e.g., auth failed) |

### Client → Server Events

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `presence:getActiveUsers` | `{ page?, limit? }` | `{ event, data }` | Request paginated active users |
| `presence:getCount` | - | `{ event, data }` | Request online count |
| `presence:isOnline` | `{ userId }` | `{ event, data }` | Check if specific user is online |
| `presence:heartbeat` | - | `{ event, data }` | Keep-alive & update lastSeen |

## Frontend Integration Example

```javascript
import { io } from 'socket.io-client';

// Connect with auth token
const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('jwt_token') }
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected to presence server');
});

// Listen for online count
socket.on('presence:count', (data) => {
  console.log(`${data.count} users online`);
});

// Listen for user coming online
socket.on('user:online', (data) => {
  console.log(`User ${data.userId} is now online`);
});

// Listen for user going offline
socket.on('user:offline', (data) => {
  console.log(`User ${data.userId} went offline`);
});

// Request active users
socket.emit('presence:getActiveUsers', { page: 1, limit: 50 }, (response) => {
  console.log('Active users:', response.data);
});

// Send heartbeat every 30 seconds
setInterval(() => {
  socket.emit('presence:heartbeat');
}, 30000);

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});

// Handle disconnect
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                                │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │  REST API Call  │    │  Socket.IO      │                 │
│  │  /presence/*    │    │  Connection     │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
└───────────┼─────────────────────┼───────────────────────────┘
            │                     │
            ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                     NestJS Backend                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  PresenceModule                          │ │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐ │ │
│  │  │ PresenceController│    │   PresenceGateway          │ │ │
│  │  │ (REST endpoints) │    │   (WebSocket handler)      │ │ │
│  │  └────────┬────────┘    └────────────┬────────────────┘ │ │
│  │           │                          │                   │ │
│  │           └──────────┬───────────────┘                   │ │
│  │                      ▼                                   │ │
│  │           ┌─────────────────────┐                        │ │
│  │           │   PresenceService   │                        │ │
│  │           │ - setUserOnline()   │                        │ │
│  │           │ - setUserOffline()  │                        │ │
│  │           │ - getActiveUsers()  │                        │ │
│  │           └──────────┬──────────┘                        │ │
│  └──────────────────────┼───────────────────────────────────┘ │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  PostgreSQL                              │ │
│  │    users.is_online | users.last_seen | users.socket_id  │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Future: Chat Extensions

This presence system is designed to support:

### Phase 2: 1:1 Chat
- Messages entity with sender/receiver
- Direct messaging via socket rooms
- Message history REST API

### Phase 3: Group Chat  
- ChatRoom entity with members
- Room-based messaging
- Admin controls

The `user:${userId}` room is already set up for targeted messaging.
