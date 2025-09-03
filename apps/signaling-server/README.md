# WebRTC Signaling Server

A Node.js WebSocket-based signaling server for WebRTC video calling applications.

## Features

- Room-based WebRTC signaling
- Real-time user management
- ICE candidate exchange
- Offer/Answer SDP exchange
- Connection status monitoring
- Health check and stats endpoints

## Development

Install dependencies and start the development server:

```bash
# From the root directory
pnpm install
pnpm run dev:signaling

# Or from this directory
pnpm install
pnpm run dev
```

## Production

Build and start the production server:

```bash
pnpm run build
pnpm run start
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /stats` - Server statistics (rooms, users, connections)
- `WS /` - WebSocket endpoint for signaling

## WebSocket Messages

### Client to Server

#### Join Room
```json
{
  "type": "join-room",
  "roomId": "ROOM123"
}
```

#### Leave Room
```json
{
  "type": "leave-room"
}
```

#### WebRTC Offer
```json
{
  "type": "offer",
  "roomId": "ROOM123",
  "data": {
    "type": "offer",
    "sdp": "..."
  }
}
```

#### WebRTC Answer
```json
{
  "type": "answer",
  "roomId": "ROOM123",
  "data": {
    "type": "answer",
    "sdp": "..."
  }
}
```

#### ICE Candidate
```json
{
  "type": "ice-candidate",
  "roomId": "ROOM123",
  "data": {
    "candidate": "...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

### Server to Client

#### Connection Confirmation
```json
{
  "type": "connection",
  "userId": "user-uuid",
  "data": {
    "message": "Connected to signaling server"
  }
}
```

#### Room Joined
```json
{
  "type": "room-joined",
  "roomId": "ROOM123",
  "userId": "user-uuid",
  "data": {
    "message": "Successfully joined room"
  }
}
```

#### User Joined
```json
{
  "type": "user-joined",
  "roomId": "ROOM123",
  "userId": "other-user-uuid",
  "data": {
    "newUserId": "other-user-uuid"
  }
}
```

#### User Left
```json
{
  "type": "user-left",
  "roomId": "ROOM123",
  "userId": "other-user-uuid",
  "data": {
    "leftUserId": "other-user-uuid"
  }
}
```

#### Error
```json
{
  "type": "error",
  "data": {
    "error": "Error message"
  }
}
```

## Configuration

Environment variables:

- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## Architecture

The signaling server consists of:

- `SignalingServer` - Main WebSocket server handling connections and message routing
- `RoomManager` - Manages rooms and user state
- Express server - HTTP endpoints for health checks and stats
- WebSocket server - Real-time signaling message exchange