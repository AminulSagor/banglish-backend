# WebRTC 1:1 Audio Call - Implementation Plan

## Overview

Free production-grade WebRTC audio calling for 1:1 chats using:
- **STUN**: Google (free forever)
- **TURN**: Self-hosted Coturn (free on Oracle Cloud)
- **Signaling**: Your existing NestJS server
- **No Redis**: Single server deployment

---

## Architecture

```
┌──────────────┐                              ┌──────────────┐
│   User A     │                              │   User B     │
│  (Caller)    │                              │  (Receiver)  │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │  1. call:initiate ──────────────────────────┤
       │                                             │
       │◄─────────────────────────── call:incoming   │
       │                                             │
       │  2. call:accept ───────────────────────────►│
       │                                             │
       │◄──────────────────────────── call:accepted  │
       │                                             │
       │  3. SDP Offer ─────────────────────────────►│
       │                                             │
       │◄────────────────────────────── SDP Answer   │
       │                                             │
       │  4. ICE Candidates ◄───────────────────────►│
       │                                             │
       │  ════════════ P2P Audio Stream ════════════ │
       │                                             │
       │  5. call:end ──────────────────────────────►│
       └─────────────────────────────────────────────┘
```

---

## Files to Create

```
src/call/
├── entities/
│   └── call-session.entity.ts    # Database table
├── dto/
│   └── call.dto.ts               # TypeScript interfaces
├── call.service.ts               # Business logic
├── call.gateway.ts               # WebRTC signaling (Socket.IO)
├── call.controller.ts            # REST API (call history)
└── call.module.ts                # Module config
```

---

## Step 1: Entity - `call-session.entity.ts`

### Purpose
Stores call history in database. Tracks who called whom, duration, and result.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `callerId` | UUID | Who initiated the call |
| `receiverId` | UUID | Who received the call |
| `status` | enum | `ringing`, `ongoing`, `ended` |
| `endReason` | enum | `completed`, `missed`, `rejected`, `cancelled`, `busy`, `failed` |
| `startedAt` | timestamp | When call was answered (null if never answered) |
| `endedAt` | timestamp | When call ended |
| `duration` | int | Call duration in seconds (calculated) |
| `createdAt` | timestamp | When call was initiated |

### Enums

```typescript
enum CallStatus {
  RINGING = 'ringing',    // Waiting for answer
  ONGOING = 'ongoing',    // Connected
  ENDED = 'ended',        // Finished
}

enum CallEndReason {
  COMPLETED = 'completed',  // Normal end
  MISSED = 'missed',        // No answer (30s timeout)
  REJECTED = 'rejected',    // Receiver declined
  CANCELLED = 'cancelled',  // Caller hung up before answer
  BUSY = 'busy',            // Receiver on another call
  FAILED = 'failed',        // Technical error
}
```

### Relationships
- `caller` → ManyToOne → User
- `receiver` → ManyToOne → User

---

## Step 2: DTOs - `call.dto.ts`

### Purpose
Define TypeScript interfaces for socket payloads.

### Interfaces

```typescript
// When starting a call
interface InitiateCallPayload {
  receiverId: string;
}

// For accept/reject/cancel/end
interface CallIdPayload {
  callId: string;
}

// SDP exchange (offer/answer)
interface SdpPayload {
  targetUserId: string;
  callId: string;
  sdp: {
    type: 'offer' | 'answer';
    sdp: string;
  };
}

// ICE candidate exchange
interface IceCandidatePayload {
  targetUserId: string;
  callId: string;
  candidate: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
  };
}
```

---

## Step 3: Service - `call.service.ts`

### Purpose
Business logic for call management.

### Properties (In-Memory)

```typescript
// Track active calls: userId → callId
private activeCalls = new Map<string, string>();

// Timeout handles: callId → NodeJS.Timeout
private callTimeouts = new Map<string, NodeJS.Timeout>();
```

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getIceServers()` | - | array | Returns free STUN + optional TURN servers |
| `isUserBusy(userId)` | string | boolean | Check if user is in a call |
| `getActiveCallId(userId)` | string | string? | Get user's current call ID |
| `initiateCall(callerId, receiverId)` | strings | CallSession | Create call, mark users busy |
| `acceptCall(callId, userId)` | strings | CallSession | Accept call, set `startedAt` |
| `rejectCall(callId, userId)` | strings | CallSession | Reject call, set `endReason=rejected` |
| `cancelCall(callId, userId)` | strings | CallSession | Cancel outgoing call |
| `endCall(callId, userId)` | strings | CallSession | End call, calculate duration |
| `missCall(callId)` | string | CallSession | Mark as missed (timeout) |
| `setCallTimeout(callId, callback, ms)` | - | void | Set 30s timeout |
| `clearCallTimeout(callId)` | string | void | Clear timeout |
| `getCallHistory(userId, page, limit)` | - | paginated | Get call history |

### ICE Servers (FREE)

```typescript
getIceServers() {
  return [
    // Free Google STUN (always works for ~80% of connections)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    // Self-hosted TURN (from .env, for restrictive NATs)
    // Only add if configured
  ];
}
```

### Business Rules

1. **User can only be in ONE call at a time**
2. **30-second timeout for unanswered calls** → becomes "missed"
3. **Duration calculated only if `startedAt` exists**
4. **Both users freed when call ends**

---

## Step 4: Gateway - `call.gateway.ts`

### Purpose
WebRTC signaling server using Socket.IO.

### Namespace
`/call` (separate from `/chat`)

### Properties

```typescript
// Track connected users: userId → socketId
private connectedUsers = new Map<string, string>();
```

### Connection Flow

1. Client connects with JWT in `auth.token`
2. Verify JWT, extract `userId`
3. Join personal room: `user:${userId}`
4. Send `call:connected` with ICE servers
5. On disconnect: end any active call

### Socket Events

#### Emit Events (Client → Server)

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `call:initiate` | `{receiverId}` | `{success, callId}` | Start a call |
| `call:accept` | `{callId}` | `{success}` | Accept incoming call |
| `call:reject` | `{callId}` | `{success}` | Reject incoming call |
| `call:cancel` | `{callId}` | `{success}` | Cancel outgoing call |
| `call:end` | `{callId}` | `{success, duration}` | End ongoing call |
| `call:offer` | `{targetUserId, callId, sdp}` | `{success}` | Send SDP offer |
| `call:answer` | `{targetUserId, callId, sdp}` | `{success}` | Send SDP answer |
| `call:iceCandidate` | `{targetUserId, callId, candidate}` | `{success}` | Send ICE candidate |

#### Listen Events (Server → Client)

| Event | Payload | When |
|-------|---------|------|
| `call:connected` | `{userId, iceServers}` | On connection |
| `call:incoming` | `{callId, callerId}` | Someone is calling you |
| `call:accepted` | `{callId}` | Your call was accepted |
| `call:rejected` | `{callId}` | Your call was rejected |
| `call:cancelled` | `{callId}` | Caller cancelled |
| `call:ended` | `{callId, duration}` | Call ended |
| `call:missed` | `{callId}` | No answer (30s) |
| `call:busy` | `{userId}` | User is in another call |
| `call:offer` | `{callId, fromUserId, sdp}` | Receive SDP offer |
| `call:answer` | `{callId, fromUserId, sdp}` | Receive SDP answer |
| `call:iceCandidate` | `{callId, fromUserId, candidate}` | Receive ICE candidate |
| `error` | `{message}` | Error occurred |

### Handler Logic

#### `call:initiate`
```
1. Validate receiverId exists
2. Check caller not busy → error
3. Check receiver not busy → emit call:busy
4. Check receiver online → error "User offline"
5. Create CallSession (status: ringing)
6. Mark both users busy
7. Emit call:incoming to receiver
8. Set 30s timeout → missCall if not answered
9. Return { success, callId }
```

#### `call:accept`
```
1. Validate call exists and user is receiver
2. Clear timeout
3. Update status → ongoing, set startedAt
4. Emit call:accepted to caller
5. Return { success }
```

#### WebRTC Signaling (`call:offer`, `call:answer`, `call:iceCandidate`)
```
Just relay the payload to targetUserId's room
No database interaction needed
```

---

## Step 5: Controller - `call.controller.ts`

### Purpose
REST API for call history.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/call/history` | Get paginated call history |
| `GET` | `/call/ice-servers` | Get ICE server config |

### Query Parameters
- `page` (default: 1)
- `limit` (default: 20)

---

## Step 6: Module - `call.module.ts`

### Imports
- `TypeOrmModule.forFeature([CallSession, User])`
- `JwtModule.registerAsync(...)` (same as ChatModule)

### Providers
- `CallGateway`
- `CallService`

### Controllers
- `CallController`

### Exports
- `CallService`

---

## Step 7: Register in AppModule

Add `CallModule` to imports array in `app.module.ts`.

---

## Step 8: Environment Variables

Add to `.env.development`:

```env
# Optional: Self-hosted TURN server (for production)
# Leave empty for development (STUN works 80% of time)
TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

---

## Call Flow Diagram

### Successful Call

```
Caller                    Server                    Receiver
  │                          │                          │
  │── call:initiate ────────►│                          │
  │                          │── call:incoming ────────►│
  │                          │                          │
  │                          │◄─── call:accept ─────────│
  │◄─── call:accepted ───────│                          │
  │                          │                          │
  │── call:offer ───────────►│── call:offer ───────────►│
  │                          │                          │
  │◄─── call:answer ─────────│◄─── call:answer ─────────│
  │                          │                          │
  │◄──── call:iceCandidate ──┼── call:iceCandidate ────►│
  │                          │                          │
  │════════════════ P2P Audio Stream ═══════════════════│
  │                          │                          │
  │── call:end ─────────────►│                          │
  │                          │── call:ended ───────────►│
  │                          │                          │
```

### Missed Call

```
Caller                    Server                    Receiver
  │                          │                          │
  │── call:initiate ────────►│                          │
  │                          │── call:incoming ────────►│
  │                          │                          │
  │          (30 seconds pass, no answer)               │
  │                          │                          │
  │◄─── call:missed ─────────│── call:missed ──────────►│
  │                          │                          │
```

### Rejected Call

```
Caller                    Server                    Receiver
  │                          │                          │
  │── call:initiate ────────►│                          │
  │                          │── call:incoming ────────►│
  │                          │                          │
  │                          │◄─── call:reject ─────────│
  │◄─── call:rejected ───────│                          │
  │                          │                          │
```

---

## Frontend Integration

### 1. Connect to `/call` Namespace

```javascript
const callSocket = io('http://localhost:3000/call', {
  auth: { token: jwtToken }
});

// Get ICE servers on connect
callSocket.on('call:connected', ({ iceServers }) => {
  // Store iceServers for RTCPeerConnection
});
```

### 2. Initiate Call (Caller)

```javascript
// Get microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Create peer connection with ICE servers
const pc = new RTCPeerConnection({ iceServers });

// Add audio track
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// Initiate call
callSocket.emit('call:initiate', { receiverId }, (response) => {
  if (response.success) {
    currentCallId = response.callId;
  }
});

// When accepted, create offer
callSocket.on('call:accepted', async ({ callId }) => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
  callSocket.emit('call:offer', {
    targetUserId: receiverId,
    callId,
    sdp: offer
  });
});

// Handle ICE candidates
pc.onicecandidate = (event) => {
  if (event.candidate) {
    callSocket.emit('call:iceCandidate', {
      targetUserId: receiverId,
      callId: currentCallId,
      candidate: event.candidate
    });
  }
};

// Receive answer
callSocket.on('call:answer', async ({ sdp }) => {
  await pc.setRemoteDescription(sdp);
});

// Receive ICE candidates
callSocket.on('call:iceCandidate', async ({ candidate }) => {
  await pc.addIceCandidate(candidate);
});
```

### 3. Receive Call (Receiver)

```javascript
callSocket.on('call:incoming', async ({ callId, callerId }) => {
  // Show incoming call UI
  currentCallId = callId;
  
  // If user accepts:
  callSocket.emit('call:accept', { callId });
});

callSocket.on('call:offer', async ({ sdp, fromUserId }) => {
  // Get microphone
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Create peer connection
  const pc = new RTCPeerConnection({ iceServers });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
  // Set offer as remote description
  await pc.setRemoteDescription(sdp);
  
  // Create answer
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  
  // Send answer
  callSocket.emit('call:answer', {
    targetUserId: fromUserId,
    callId: currentCallId,
    sdp: answer
  });
  
  // Handle remote audio
  pc.ontrack = (event) => {
    document.getElementById('remoteAudio').srcObject = event.streams[0];
  };
});
```

---

## Free TURN Server Setup (Production)

### Option: Oracle Cloud Always Free

1. Create Oracle Cloud account (always free tier)
2. Create VM.Standard.E2.1.Micro instance (Ubuntu)
3. Install Coturn:
   ```bash
   sudo apt install coturn
   ```
4. Configure `/etc/turnserver.conf`:
   ```ini
   listening-port=3478
   external-ip=YOUR_PUBLIC_IP
   user=myuser:mypassword
   realm=yourdomain.com
   ```
5. Start: `sudo systemctl start coturn`
6. Update `.env`:
   ```env
   TURN_URL=turn:YOUR_IP:3478
   TURN_USERNAME=myuser
   TURN_CREDENTIAL=mypassword
   ```

---

## Testing Checklist

### Setup
- [ ] CallModule registered in AppModule
- [ ] Database migrations run (call_sessions table)
- [ ] Server restarted

### Basic Flow
- [ ] Connect to `/call` namespace → receive `call:connected`
- [ ] Initiate call → receiver gets `call:incoming`
- [ ] Accept call → caller gets `call:accepted`
- [ ] Exchange offer/answer/ICE candidates
- [ ] Audio flows between peers
- [ ] End call → both get `call:ended` with duration

### Edge Cases
- [ ] Call offline user → error "User is offline"
- [ ] Call busy user → `call:busy` event
- [ ] No answer 30s → `call:missed` both parties
- [ ] Reject call → `call:rejected` to caller
- [ ] Cancel before answer → `call:cancelled` to receiver
- [ ] Disconnect during call → auto-end call

---

## Summary

| Component | Purpose |
|-----------|---------|
| **Entity** | Database schema for call history |
| **Service** | Business logic, state tracking, timeouts |
| **Gateway** | WebRTC signaling via Socket.IO |
| **Controller** | REST API for call history |
| **Module** | Wire everything together |

**Total Cost: $0** 🎉
