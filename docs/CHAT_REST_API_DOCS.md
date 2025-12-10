# Chat REST API Documentation

**Base URL:** `http://localhost:3000`  
**Authentication:** Bearer Token (JWT) required for all endpoints

---

## Direct Messages

### GET `/chat/conversations`
Get list of all users you've chatted with.

**Response:**
```json
[
  {
    "partner": {
      "id": "uuid",
      "email": "user@example.com",
      "profile": { "fullName": "John Doe", "profilePicture": "url" },
      "isOnline": true,
      "lastSeen": "2024-01-01T00:00:00.000Z"
    },
    "lastMessage": { ... },
    "unreadCount": 2
  }
]
```

---

### GET `/chat/direct/:userId`
Get message history with a specific user.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `userId` | UUID | User to get chat history with |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Messages per page (max: 100) |

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "content": "Hello!",
      "type": "text",
      "senderId": "uuid",
      "sender": { ... },
      "receiverId": "uuid",
      "isRead": true,
      "readAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

---

### GET `/chat/unread-count`
Get total unread direct message count.

**Response:**
```json
{ "count": 5 }
```

---

### POST `/chat/mark-read/:senderId`
Mark all messages from a sender as read.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `senderId` | UUID | Sender whose messages to mark read |

**Response:**
```json
{ "success": true }
```

---

## Group Chat Rooms

### GET `/chat/rooms`
Get all rooms you're a member of.

**Response:**
```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "Dev Team",
      "description": "...",
      "type": "group",
      "avatarUrl": null,
      "createdById": "uuid",
      "createdBy": { ... },
      "members": [ ... ],
      "admins": [ ... ],
      "memberCount": 5,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### POST `/chat/rooms`
Create a new chat room.

**Request Body:**
```json
{
  "name": "My Group Chat",
  "description": "Optional description",
  "memberIds": ["user-uuid-1", "user-uuid-2"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Room name (max 100 chars) |
| `description` | string | No | Room description |
| `memberIds` | UUID[] | Yes | Initial member IDs |

**Response:** `201 Created`
```json
{ "room": { ... } }
```

---

### GET `/chat/rooms/:roomId`
Get room details. **Must be a member.**

**Response:**
```json
{ "room": { ... } }
```

**Errors:**
- `403` - Not a member of this room
- `404` - Room not found

---

### PATCH `/chat/rooms/:roomId`
Update room details. **Admin only.**

**Request Body:** (all fields optional)
```json
{
  "name": "New Name",
  "description": "New description",
  "avatarUrl": "https://example.com/avatar.png"
}
```

**Response:**
```json
{ "room": { ... } }
```

**Errors:**
- `403` - Only admins can update the room

---

### DELETE `/chat/rooms/:roomId`
Delete (soft-delete) a room. **Creator only.**

**Response:**
```json
{ "success": true }
```

**Errors:**
- `403` - Only the room creator can delete the room

---

### GET `/chat/rooms/:roomId/messages`
Get room message history. **Must be a member.**

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Messages per page (max: 100) |

**Response:**
```json
{
  "messages": [ ... ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

---

### POST `/chat/rooms/:roomId/join`
Join a room as a member.

**Response:**
```json
{ "room": { ... } }
```

**Errors:**
- `403` - Already a member of this room
- `404` - Room not found

---

### POST `/chat/rooms/:roomId/members`
Add a user to the room. **Admin only** (unless adding yourself).

**Request Body:**
```json
{ "userId": "user-uuid-to-add" }
```

**Response:**
```json
{ "room": { ... } }
```

**Errors:**
- `403` - Only admins can add other members
- `403` - User is already a member

---

### DELETE `/chat/rooms/:roomId/members/:userId`
Remove a member from the room. **Admin only** (or self-removal).

**Response:**
```json
{ "success": true }
```

**Errors:**
- `403` - Only admins can remove members

---

### POST `/chat/rooms/:roomId/leave`
Leave a room.

**Response:**
```json
{ "success": true }
```

---

## Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text message (default) |
| `image` | Image message |
| `file` | File attachment |
| `system` | System-generated message |

---

## Error Response Format

All errors follow this format:
```json
{
  "statusCode": 403,
  "message": "Error description",
  "error": "Forbidden"
}
```

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid/missing token |
| `403` | Forbidden - Not allowed |
| `404` | Not Found - Resource doesn't exist |
