# Frontend Integration Guide - Chat & Calling API

This documentation covers everything frontend developers need to integrate real-time chat and voice calling features.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Socket.IO Connection](#socketio-connection)
4. [Chat Features](#chat-features)
5. [Voice Calling (1:1)](#voice-calling-11)
6. [Group Calling](#group-calling)
7. [Agora Integration](#agora-integration)
8. [REST API Endpoints](#rest-api-endpoints)
9. [Error Handling](#error-handling)
10. [TypeScript Interfaces](#typescript-interfaces)

---

## Overview

| Feature | Technology |
|---------|------------|
| Real-time messaging | Socket.IO |
| Voice/Video calls | Agora RTC SDK + Socket.IO signaling |
| Authentication | JWT Bearer tokens |
| API Protocol | REST + WebSocket |

### Base URLs

```
REST API:     https://your-domain.com
WebSocket:    https://your-domain.com/chat
```

---

## Authentication

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:** Same structure as login.

### Using the Token

Include the token in all subsequent requests:

```
Authorization: Bearer <accessToken>
```

---

## Socket.IO Connection

### Connecting

```javascript
import { io } from 'socket.io-client';

const socket = io('https://your-domain.com/chat', {
  auth: {
    token: accessToken  // JWT token from login
  },
  transports: ['websocket', 'polling']
});
```

### Connection Events

```javascript
// Successfully connected
socket.on('chat:connected', (data) => {
  console.log('Connected as user:', data.userId);
  console.log('Joined rooms:', data.roomCount);
});

// Connection error
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});

// Disconnected
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

---

## Chat Features

### Direct Messages (1:1 Chat)

#### Send a Direct Message

```javascript
socket.emit('chat:sendDirect', {
  receiverId: 'target-user-uuid',
  content: 'Hello!',
  type: 'text'  // optional: 'text' | 'image' | 'file' | 'audio' | 'video'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  } else {
    console.error('Error:', response.error);
  }
});
```

#### Receive Messages

```javascript
socket.on('chat:newMessage', (message) => {
  console.log('New message:', message);
  // {
  //   id: 'message-uuid',
  //   senderId: 'sender-uuid',
  //   receiverId: 'receiver-uuid',
  //   content: 'Hello!',
  //   type: 'text',
  //   createdAt: '2025-12-10T10:00:00.000Z',
  //   isRead: false
  // }
});
```

#### Get Direct Message History

```javascript
socket.emit('chat:getDirectHistory', {
  otherUserId: 'other-user-uuid',
  page: 1,
  limit: 50
}, (response) => {
  console.log('Messages:', response.messages);
  console.log('Total:', response.total);
});
```

---

### Group Rooms

#### Create a Room

```javascript
socket.emit('chat:createRoom', {
  name: 'My Group',
  memberIds: ['user-uuid-1', 'user-uuid-2']  // optional initial members
}, (response) => {
  if (response.success) {
    console.log('Room created:', response.room);
  }
});
```

#### Get My Rooms

```javascript
socket.emit('chat:getMyRooms', {}, (response) => {
  console.log('My rooms:', response);
  // Array of room objects
});
```

#### Join a Public Room

```javascript
socket.emit('chat:joinGroup', {
  roomId: 'room-uuid'
}, (response) => {
  if (response.success) {
    console.log('Joined room');
  }
});
```

#### Send Message to Room

```javascript
socket.emit('chat:sendRoom', {
  roomId: 'room-uuid',
  content: 'Hello everyone!',
  type: 'text'
}, (response) => {
  if (response.success) {
    console.log('Message sent to room');
  }
});
```

#### Receive Room Messages

```javascript
socket.on('chat:roomMessage', (message) => {
  console.log('Room message:', message);
  // {
  //   id: 'message-uuid',
  //   senderId: 'sender-uuid',
  //   roomId: 'room-uuid',
  //   content: 'Hello everyone!',
  //   type: 'text',
  //   createdAt: '2025-12-10T10:00:00.000Z'
  // }
});
```

#### Get Room Message History

```javascript
socket.emit('chat:getRoomHistory', {
  roomId: 'room-uuid',
  page: 1,
  limit: 50
}, (response) => {
  console.log('Messages:', response.messages);
});
```

#### Leave a Room

```javascript
socket.emit('chat:leaveRoom', {
  roomId: 'room-uuid'
}, (response) => {
  if (response.success) {
    console.log('Left the room');
  }
});
```

---

### Typing Indicators

#### Send Typing Status

```javascript
// For direct messages
socket.emit('chat:typing', {
  receiverId: 'other-user-uuid',
  isTyping: true
});

// For room messages
socket.emit('chat:typing', {
  roomId: 'room-uuid',
  isTyping: true
});

// Stop typing
socket.emit('chat:typing', {
  receiverId: 'other-user-uuid',
  isTyping: false
});
```

#### Receive Typing Status

```javascript
socket.on('chat:userTyping', (data) => {
  console.log(`User ${data.userId} is typing: ${data.isTyping}`);
  // For rooms: data.roomId will be present
});
```

---

### Room Events

```javascript
// You were added to a room
socket.on('chat:addedToRoom', (data) => {
  console.log('Added to room:', data.room);
});

// You were removed from a room
socket.on('chat:removedFromRoom', (data) => {
  console.log('Removed from room:', data.roomId);
});

// Someone joined the room
socket.on('chat:memberAdded', (data) => {
  console.log(`User ${data.userId} joined room ${data.roomId}`);
});

// Someone left the room
socket.on('chat:memberLeft', (data) => {
  console.log(`User ${data.userId} left room ${data.roomId}`);
});
```

---

## Voice Calling (1:1)

### Prerequisites

Install Agora Web SDK:
```bash
npm install agora-rtc-sdk-ng
```

### Call Flow Diagram

```
Caller                          Server                          Receiver
  |                               |                                |
  |-- call:initiate ------------->|                                |
  |<-- success + agoraToken ------|                                |
  |                               |------ call:incoming ---------->|
  |                               |                                |
  |   [Caller joins Agora]        |                                |
  |                               |                                |
  |                               |<----- call:accept -------------|
  |<------ call:accepted ---------|                                |
  |                               |                                |
  |   [Both in Agora channel - talking]                            |
  |                               |                                |
  |-- call:end ------------------>|                                |
  |                               |------ call:ended ------------->|
```

### Initiate a Call

```javascript
socket.emit('call:initiate', {
  receiverId: 'target-user-uuid'
}, async (response) => {
  if (response.success) {
    // Save call info
    const callId = response.callId;
    const agoraToken = response.agoraToken;
    const agoraAppId = response.agoraAppId;
    const channelName = response.channelName;  // Same as callId
    const uid = response.uid;

    // Join Agora channel (see Agora Integration section)
    await joinAgoraChannel(agoraAppId, channelName, agoraToken, uid);
    
    // Show "Ringing..." UI
  } else {
    console.error('Call failed:', response.error);
    // Possible errors:
    // - "User is offline"
    // - "User is busy in another call"
    // - "You are already in a call"
  }
});
```

### Receive an Incoming Call

```javascript
socket.on('call:incoming', (data) => {
  console.log('Incoming call from:', data.callerInfo);
  // {
  //   callId: 'call-uuid',
  //   callerId: 'caller-uuid',
  //   callerInfo: {
  //     id: 'caller-uuid',
  //     email: 'caller@example.com',
  //     profile: { fullName: 'John Doe', profilePicture: 'url' }
  //   },
  //   isGroupCall: false,  // true for group calls
  //   roomId: null         // present for group calls
  // }

  // Show incoming call UI with Accept/Reject buttons
  showIncomingCallModal(data);
});
```

### Accept a Call

```javascript
socket.emit('call:accept', {
  callId: incomingCallId
}, async (response) => {
  if (response.success) {
    const { agoraToken, agoraAppId, channelName, uid } = response;
    
    // Join Agora channel
    await joinAgoraChannel(agoraAppId, channelName, agoraToken, uid);
    
    // Show in-call UI
  }
});
```

### Reject a Call

```javascript
socket.emit('call:reject', {
  callId: incomingCallId
}, (response) => {
  if (response.success) {
    // Hide incoming call UI
  }
});
```

### Cancel an Outgoing Call

```javascript
// Before the receiver answers
socket.emit('call:cancel', {
  callId: currentCallId
}, (response) => {
  if (response.success) {
    // Leave Agora channel
    await leaveAgoraChannel();
    // Hide calling UI
  }
});
```

### End an Ongoing Call

```javascript
socket.emit('call:end', {
  callId: currentCallId
}, (response) => {
  if (response.success) {
    console.log('Call duration:', response.duration, 'seconds');
    // Leave Agora channel
    await leaveAgoraChannel();
    // Show call ended UI
  }
});
```

### Call State Events

```javascript
// Call was accepted by receiver
socket.on('call:accepted', (data) => {
  console.log('Call accepted:', data.callId);
  // Update UI to show "Connected"
});

// Call was rejected by receiver
socket.on('call:rejected', (data) => {
  console.log('Call rejected:', data.callId);
  await leaveAgoraChannel();
  // Show "Call Declined" message
});

// Caller cancelled before you answered
socket.on('call:cancelled', (data) => {
  console.log('Call cancelled:', data.callId);
  // Hide incoming call UI
});

// Call ended (by either party)
socket.on('call:ended', (data) => {
  console.log('Call ended:', data.callId);
  console.log('Duration:', data.duration, 'seconds');
  console.log('Ended by:', data.endedBy);
  await leaveAgoraChannel();
  // Show call ended UI
});

// Call was missed (30 second timeout)
socket.on('call:missed', (data) => {
  console.log('Missed call:', data.callId);
  // For caller: show "No Answer"
  // For receiver: show missed call notification
  await leaveAgoraChannel();
});
```

---

## Group Calling

### Initiate a Group Call

```javascript
socket.emit('call:initiateGroup', {
  roomId: 'room-uuid'
}, async (response) => {
  if (response.success) {
    const { callId, agoraToken, agoraAppId, channelName, uid, hostId, isHost } = response;
    
    // You are the host! You can mute other participants
    console.log('You are the host:', isHost);
    
    // Join Agora channel
    await joinAgoraChannel(agoraAppId, channelName, agoraToken, uid);
    
    // Show "In Group Call" UI with host controls
    // Other room members will receive call:incoming event
  }
});
```

### Join an Ongoing Group Call

```javascript
socket.emit('call:joinGroup', {
  callId: groupCallId
}, async (response) => {
  if (response.success) {
    const { 
      agoraToken, agoraAppId, channelName, uid, 
      participants, hostId, participantDetails 
    } = response;
    
    console.log('Host:', hostId);
    console.log('Am I the host?', hostId === myUserId);
    console.log('Participants with mute status:', participantDetails);
    
    // Join Agora channel
    await joinAgoraChannel(agoraAppId, channelName, agoraToken, uid);
  }
});
```

### Leave a Group Call

```javascript
socket.emit('call:leaveGroup', {
  callId: groupCallId
}, (response) => {
  if (response.success) {
    await leaveAgoraChannel();
    // Show left call UI
  }
});
```

### Group Call Events

```javascript
// Someone joined the group call
socket.on('call:userJoined', (data) => {
  console.log('User joined call:', data.userInfo);
  // {
  //   callId: 'call-uuid',
  //   userId: 'user-uuid',
  //   userInfo: { id, email, profile }
  // }
  // Update participants list UI
});

// Someone left the group call
socket.on('call:userLeft', (data) => {
  console.log('User left call:', data.userId);
  // Update participants list UI
});
```

---

## Host & Mute Controls

In group calls, the person who initiated the call is the **host**. The host has special permissions:

| Action | Host | Participant |
|--------|------|-------------|
| Mute themselves | ✅ | ✅ |
| Unmute themselves | ✅ | ✅ |
| Mute others | ✅ | ❌ |
| Unmute others | ❌ | ❌ |
| Kick/remove others | ✅ | ❌ |
| Transfer host | ✅ | ❌ |

> **Privacy Note:** Host can mute participants, but cannot unmute them. Participants must unmute themselves.

### Toggle Self Mute (Any Participant)

```javascript
// Mute yourself
socket.emit('call:toggleMute', {
  callId: currentCallId,
  isMuted: true
}, (response) => {
  if (response.success) {
    // Update local mute button UI
    // Also mute your Agora audio track
    localAudioTrack.setEnabled(false);
  }
});

// Unmute yourself
socket.emit('call:toggleMute', {
  callId: currentCallId,
  isMuted: false
}, (response) => {
  if (response.success) {
    localAudioTrack.setEnabled(true);
  }
});
```

### Host Mutes a Participant

```javascript
// Only the host can do this
socket.emit('call:hostMute', {
  callId: currentCallId,
  targetUserId: 'participant-uuid'
}, (response) => {
  if (response.success) {
    console.log('Participant muted');
  } else {
    console.error(response.error);
    // "Only the host can mute/unmute other participants"
  }
});
```

### Transfer Host Role

```javascript
// Only current host can transfer
socket.emit('call:transferHost', {
  callId: currentCallId,
  newHostId: 'participant-uuid'
}, (response) => {
  if (response.success) {
    console.log('Host transferred to:', response.newHostId);
    // Update UI to remove host controls
  }
});
```

### Kick/Remove a Participant (Host Only)

```javascript
// Only the host can kick participants
socket.emit('call:kickParticipant', {
  callId: currentCallId,
  targetUserId: 'participant-uuid'
}, (response) => {
  if (response.success) {
    console.log('Participant removed from call');
  } else {
    console.error(response.error);
    // "Only the host can remove participants"
    // "Host cannot kick themselves. Transfer host first or leave the call."
  }
});
```

### Get Participants List with Status

```javascript
socket.emit('call:getParticipants', {
  callId: currentCallId
}, (response) => {
  if (response.success) {
    console.log('Host:', response.hostId);
    console.log('Participants:', response.participants);
    // [
    //   {
    //     userId: 'uuid',
    //     isMuted: false,
    //     joinedAt: '2025-12-10T10:00:00.000Z',
    //     isHost: true,
    //     userInfo: { id, email, profile }
    //   },
    //   ...
    // ]
  }
});
```

### Mute-Related Events

```javascript
// Someone's mute state changed (including yourself)
socket.on('call:participantMuted', (data) => {
  console.log(`User ${data.userId} is now ${data.isMuted ? 'muted' : 'unmuted'}`);
  console.log('Muted by:', data.mutedBy);
  // {
  //   callId: 'call-uuid',
  //   userId: 'affected-user-uuid',
  //   isMuted: true,
  //   mutedBy: 'who-did-it-uuid'  // same as userId if self-muted
  // }
  
  // Update UI to show mute indicator next to participant
  updateParticipantMuteUI(data.userId, data.isMuted);
});

// You were muted by the host
socket.on('call:youWereMuted', (data) => {
  console.log('You were muted by the host');
  // {
  //   callId: 'call-uuid',
  //   mutedBy: 'host-uuid'
  // }
  
  // Important: Actually mute your Agora audio track!
  localAudioTrack.setEnabled(false);
  
  // Show notification: "The host has muted you"
  showNotification('The host has muted you');
  
  // Update your mute button UI
  updateMuteButton(true);
});

// Host role changed
socket.on('call:hostChanged', (data) => {
  console.log(`Host changed from ${data.previousHostId} to ${data.newHostId}`);
  // {
  //   callId: 'call-uuid',
  //   previousHostId: 'old-host-uuid',
  //   newHostId: 'new-host-uuid'
  // }
  
  // Update UI to show/hide host controls
  if (data.newHostId === myUserId) {
    showHostControls();
    showNotification('You are now the host!');
  } else if (data.previousHostId === myUserId) {
    hideHostControls();
  }
  
  // Update host badge in participants list
  updateHostBadge(data.newHostId);
});

// You were kicked from the call by the host
socket.on('call:youWereKicked', (data) => {
  console.log('You were kicked from the call');
  // {
  //   callId: 'call-uuid',
  //   kickedBy: 'host-uuid'
  // }
  
  // Leave Agora channel immediately
  await leaveAgoraChannel();
  
  // Show notification
  showNotification('You have been removed from the call by the host');
  
  // Close call UI
  closeCallUI();
});

// Someone was kicked from the call
socket.on('call:participantKicked', (data) => {
  console.log(`User ${data.userId} was kicked by host`);
  // {
  //   callId: 'call-uuid',
  //   userId: 'kicked-user-uuid',
  //   kickedBy: 'host-uuid'
  // }
  
  // Remove user from participants list UI
  removeParticipantFromUI(data.userId);
});
```

### Complete Mute Flow Example

```javascript
// State
let isMuted = false;
let isHost = false;
let currentCallId = null;

// Join group call and check if host
socket.emit('call:joinGroup', { callId }, async (res) => {
  if (res.success) {
    currentCallId = callId;
    isHost = res.hostId === myUserId;
    
    // Show/hide host controls based on role
    if (isHost) {
      document.getElementById('hostControls').style.display = 'block';
    }
    
    // Render participants with mute status
    renderParticipants(res.participantDetails, res.hostId);
    
    await joinAgoraChannel(res.agoraAppId, res.channelName, res.agoraToken, res.uid);
  }
});

// Mute button click handler
function toggleMute() {
  const newMuteState = !isMuted;
  
  socket.emit('call:toggleMute', {
    callId: currentCallId,
    isMuted: newMuteState
  }, (res) => {
    if (res.success) {
      isMuted = newMuteState;
      localAudioTrack.setEnabled(!isMuted);
      updateMuteButtonUI(isMuted);
    }
  });
}

// Host mute button (shown next to each participant)
function hostMuteUser(targetUserId) {
  if (!isHost) return;
  
  socket.emit('call:hostMute', {
    callId: currentCallId,
    targetUserId
  }, (res) => {
    if (res.error) {
      showError(res.error);
    }
  });
}

// Handle being muted by host
socket.on('call:youWereMuted', () => {
  isMuted = true;
  localAudioTrack.setEnabled(false);
  updateMuteButtonUI(true);
  showToast('The host muted you');
});
```

---

## Agora Integration

### Setup

```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

let agoraClient = null;
let localAudioTrack = null;

// Create client once
agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
```

### Join Channel

```javascript
async function joinAgoraChannel(appId, channel, token, uid) {
  try {
    // Subscribe to remote users
    agoraClient.on('user-published', async (user, mediaType) => {
      await agoraClient.subscribe(user, mediaType);
      
      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack;
        remoteAudioTrack.play();  // Auto-plays audio
      }
    });

    agoraClient.on('user-unpublished', (user, mediaType) => {
      console.log('User unpublished:', user.uid, mediaType);
    });

    agoraClient.on('user-left', (user) => {
      console.log('User left Agora channel:', user.uid);
    });

    // Join the channel
    await agoraClient.join(appId, channel, token, uid);

    // Create and publish local audio track
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await agoraClient.publish([localAudioTrack]);

    console.log('Joined Agora channel successfully');
  } catch (error) {
    console.error('Failed to join Agora channel:', error);
    throw error;
  }
}
```

### Leave Channel

```javascript
async function leaveAgoraChannel() {
  try {
    // Close local track
    if (localAudioTrack) {
      localAudioTrack.close();
      localAudioTrack = null;
    }

    // Leave channel
    if (agoraClient) {
      await agoraClient.leave();
    }

    console.log('Left Agora channel');
  } catch (error) {
    console.error('Error leaving Agora channel:', error);
  }
}
```

### Mute/Unmute

```javascript
// Mute microphone
async function muteMicrophone() {
  if (localAudioTrack) {
    await localAudioTrack.setEnabled(false);
  }
}

// Unmute microphone
async function unmuteMicrophone() {
  if (localAudioTrack) {
    await localAudioTrack.setEnabled(true);
  }
}
```

---

## REST API Endpoints

### Get Public Rooms

```http
GET /chat/rooms/public
Authorization: Bearer <token>
```

**Response:**
```json
{
  "rooms": [
    {
      "id": "room-uuid",
      "name": "General Chat",
      "memberCount": 15,
      "createdAt": "2025-12-01T00:00:00.000Z"
    }
  ]
}
```

### Get My Rooms (REST)

```http
GET /chat/rooms
Authorization: Bearer <token>
```

### Get Call History

```http
GET /call/history?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "calls": [
    {
      "id": "call-uuid",
      "callerId": "user-uuid",
      "receiverId": "other-user-uuid",
      "callType": "DIRECT",
      "callStatus": "ENDED",
      "endReason": "COMPLETED",
      "startedAt": "2025-12-10T10:00:00.000Z",
      "endedAt": "2025-12-10T10:05:30.000Z",
      "participants": ["user-uuid", "other-user-uuid"]
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

### Get Agora Config

```http
GET /call/config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "agoraAppId": "your-agora-app-id"
}
```

### Presence API

```http
# Mark yourself as online
POST /presence/online
Authorization: Bearer <token>

# Mark yourself as offline
POST /presence/offline
Authorization: Bearer <token>

# Get online users
GET /presence/active
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "user-uuid",
        "lastActiveAt": "2025-12-10T10:00:00.000Z",
        "status": "online"
      }
    ],
    "total": 5
  }
}
```

---

## Error Handling

### Socket Response Format

All socket callbacks follow this pattern:

```javascript
// Success
{
  success: true,
  // ... additional data
}

// Error
{
  error: "Error message here"
}
```

### Common Errors

| Error | Meaning |
|-------|---------|
| `Not authenticated` | Socket not properly connected with token |
| `User is offline` | Cannot call - receiver not connected |
| `User is busy in another call` | Receiver is on another call |
| `You are already in a call` | You must end current call first |
| `Call not found` | Invalid callId |
| `Call is not ringing` | Cannot accept - call already answered/ended |
| `Not a member of this room` | Cannot access this room |

### Reconnection Handling

```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, need to reconnect manually
    socket.connect();
  }
  // Otherwise socket.io will auto-reconnect
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Maybe token expired - redirect to login
});
```

---

## TypeScript Interfaces

```typescript
// User
interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  profile?: {
    fullName: string;
    profilePicture?: string;
  };
}

// Message
interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  roomId?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  isRead: boolean;
  createdAt: string;
}

// Room
interface ChatRoom {
  id: string;
  name: string;
  creatorId: string;
  members: User[];
  isActive: boolean;
  createdAt: string;
}

// Participant Info (for group calls)
interface ParticipantInfo {
  userId: string;
  isMuted: boolean;
  joinedAt: string;
  isHost?: boolean;       // Added by getParticipants
  userInfo?: UserInfo;    // Added by getParticipants
}

// Call Session
interface CallSession {
  id: string;
  callerId: string;
  receiverId: string;
  roomId?: string;
  hostId?: string;        // Host of group call
  callType: 'DIRECT' | 'GROUP';
  callStatus: 'RINGING' | 'ONGOING' | 'ENDED';
  endReason?: 'COMPLETED' | 'MISSED' | 'REJECTED' | 'CANCELLED';
  startedAt?: string;
  endedAt?: string;
  participants: string[];
  participantDetails?: ParticipantInfo[];
  createdAt: string;
}

// Incoming Call Event
interface IncomingCallEvent {
  callId: string;
  callerId: string;
  callerInfo: {
    id: string;
    email: string;
    profile?: {
      fullName: string;
      profilePicture?: string;
    };
  };
  isGroupCall: boolean;
  roomId?: string;
}

// Call Initiate Response
interface CallInitiateResponse {
  success: boolean;
  callId: string;
  agoraToken: string;
  agoraAppId: string;
  channelName: string;
  uid: number;
  hostId?: string;        // For group calls
  isHost?: boolean;       // For group calls
}

// Join Group Call Response
interface JoinGroupCallResponse {
  success: boolean;
  agoraToken: string;
  agoraAppId: string;
  channelName: string;
  uid: number;
  participants: string[];
  hostId: string;
  participantDetails: ParticipantInfo[];
}

// Mute Events
interface ParticipantMutedEvent {
  callId: string;
  userId: string;
  isMuted: boolean;
  mutedBy: string;  // Same as userId if self-muted
}

interface YouWereMutedEvent {
  callId: string;
  mutedBy: string;
}

interface HostChangedEvent {
  callId: string;
  previousHostId: string;
  newHostId: string;
}
```

---

## Quick Reference - Event Names

### Emit Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:sendDirect` | `{ receiverId, content, type? }` | Send DM |
| `chat:sendRoom` | `{ roomId, content, type? }` | Send room message |
| `chat:getDirectHistory` | `{ otherUserId, page?, limit? }` | Get DM history |
| `chat:getRoomHistory` | `{ roomId, page?, limit? }` | Get room history |
| `chat:createRoom` | `{ name, memberIds? }` | Create room |
| `chat:getMyRooms` | `{}` | Get my rooms |
| `chat:joinGroup` | `{ roomId }` | Join room |
| `chat:leaveRoom` | `{ roomId }` | Leave room |
| `chat:typing` | `{ receiverId/roomId, isTyping }` | Typing indicator |
| `call:initiate` | `{ receiverId }` | Start 1:1 call |
| `call:accept` | `{ callId }` | Accept call |
| `call:reject` | `{ callId }` | Reject call |
| `call:cancel` | `{ callId }` | Cancel outgoing call |
| `call:end` | `{ callId }` | End call |
| `call:initiateGroup` | `{ roomId }` | Start group call (you become host) |
| `call:joinGroup` | `{ callId }` | Join group call |
| `call:leaveGroup` | `{ callId }` | Leave group call |
| `call:toggleMute` | `{ callId, isMuted }` | Mute/unmute yourself |
| `call:hostMute` | `{ callId, targetUserId }` | Host mutes a participant |
| `call:kickParticipant` | `{ callId, targetUserId }` | Host removes a participant |
| `call:transferHost` | `{ callId, newHostId }` | Transfer host role |
| `call:getParticipants` | `{ callId }` | Get participants with status |

### Listen Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:connected` | `{ userId, roomCount }` | Connection confirmed |
| `chat:newMessage` | Message object | New DM received |
| `chat:roomMessage` | Message object | New room message |
| `chat:userTyping` | `{ userId, isTyping, roomId? }` | Typing status |
| `chat:addedToRoom` | `{ roomId, room }` | Added to room |
| `chat:removedFromRoom` | `{ roomId }` | Removed from room |
| `call:incoming` | IncomingCallEvent | Incoming call |
| `call:accepted` | `{ callId }` | Call accepted |
| `call:rejected` | `{ callId }` | Call rejected |
| `call:cancelled` | `{ callId }` | Call cancelled |
| `call:ended` | `{ callId, duration, endedBy }` | Call ended |
| `call:missed` | `{ callId }` | Call missed (timeout) |
| `call:userJoined` | `{ callId, userId, userInfo }` | User joined group call |
| `call:userLeft` | `{ callId, userId }` | User left group call |
| `call:participantMuted` | `{ callId, userId, isMuted, mutedBy }` | Someone's mute state changed |
| `call:youWereMuted` | `{ callId, mutedBy }` | Host muted you |
| `call:participantKicked` | `{ callId, userId, kickedBy }` | Someone was kicked |
| `call:youWereKicked` | `{ callId, kickedBy }` | Host kicked you |
| `call:hostChanged` | `{ callId, previousHostId, newHostId }` | Host role transferred |

---

## Example: Complete Call Flow

```javascript
// 1. Connect socket after login
const socket = io('/chat', { auth: { token } });

// 2. Listen for incoming calls
socket.on('call:incoming', (data) => {
  if (data.isGroupCall) {
    showGroupCallNotification(data);
  } else {
    showIncomingCallModal(data);
  }
});

// 3. Initiate a call
async function makeCall(userId) {
  socket.emit('call:initiate', { receiverId: userId }, async (res) => {
    if (res.success) {
      currentCallId = res.callId;
      await joinAgoraChannel(res.agoraAppId, res.channelName, res.agoraToken, res.uid);
      showCallingUI();
    } else {
      showError(res.error);
    }
  });
}

// 4. Handle call accepted
socket.on('call:accepted', () => {
  showInCallUI();
  startCallTimer();
});

// 5. End the call
async function endCall() {
  socket.emit('call:end', { callId: currentCallId }, async (res) => {
    await leaveAgoraChannel();
    showCallEndedUI(res.duration);
  });
}
```

---

## Support

For questions or issues, contact the backend team or check the test page at:
```
/test-chat-call.html
```

This HTML file demonstrates all features working together.
