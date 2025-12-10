# Chat & Calling - Frontend Quick Start

One-page cheat sheet for frontend integration.

---

## 1. Install Dependencies

```bash
npm install socket.io-client agora-rtc-sdk-ng
```

---

## 2. Connect Socket

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.yourapp.com/chat', {
  auth: { token: 'your-jwt-token' }
});

socket.on('chat:connected', (d) => console.log('Connected:', d.userId));
```

---

## 3. Send/Receive Messages

```javascript
// Send DM
socket.emit('chat:sendDirect', { receiverId: 'uuid', content: 'Hi!' }, cb);

// Receive
socket.on('chat:newMessage', (msg) => console.log(msg));
```

---

## 4. Make a Call

```javascript
socket.emit('call:initiate', { receiverId: 'uuid' }, async (res) => {
  if (res.success) {
    await joinAgora(res.agoraAppId, res.channelName, res.agoraToken, res.uid);
  }
});
```

---

## 5. Receive a Call

```javascript
socket.on('call:incoming', (data) => {
  // Show modal with Accept/Reject
  showIncomingCall(data.callerInfo);
});

// Accept
socket.emit('call:accept', { callId }, async (res) => {
  await joinAgora(res.agoraAppId, res.channelName, res.agoraToken, res.uid);
});

// Reject
socket.emit('call:reject', { callId }, () => {});
```

---

## 6. Agora Helper

```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
let localTrack = null;

async function joinAgora(appId, channel, token, uid) {
  client.on('user-published', async (user, type) => {
    await client.subscribe(user, type);
    if (type === 'audio') user.audioTrack.play();
  });
  
  await client.join(appId, channel, token, uid);
  localTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([localTrack]);
}

async function leaveAgora() {
  localTrack?.close();
  await client.leave();
}
```

---

## 7. End Call

```javascript
socket.emit('call:end', { callId }, async (res) => {
  await leaveAgora();
  console.log('Duration:', res.duration);
});
```

---

## Key Events Summary

| You Emit | Server Emits Back |
|----------|-------------------|
| `call:initiate` | → `call:incoming` to receiver |
| `call:accept` | → `call:accepted` to caller |
| `call:reject` | → `call:rejected` to caller |
| `call:cancel` | → `call:cancelled` to receiver |
| `call:end` | → `call:ended` to all |
| (30s timeout) | → `call:missed` to both |

---

## Common Errors

- `"User is offline"` - Can't call, user not connected
- `"User is busy in another call"` - Try later
- `"You are already in a call"` - End current call first

---

## Full Docs

See `FRONTEND_INTEGRATION_GUIDE.md` for complete documentation.
