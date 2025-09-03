export interface User {
  id: string;
  socketId: string;
  roomId?: string;
}

export interface Room {
  id: string;
  users: Set<string>;
  createdAt: Date;
}

export interface SignalingMessage {
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'error';
  roomId?: string;
  userId?: string;
  data?: any;
}

export interface WebRTCSignal {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface ICECandidate {
  candidate: string;
  sdpMLineIndex: number;
  sdpMid: string;
}