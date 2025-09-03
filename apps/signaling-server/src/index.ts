import express from 'express';
import cors from 'cors';
import http from 'http';
import { SignalingServer } from './SignalingServer.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Allow all origins for development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Stats endpoint
let signalingServer: SignalingServer;

app.get('/stats', (req, res) => {
  if (signalingServer) {
    res.json(signalingServer.getStats());
  } else {
    res.json({ error: 'Signaling server not initialized' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Initialize SignalingServer with WebSocket support
signalingServer = new SignalingServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📈 Stats: http://0.0.0.0:${PORT}/stats`);
  console.log(`🔌 WebSocket endpoint: ws://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down signaling server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n📴 Shutting down signaling server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});