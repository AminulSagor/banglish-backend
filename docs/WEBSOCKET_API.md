# WebSocket API Documentation

This document covers all WebSocket events for real-time features in the Banglish API.

## Connection

### Chat Namespace
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your_access_token'
  }
});
```

> **Note:** Presence is handled via HTTP REST API, not WebSocket. See the Presence HTTP endpoints below.

---

## Chat Events

### Client → Server Events

#### Join Room
```javascript
socket.emit('chat:join', { roomId: 'uuid' });
```

#### Leave Room
```javascript
socket.emit('chat:leave', { roomId: 'uuid' });
```

#### Send Message
```javascript
socket.emit('chat:message', {
  roomId: 'uuid',
  content: 'Hello!',
  type: 'text' // 'text' | 'image' | 'file' | 'audio' | 'video'
});
```

#### Edit Message
```javascript
socket.emit('chat:editMessage', {
  roomId: 'uuid',
  messageId: 'uuid',
  content: 'Updated message'
});
```

#### Delete Message
```javascript
socket.emit('chat:deleteMessage', {
  roomId: 'uuid',
  messageId: 'uuid'
});
```

#### Mark as Read
```javascript
socket.emit('chat:markRead', {
  roomId: 'uuid',
  messageId: 'uuid' // optional, marks all if omitted
});
```

#### Typing Indicator
```javascript
socket.emit('chat:typing', { roomId: 'uuid' });
socket.emit('chat:stopTyping', { roomId: 'uuid' });
```

#### Create Room
```javascript
socket.emit('chat:createRoom', {
  name: 'Room Name',
  type: 'group', // 'direct' | 'group'
  memberIds: ['uuid1', 'uuid2']
});
```

#### Room Admin Operations
```javascript
socket.emit('chat:makeAdmin', { roomId: 'uuid', userId: 'uuid' });
socket.emit('chat:removeAdmin', { roomId: 'uuid', userId: 'uuid' });
socket.emit('chat:getAdmins', { roomId: 'uuid' });
```

#### Room Member Operations
```javascript
socket.emit('chat:addMember', { roomId: 'uuid', userId: 'uuid' });
socket.emit('chat:removeMember', { roomId: 'uuid', userId: 'uuid' });
```

---

### Server → Client Events

#### New Message
```javascript
socket.on('chat:newMessage', (data) => {
  // { message: Message, roomId: string }
});
```

#### Message Updated
```javascript
socket.on('chat:messageUpdated', (data) => {
  // { messageId: string, content: string, updatedAt: Date }
});
```

#### Message Deleted
```javascript
socket.on('chat:messageDeleted', (data) => {
  // { messageId: string, roomId: string }
});
```

#### Messages Read
```javascript
socket.on('chat:messagesRead', (data) => {
  // { roomId: string, userId: string, messageId?: string }
});
```

#### Typing Events
```javascript
socket.on('chat:userTyping', (data) => {
  // { roomId: string, userId: string, userName: string }
});

socket.on('chat:userStoppedTyping', (data) => {
  // { roomId: string, userId: string }
});
```

#### Room Events
```javascript
socket.on('chat:roomCreated', (data) => {
  // { room: ChatRoom }
});

socket.on('chat:roomUpdated', (data) => {
  // { roomId: string, updates: Partial<ChatRoom> }
});

socket.on('chat:roomDeleted', (data) => {
  // { roomId: string }
});

socket.on('chat:memberAdded', (data) => {
  // { roomId: string, userId: string, user: User }
});

socket.on('chat:memberRemoved', (data) => {
  // { roomId: string, userId: string }
});
```

#### Admin Events
```javascript
socket.on('chat:adminAdded', (data) => {
  // { roomId: string, userId: string }
});

socket.on('chat:adminRemoved', (data) => {
  // { roomId: string, userId: string }
});

socket.on('chat:admins', (data) => {
  // { roomId: string, admins: User[] }
});
```

#### Error Handling
```javascript
socket.on('chat:error', (data) => {
  // { message: string, code?: string }
});
```

---

## Call Events

### Client → Server Events

#### Initiate Call
```javascript
socket.emit('call:initiate', {
  roomId: 'uuid',
  callType: 'video' // 'audio' | 'video'
});
```

#### Join Call
```javascript
socket.emit('call:join', { callId: 'uuid' });
```

#### Leave Call
```javascript
socket.emit('call:leave', { callId: 'uuid' });
```

#### End Call (Host Only)
```javascript
socket.emit('call:end', { callId: 'uuid' });
```

#### Mute/Unmute Participant (Host Only)
```javascript
socket.emit('call:muteParticipant', {
  callId: 'uuid',
  participantId: 'uuid',
  muteAudio: true,
  muteVideo: false
});
```

#### Kick Participant (Host Only)
```javascript
socket.emit('call:kickParticipant', {
  callId: 'uuid',
  participantId: 'uuid'
});
```

---

### Server → Client Events

#### Call Started
```javascript
socket.on('call:started', (data) => {
  // { callId: string, roomId: string, initiator: User, callType: string }
});
```

#### Call Joined
```javascript
socket.on('call:joined', (data) => {
  // { callId: string, userId: string, user: User }
});
```

#### Call Left
```javascript
socket.on('call:left', (data) => {
  // { callId: string, userId: string }
});
```

#### Call Ended
```javascript
socket.on('call:ended', (data) => {
  // { callId: string, endedBy: string, reason: string }
});
```

#### Participant Muted
```javascript
socket.on('call:participantMuted', (data) => {
  // { callId: string, participantId: string, muteAudio: boolean, muteVideo: boolean }
});
```

#### Participant Kicked
```javascript
socket.on('call:participantKicked', (data) => {
  // { callId: string, participantId: string, kickedBy: string }
});
```

#### Agora Token
```javascript
socket.on('call:agoraToken', (data) => {
  // { token: string, channel: string, uid: number }
});
```

---

## Presence (HTTP-based)

Presence is managed via HTTP REST endpoints with a heartbeat mechanism:

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/presence/online` | Mark user as online |
| POST | `/presence/offline` | Mark user as offline |
| POST | `/presence/heartbeat` | Send heartbeat to stay online |
| GET | `/presence/config` | Get timeout configuration |
| GET | `/presence/active` | Get list of online users |
| GET | `/presence/count` | Get online user count |

### Frontend Implementation

```javascript
// On app load - mark online
await fetch('/presence/online', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }
});

// Get config
const config = await fetch('/presence/config', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

// Send heartbeat every X minutes
setInterval(async () => {
  await fetch('/presence/heartbeat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}, config.recommendedHeartbeatMinutes * 60 * 1000);

// On app close - mark offline
window.addEventListener('beforeunload', () => {
  navigator.sendBeacon('/presence/offline');
});
```

---

## Billing (HTTP-based)

The billing system manages call minutes for users. New users receive free minutes, and can purchase additional minutes when needed.

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/billing/balance` | Get my minutes balance |
| GET | `/billing/pricing` | Get current pricing info |
| GET | `/billing/transactions` | Get my transaction history |
| POST | `/billing/purchase` | Purchase additional minutes |
| GET | `/billing/check-minutes` | Check if I have enough minutes |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/billing/admin/config` | Get all billing configurations |
| PATCH | `/billing/admin/config/free-minutes` | Set free minutes for new users |
| PATCH | `/billing/admin/config/:key` | Set any config value |
| GET | `/billing/admin/users/:userId/balance` | Get specific user's balance |
| PATCH | `/billing/admin/users/:userId/balance` | Adjust user's balance |
| GET | `/billing/admin/transactions` | Get all transactions |
| GET | `/billing/admin/stats` | Get billing analytics |

### Payment Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/billing/webhook/stripe` | Stripe payment callback |
| POST | `/billing/webhook/sslcommerz` | SSLCommerz payment callback |

### How Billing Works

1. **New Users**: Automatically receive free minutes (default: 30 minutes, configurable by admin)
2. **Before Calls**: System checks if user has available minutes before allowing call initiation
3. **During Calls**: Minutes are tracked in real-time
4. **After Calls**: Minutes are deducted from user's balance (free minutes first, then paid)
5. **No Minutes**: User cannot initiate calls until they purchase more minutes

### Balance Response Example

```json
{
  "freeMinutes": 30,
  "freeMinutesUsed": 15,
  "remainingFreeMinutes": 15,
  "paidMinutes": 60,
  "paidMinutesUsed": 0,
  "remainingPaidMinutes": 60,
  "totalRemainingMinutes": 75,
  "totalSpent": 120.00
}
```

### Frontend Implementation

```javascript
// Check balance before showing call button
async function canMakeCall() {
  const response = await fetch('/billing/check-minutes?minutes=1', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  return data.hasMinutes;
}

// Get pricing info
async function getPricing() {
  const response = await fetch('/billing/pricing', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
  // Returns: { freeMinutesForNewUsers: 30, pricePerMinute: 2.00, minPurchaseMinutes: 10, currency: "BDT" }
}

// Purchase minutes
async function purchaseMinutes(minutes, paymentMethod) {
  const response = await fetch('/billing/purchase', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ minutes, paymentMethod }) // paymentMethod: STRIPE, SSLCOMMERZ, BKASH, NAGAD
  });
  return response.json();
}

// Get transaction history
async function getTransactions(limit = 20, offset = 0) {
  const response = await fetch(`/billing/transactions?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}
```

### Admin Implementation

```javascript
// Set free minutes for new users
async function setFreeMinutes(freeMinutes) {
  const response = await fetch('/billing/admin/config/free-minutes', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ freeMinutes })
  });
  return response.json();
}

// Adjust user balance (gift minutes, refunds, etc.)
async function adjustUserBalance(userId, freeMinutes, paidMinutes, reason) {
  const response = await fetch(`/billing/admin/users/${userId}/balance`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ freeMinutes, paidMinutes, reason })
  });
  return response.json();
}

// Get billing statistics
async function getBillingStats() {
  const response = await fetch('/billing/admin/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  return response.json();
  // Returns: { totalRevenue, totalMinutesSold, totalMinutesUsed, activeUsers }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication token |
| `FORBIDDEN` | User doesn't have permission for this action |
| `NOT_FOUND` | Room, message, or call not found |
| `ALREADY_EXISTS` | Resource already exists (e.g., already in room) |
| `INVALID_INPUT` | Invalid request parameters |

---

## Connection Events

```javascript
// Connection established
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});

// Disconnected
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

---

## Example: Complete Chat Flow

```javascript
import { io } from 'socket.io-client';

// Connect to chat namespace
const socket = io('http://localhost:3000/chat', {
  auth: { token: accessToken }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected to chat');
  
  // Join a room
  socket.emit('chat:join', { roomId: 'room-uuid' });
});

// Listen for messages
socket.on('chat:newMessage', (data) => {
  console.log('New message:', data.message);
});

// Listen for typing
socket.on('chat:userTyping', (data) => {
  console.log(`${data.userName} is typing...`);
});

// Send a message
function sendMessage(content) {
  socket.emit('chat:message', {
    roomId: 'room-uuid',
    content,
    type: 'text'
  });
}

// Show typing indicator
function startTyping() {
  socket.emit('chat:typing', { roomId: 'room-uuid' });
}

// Handle errors
socket.on('chat:error', (error) => {
  console.error('Chat error:', error.message);
});
```

---

## Example: Complete Call Flow

```javascript
import { io } from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';

const socket = io('http://localhost:3000/chat', {
  auth: { token: accessToken }
});

let agoraClient;

// Initiate a video call
function startCall(roomId) {
  socket.emit('call:initiate', {
    roomId,
    callType: 'video'
  });
}

// Handle call started - receive Agora token
socket.on('call:agoraToken', async (data) => {
  agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  
  await agoraClient.join(
    'YOUR_AGORA_APP_ID',
    data.channel,
    data.token,
    data.uid
  );
  
  // Create and publish local tracks
  const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
  await agoraClient.publish([audioTrack, videoTrack]);
});

// Handle call ended
socket.on('call:ended', async (data) => {
  if (agoraClient) {
    await agoraClient.leave();
  }
  console.log('Call ended:', data.reason);
});

// Leave call
function leaveCall(callId) {
  socket.emit('call:leave', { callId });
}
```
