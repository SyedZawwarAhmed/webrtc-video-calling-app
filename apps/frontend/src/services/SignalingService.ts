import { type SignalingMessage } from "../types/webrtc";

export class SignalingService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (message: SignalingMessage) => void> =
    new Map();
  private connectionPromise: Promise<void> | null = null;
  private isConnected = false;
  private serverUrl: string;

  constructor(serverUrl?: string) {
    // Auto-detect protocol and use same host as frontend
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '3001';
    
    this.serverUrl = serverUrl || `${protocol}//${host}:${port}`;
    console.log('Signaling server URL:', this.serverUrl);
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log("Connected to signaling server");
          this.isConnected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing signaling message:", error);
          }
        };

        this.ws.onclose = () => {
          console.log("Disconnected from signaling server");
          this.isConnected = false;
          this.connectionPromise = null;
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          this.connectionPromise = null;
          reject(error);
        };
      } catch (error) {
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.connectionPromise = null;
    this.messageHandlers.clear();
  }

  sendMessage(message: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
      throw new Error("WebSocket is not connected");
    }
  }

  onMessage(type: string, handler: (message: SignalingMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  private handleMessage(message: SignalingMessage): void {
    const handler = this.messageHandlers.get(message.type);
    console.log(
      "\n\n ---> apps/frontend/src/services/SignalingService.ts:88 -> this.messageHandlers: ",
      this.messageHandlers
    );
    if (handler) {
      handler(message);
    } else {
      console.log("Unhandled message type:", message.type, message);
    }
  }

  isConnectedToServer(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}
