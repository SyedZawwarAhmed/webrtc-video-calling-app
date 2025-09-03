# WebRTC Video Calling App

A complete WebRTC-based video calling application built from scratch with a React frontend and Node.js signaling server.

## Features

- **Peer-to-peer video calling** using raw WebRTC APIs
- **Room-based calling** - create or join rooms with IDs
- **Media controls** - toggle camera and microphone
- **Real-time signaling** via WebSocket server
- **Responsive UI** - works on desktop and mobile
- **Permission management** - request camera/microphone access
- **Connection status** - visual feedback for call states
- **Error handling** - graceful error recovery

## Project Structure

```
webrtc-video-calling-app/
├── apps/
│   ├── frontend/           # React + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   ├── hooks/      # React hooks
│   │   │   ├── services/   # WebRTC and signaling services
│   │   │   └── types/      # TypeScript definitions
│   │   └── ...
│   └── signaling-server/   # Node.js WebSocket signaling server
│       ├── src/
│       │   ├── types.ts
│       │   ├── RoomManager.ts
│       │   ├── SignalingServer.ts
│       │   └── index.ts
│       └── ...
└── packages/               # Shared packages
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd webrtc-video-calling-app
   pnpm install
   ```

2. **Build all applications:**
   ```bash
   pnpm run build
   ```

### Running the Application

You need to run both the signaling server and the frontend:

#### Option 1: Run both together
```bash
pnpm run dev
```

#### Option 2: Run separately

**Terminal 1 - Signaling Server:**
```bash
pnpm run dev:signaling
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
pnpm run dev:frontend  
# Frontend runs on http://localhost:5173
```

### Production Deployment

1. **Build for production:**
   ```bash
   pnpm run build
   ```

2. **Start signaling server:**
   ```bash
   pnpm run start:signaling
   ```

3. **Deploy frontend:** The built frontend files are in `apps/frontend/dist/`

## How to Use

1. **Open the application** in your web browser at `http://localhost:5173`

2. **Grant permissions** for camera and microphone when prompted

3. **Create or join a room:**
   - Enter a room ID (e.g., "ABC123") or click "Generate" for a random ID
   - Share the room ID with another person
   - Click "Join Room"

4. **Video calling:**
   - When another user joins the same room, video calling will start automatically
   - Use the controls to toggle your camera/microphone
   - Click the red button to leave the room

## Architecture

### Frontend (React + TypeScript)
- **WebRTC Service**: Manages peer connections, media streams, and WebRTC signaling
- **Signaling Service**: WebSocket client for real-time communication with server
- **Media Hooks**: React hooks for device management and permissions
- **UI Components**: Video display, controls, and room joining interface

### Signaling Server (Node.js + WebSocket)
- **Room Management**: Handles user connections and room state
- **Message Routing**: Routes WebRTC signaling messages between peers
- **REST API**: Health check and statistics endpoints

### WebRTC Flow
1. User joins room → signaling server manages room state
2. When second user joins → server notifies first user
3. First user creates WebRTC offer → sent via signaling server
4. Second user creates answer → sent back via signaling server
5. ICE candidates exchanged → direct peer-to-peer connection established
6. Media streams flow directly between browsers (no server involvement)

## Configuration

### Environment Variables

**Signaling Server:**
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

**Frontend:**
The signaling server URL is configured in `SignalingService.ts` (default: ws://localhost:3001)

## Development Scripts

- `pnpm run dev` - Run both frontend and signaling server
- `pnpm run dev:frontend` - Run only frontend
- `pnpm run dev:signaling` - Run only signaling server
- `pnpm run build` - Build all applications
- `pnpm run lint` - Lint all code
- `pnpm run check-types` - TypeScript type checking

## Browser Compatibility

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

**Note:** HTTPS is required for WebRTC media access in production environments.

## Troubleshooting

### Common Issues

1. **Camera/microphone not working:**
   - Ensure browser permissions are granted
   - Check if devices are available and not used by other applications

2. **Connection fails:**
   - Verify signaling server is running
   - Check browser console for WebSocket connection errors
   - Ensure both users are using the same room ID

3. **Video not displaying:**
   - Check WebRTC connection status in browser developer tools
   - Verify STUN servers are accessible
   - Consider firewall/NAT traversal issues (may need TURN server for production)

### STUN/TURN Servers

The application uses Google's public STUN servers. For production use, consider:
- Setting up your own STUN/TURN servers
- Using commercial TURN services for better reliability
- Configuring TURN servers for users behind strict NATs/firewalls
