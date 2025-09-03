import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from './RoomManager.js';
import { SignalingMessage } from './types.js';

export class SignalingServer {
  private wss: WebSocket.Server;
  private roomManager: RoomManager;
  private clients: Map<string, WebSocket> = new Map();

  constructor(server: any) {
    this.wss = new WebSocket.Server({ server });
    this.roomManager = new RoomManager();
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);

      console.log(`🔌 Client connected: ${clientId}`);

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          console.log(`📨 Message from ${clientId}:`, message.type, message.roomId ? `(room: ${message.roomId})` : '');
          this.handleMessage(clientId, ws, message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Client disconnected: ${clientId}`);
        this.handleClientDisconnect(clientId);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send connection confirmation
      console.log(`✅ Sending connection confirmation to ${clientId}`);
      this.sendMessage(ws, {
        type: 'connection',
        userId: clientId,
        data: { message: 'Connected to signaling server' }
      });
    });
  }

  private handleMessage(clientId: string, ws: WebSocket, message: SignalingMessage): void {
    switch (message.type) {
      case 'join-room':
        this.handleJoinRoom(clientId, ws, message);
        break;
      
      case 'leave-room':
        this.handleLeaveRoom(clientId, ws);
        break;
      
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.handleWebRTCSignaling(clientId, message);
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private handleJoinRoom(clientId: string, ws: WebSocket, message: SignalingMessage): void {
    if (!message.roomId) {
      this.sendError(ws, 'Room ID is required');
      return;
    }

    const result = this.roomManager.joinRoom(clientId, clientId, message.roomId);
    
    if (!result.success) {
      this.sendError(ws, result.error || 'Failed to join room');
      return;
    }

    // Get other users before notifying them
    const otherUsers = this.roomManager.getUsersInRoom(message.roomId)
      .filter(user => user.id !== clientId);

    // Notify the user they joined successfully with existing users info
    this.sendMessage(ws, {
      type: 'room-joined',
      roomId: message.roomId,
      userId: clientId,
      data: { 
        message: 'Successfully joined room',
        existingUsers: otherUsers.map(user => user.id)
      }
    });

    // Notify other users in the room
    otherUsers.forEach(user => {
      const userWs = this.clients.get(user.id);
      if (userWs && userWs.readyState === WebSocket.OPEN) {
        this.sendMessage(userWs, {
          type: 'user-joined',
          roomId: message.roomId,
          userId: clientId,
          data: { newUserId: clientId }
        });
      }
    });

    console.log(`👥 User ${clientId} joined room ${message.roomId}. Other users: ${otherUsers.length}`);
  }

  private handleLeaveRoom(clientId: string, ws: WebSocket): void {
    const result = this.roomManager.leaveRoom(clientId);
    
    if (result.success && result.roomId) {
      // Notify other users in the room
      const remainingUsers = this.roomManager.getUsersInRoom(result.roomId);
      
      remainingUsers.forEach(user => {
        const userWs = this.clients.get(user.id);
        if (userWs && userWs.readyState === WebSocket.OPEN) {
          this.sendMessage(userWs, {
            type: 'user-left',
            roomId: result.roomId,
            userId: clientId,
            data: { leftUserId: clientId }
          });
        }
      });

      console.log(`User ${clientId} left room ${result.roomId}`);
    }

    this.sendMessage(ws, {
      type: 'room-left',
      data: { message: 'Left room successfully' }
    });
  }

  private handleWebRTCSignaling(clientId: string, message: SignalingMessage): void {
    if (!message.roomId) {
      const senderWs = this.clients.get(clientId);
      if (senderWs) {
        this.sendError(senderWs, 'Room ID is required for WebRTC signaling');
      }
      return;
    }

    // Forward the signaling message to other users in the room
    const usersInRoom = this.roomManager.getUsersInRoom(message.roomId);
    const otherUsers = usersInRoom.filter(user => user.id !== clientId);

    console.log(`🔄 Forwarding ${message.type} from ${clientId} to ${otherUsers.length} users in room ${message.roomId}`);

    otherUsers.forEach(user => {
      const userWs = this.clients.get(user.id);
      if (userWs && userWs.readyState === WebSocket.OPEN) {
        console.log(`   → Sending ${message.type} to ${user.id}`);
        this.sendMessage(userWs, {
          type: message.type,
          roomId: message.roomId,
          userId: clientId,
          data: message.data
        });
      } else {
        console.warn(`   ⚠️ Cannot send to ${user.id}: WebSocket not open`);
      }
    });
  }

  private handleClientDisconnect(clientId: string): void {
    // Clean up user from rooms when they disconnect
    this.handleLeaveRoom(clientId, this.clients.get(clientId)!);
  }

  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { error }
    });
  }

  public getStats(): any {
    const roomStats = this.roomManager.getRoomStats();
    return {
      ...roomStats,
      connectedClients: this.clients.size
    };
  }
}