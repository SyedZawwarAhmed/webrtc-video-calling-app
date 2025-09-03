export interface SignalingMessage {
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'error' | 'connection' | 'room-joined' | 'room-left';
  roomId?: string;
  userId?: string;
  data?: any;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface MediaDevices {
  video: boolean;
  audio: boolean;
}

export const CallState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
} as const;

export type CallState = typeof CallState[keyof typeof CallState];

export interface CallInfo {
  roomId: string;
  userId: string;
  isInitiator: boolean;
  callState: CallState;
  remoteUserId?: string;
}

export interface MediaStreamInfo {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  mediaDevices: MediaDevices;
}