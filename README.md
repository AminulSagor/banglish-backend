# Banglish Backend API

A NestJS-based backend for a real-time chat and calling application with user authentication, profile management, and online presence tracking.

## Features

- 🔐 **Authentication** - JWT-based auth with Google/Facebook OAuth
- 👤 **User Profiles** - Complete profile management with language preferences
- 💬 **Real-time Chat** - Direct messages and group chat rooms
- 📞 **Voice/Video Calls** - 1:1 and group calls via Agora
- 🟢 **Online Presence** - Real-time user online status
- 💳 **Billing & Payments** - Call minutes tracking, purchasing, and admin controls
- 🛡️ **Security** - Helmet, rate limiting, input validation

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd banglish

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.development

# Edit .env.development with your database credentials
```

### Database Setup

```bash
# Run migrations
npm run migration:run

# Or use synchronize in development (auto-creates tables)
# Set NODE_ENV=development in .env.development
```

### Running the App

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Access Points

| URL | Description |
|-----|-------------|
| http://localhost:3000 | API Base URL |
| http://localhost:3000/api/docs | Swagger Documentation |
| http://localhost:3000/health | Health Check |

## API Documentation

### OpenAPI/Swagger

Interactive API documentation is available at `/api/docs` when the server is running.

### Authentication

All endpoints (except auth and health) require a JWT token:

```
Authorization: Bearer <your-jwt-token>
```

### REST Endpoints

#### Auth (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with credentials |
| POST | `/auth/refresh` | Refresh JWT tokens |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| GET | `/auth/google` | Google OAuth login |
| GET | `/auth/facebook` | Facebook OAuth login |
| GET | `/auth/profile` | Get current user profile |

#### Users (`/users`) - Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/users/me` | Get current user |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create user |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| PATCH | `/users/:id/activate` | Activate user |
| PATCH | `/users/:id/deactivate` | Deactivate user |

#### Profile (`/profile`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile/me` | Get my profile |
| PATCH | `/profile/me` | Update my profile |
| PATCH | `/profile/me/picture` | Update profile picture |
| GET | `/profile/languages` | List all languages |
| GET | `/profile/languages/stats` | Language statistics |
| GET | `/profile/users/by-language` | Find users by language |

#### Chat (`/chat`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/conversations` | Get DM conversations |
| GET | `/chat/direct/:userId` | Get messages with user |
| GET | `/chat/unread-count` | Get unread count |
| POST | `/chat/mark-read/:senderId` | Mark messages as read |
| GET | `/chat/rooms` | Get my rooms |
| GET | `/chat/rooms/public` | Get public rooms |
| POST | `/chat/rooms` | Create room |
| GET | `/chat/rooms/:roomId` | Get room details |
| GET | `/chat/rooms/:roomId/messages` | Get room messages |
| POST | `/chat/rooms/:roomId/join` | Join room |
| POST | `/chat/rooms/:roomId/leave` | Leave room |
| PATCH | `/chat/rooms/:roomId` | Update room (Admin) |
| DELETE | `/chat/rooms/:roomId` | Delete room (Creator) |
| POST | `/chat/rooms/:roomId/members` | Add member (Admin) |
| DELETE | `/chat/rooms/:roomId/members/:userId` | Remove member (Admin) |
| GET | `/chat/rooms/:roomId/admins` | Get room admins |
| POST | `/chat/rooms/:roomId/admins/:userId` | Make admin (Admin) |
| DELETE | `/chat/rooms/:roomId/admins/:userId` | Remove admin (Admin) |

#### Call (`/call`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/call/history` | Get call history |
| GET | `/call/config` | Get Agora config |

#### Presence (`/presence`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/presence/online` | Set online status |
| POST | `/presence/offline` | Set offline status |
| POST | `/presence/heartbeat` | Send heartbeat |
| GET | `/presence/config` | Get presence config |
| GET | `/presence/active` | Get online users |
| GET | `/presence/count` | Get online count |

#### Billing (`/billing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/billing/balance` | Get my minutes balance |
| GET | `/billing/pricing` | Get current pricing |
| GET | `/billing/transactions` | Get my transaction history |
| POST | `/billing/purchase` | Purchase call minutes |
| GET | `/billing/check-minutes` | Check if I have minutes |
| GET | `/billing/admin/config` | Get billing configs (Admin) |
| PATCH | `/billing/admin/config/free-minutes` | Set free minutes for new users (Admin) |
| PATCH | `/billing/admin/config/:key` | Set any config value (Admin) |
| GET | `/billing/admin/users/:userId/balance` | Get user balance (Admin) |
| PATCH | `/billing/admin/users/:userId/balance` | Adjust user balance (Admin) |
| GET | `/billing/admin/transactions` | Get all transactions (Admin) |
| GET | `/billing/admin/stats` | Get billing analytics (Admin) |
| POST | `/billing/webhook/stripe` | Stripe payment webhook |
| POST | `/billing/webhook/sslcommerz` | SSLCommerz payment webhook |

#### Health (`/health`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed health check |
| GET | `/health/ping` | Simple ping |

## WebSocket Events

### Chat Namespace (`/chat`)

Connect with JWT token:
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});
```

#### Client → Server Events
| Event | Payload | Description |
|-------|---------|-------------|
| `chat:sendDirect` | `{ receiverId, content, type? }` | Send DM |
| `chat:sendToRoom` | `{ roomId, content, type? }` | Send room message |
| `chat:createRoom` | `{ name, memberIds?, description? }` | Create room |
| `chat:joinRoom` | `{ roomId }` | Join room |
| `chat:leaveRoom` | `{ roomId }` | Leave room |
| `chat:typing` | `{ roomId?, receiverId?, isTyping }` | Typing indicator |
| `chat:markRead` | `{ senderId?, roomId? }` | Mark as read |
| `call:initiate` | `{ receiverId }` | Start 1:1 call |
| `call:initiateGroup` | `{ roomId }` | Start group call |
| `call:accept` | `{ callId }` | Accept call |
| `call:reject` | `{ callId }` | Reject call |
| `call:end` | `{ callId }` | End call |
| `call:toggleMute` | `{ callId }` | Toggle self mute |
| `call:hostMute` | `{ callId, targetUserId }` | Host mute participant |
| `call:kickParticipant` | `{ callId, targetUserId }` | Kick from call |

#### Server → Client Events
| Event | Description |
|-------|-------------|
| `chat:connected` | Connection confirmed |
| `chat:newDirectMessage` | New DM received |
| `chat:newRoomMessage` | New room message |
| `chat:userTyping` | User typing status |
| `call:incoming` | Incoming call |
| `call:accepted` | Call accepted |
| `call:rejected` | Call rejected |
| `call:ended` | Call ended |
| `call:participantJoined` | Participant joined |
| `call:participantLeft` | Participant left |
| `call:muteChanged` | Mute status changed |

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_NAME=banglish

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d

# Agora (for calls)
AGORA_APPID=your-agora-app-id
AGORA_CIRTIFICATE=your-agora-certificate
```

## Billing & Monetization

The application includes a complete billing system for call minutes:

### How It Works

1. **New Users** get free call minutes (default: 30 min, configurable by admin)
2. **Balance Check** before each call - users cannot call without minutes
3. **Minute Deduction** after calls end (rounded up to nearest minute)
4. **Purchasing** additional minutes via Stripe, SSLCommerz, bKash, or Nagad

### User Features

- View current balance (free + paid minutes)
- View transaction history
- Purchase additional minutes
- Check minutes before calling

### Admin Features

- Set free minutes for new users
- Adjust any user's balance
- View all transactions
- Configure pricing (price per minute, minimum purchase)
- View billing analytics (total revenue, minutes sold/used)

### Payment Methods Supported

| Method | Description |
|--------|-------------|
| Stripe | International card payments |
| SSLCommerz | Bangladesh payment gateway |
| bKash | Mobile banking (Bangladesh) |
| Nagad | Mobile banking (Bangladesh) |

### Default Configuration

| Config | Default | Description |
|--------|---------|-------------|
| `free_minutes` | 30 | Free minutes for new users |
| `price_per_minute` | 2.00 | Price in BDT per minute |
| `min_purchase_minutes` | 10 | Minimum minutes to purchase |
| `currency` | BDT | Currency code |

## Project Structure

```
src/
├── auth/           # Authentication module
├── billing/        # Billing and payment module
├── call/           # Voice/video call module
├── chat/           # Chat and messaging module
├── common/         # Shared utilities
├── health/         # Health check endpoints
├── migrations/     # Database migrations
├── presence/       # Online presence module
├── profile/        # User profile module
└── users/          # User management module
```

## Scripts

```bash
npm run start:dev      # Start in development mode
npm run build          # Build for production
npm run start:prod     # Start production build
npm run migration:run  # Run database migrations
npm run migration:generate  # Generate new migration
npm run create:admin   # Create admin user
npm run test           # Run unit tests
npm run test:e2e       # Run e2e tests
```

## Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use `.env.production` with secure credentials
3. Run migrations: `npm run migration:run`
4. Build: `npm run build`
5. Start: `npm run start:prod`

### Health Checks

- **Liveness**: `GET /health/ping`
- **Readiness**: `GET /health`
- **Detailed**: `GET /health/detailed`

## License

UNLICENSED - Private
