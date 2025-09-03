import { SignalingService } from "./SignalingService";
import {
  CallState,
  type WebRTCConfig,
  type CallInfo,
  type MediaStreamInfo,
  type MediaDevices,
  type SignalingMessage,
} from "../types/webrtc";

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private signalingService: SignalingService;
  private callInfo: CallInfo | null = null;
  private mediaInfo: MediaStreamInfo = {
    localStream: null,
    remoteStream: null,
    mediaDevices: { video: true, audio: true },
  };

  private onCallStateChange?: (state: CallState) => void;
  private onRemoteStreamReceived?: (stream: MediaStream) => void;
  private onLocalStreamReceived?: (stream: MediaStream) => void;

  private readonly rtcConfig: WebRTCConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  constructor() {
    this.signalingService = new SignalingService();
    this.setupSignalingHandlers();
  }

  private setupSignalingHandlers(): void {
    this.signalingService.onMessage('connection', (message) => this.handleConnection(message));
    this.signalingService.onMessage('room-joined', (message) => this.handleRoomJoined(message));
    this.signalingService.onMessage('user-joined', (message) => this.handleUserJoined(message));
    this.signalingService.onMessage('user-left', (message) => this.handleUserLeft(message));
    this.signalingService.onMessage('offer', (message) => this.handleOffer(message));
    this.signalingService.onMessage('answer', (message) => this.handleAnswer(message));
    this.signalingService.onMessage('ice-candidate', (message) => this.handleIceCandidate(message));
    this.signalingService.onMessage('error', (message) => this.handleError(message));
  }

  async initializeMedia(
    mediaDevices: MediaDevices = { video: true, audio: true }
  ): Promise<MediaStream> {
    try {
      this.mediaInfo.mediaDevices = mediaDevices;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: mediaDevices.video,
        audio: mediaDevices.audio,
      });

      this.mediaInfo.localStream = stream;

      if (this.onLocalStreamReceived) {
        this.onLocalStreamReceived(stream);
      }

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      this.updateCallState(CallState.ERROR);
      throw error;
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    try {
      // Connect to signaling server
      await this.signalingService.connect();

      // Initialize call info
      this.callInfo = {
        roomId,
        userId: "",
        isInitiator: false,
        callState: CallState.CONNECTING,
      };

      this.updateCallState(CallState.CONNECTING);

      // Send join room message
      this.signalingService.sendMessage({
        type: "join-room",
        roomId,
      });
    } catch (error) {
      console.error("Error joining room:", error);
      this.updateCallState(CallState.ERROR);
      throw error;
    }
  }

  async leaveRoom(): Promise<void> {
    try {
      if (this.callInfo) {
        this.signalingService.sendMessage({
          type: "leave-room",
          roomId: this.callInfo.roomId,
        });
      }

      this.cleanup();
      this.updateCallState(CallState.DISCONNECTED);
    } catch (error) {
      console.error("Error leaving room:", error);
      this.cleanup();
    }
  }

  private async createPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    // Add local stream tracks
    if (this.mediaInfo.localStream) {
      this.mediaInfo.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.mediaInfo.localStream!);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log(
        "🎵 Received remote track:",
        event.track.kind,
        "enabled:",
        event.track.enabled
      );
      console.log("📺 Remote streams count:", event.streams.length);

      if (event.streams && event.streams[0]) {
        console.log(
          "✅ Setting remote stream with tracks:",
          event.streams[0].getTracks().length
        );
        this.mediaInfo.remoteStream = event.streams[0];
        if (this.onRemoteStreamReceived) {
          console.log("🔔 Calling remote stream callback");
          this.onRemoteStreamReceived(event.streams[0]);
        }
        this.updateCallState(CallState.CONNECTED);
      } else {
        console.warn(
          "⚠️ No streams received in ontrack event - creating stream from track"
        );
        // Modern browsers sometimes don't provide streams in the event
        // Create a new stream with the track
        if (event.track) {
          console.log("🔧 Creating stream from individual track");

          // Check if we already have a remote stream to add this track to
          if (this.mediaInfo.remoteStream) {
            console.log("📥 Adding track to existing remote stream");
            this.mediaInfo.remoteStream.addTrack(event.track);
          } else {
            console.log("🆕 Creating new remote stream with track");
            const stream = new MediaStream([event.track]);
            this.mediaInfo.remoteStream = stream;
            if (this.onRemoteStreamReceived) {
              this.onRemoteStreamReceived(stream);
            }
          }
          this.updateCallState(CallState.CONNECTED);
        }
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callInfo) {
        console.log("Sending ICE candidate:", event.candidate.type);
        this.signalingService.sendMessage({
          type: "ice-candidate",
          roomId: this.callInfo.roomId,
          data: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          },
        });
      } else if (!event.candidate) {
        console.log("ICE gathering completed");
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection!.connectionState);

      switch (this.peerConnection!.connectionState) {
        case "connected":
          this.updateCallState(CallState.CONNECTED);
          break;
        case "disconnected":
        case "failed":
          this.updateCallState(CallState.DISCONNECTED);
          break;
        case "connecting":
          this.updateCallState(CallState.CONNECTING);
          break;
      }
    };
  }

  private async handleConnection(message: SignalingMessage): Promise<void> {
    console.log("Connected to signaling server:", message.userId);
    if (this.callInfo) {
      this.callInfo.userId = message.userId || "";
    }
  }

  private async handleRoomJoined(message: SignalingMessage): Promise<void> {
    console.log("🏠 Successfully joined room:", message.roomId);
    if (this.callInfo) {
      this.callInfo.userId = message.userId || "";
    }

    // Check if there are existing users in the room
    const existingUsers = message.data?.existingUsers || [];
    console.log("👥 Existing users in room:", existingUsers.length);

    if (existingUsers.length > 0) {
      console.log("🚀 There are existing users - I will be the initiator");
      // Set the first existing user as remote user and initiate connection
      this.callInfo.remoteUserId = existingUsers[0];
      this.callInfo.isInitiator = true;

      // Create peer connection and make offer
      console.log("🔗 Creating peer connection as initiator (room-joined)");
      await this.createPeerConnection();
      console.log("📞 Making offer to existing user");
      await this.makeOffer();
    } else {
      console.log("⏳ No existing users - waiting for someone to join");
      // Update state to show we're in the room but waiting for participants
      // We'll stay in CONNECTING state and let the UI show "Waiting for participant"
      this.updateCallState(CallState.CONNECTING);
    }
  }

  private async handleUserJoined(message: SignalingMessage): Promise<void> {
    console.log("👤 User joined:", message.data?.newUserId);
    console.log("🚀 I will be the initiator (make offer)");

    if (!this.callInfo) {
      console.error("❌ No call info available when user joined");
      return;
    }

    this.callInfo.remoteUserId = message.data?.newUserId;
    this.callInfo.isInitiator = true;

    // Update state to show we're establishing connection
    this.updateCallState(CallState.CONNECTING);

    // Create peer connection and make offer
    console.log("🔗 Creating peer connection as initiator");
    await this.createPeerConnection();
    console.log("📞 Making offer");
    await this.makeOffer();
  }

  private async handleUserLeft(message: SignalingMessage): Promise<void> {
    console.log("User left:", message.data?.leftUserId);

    if (this.callInfo) {
      this.callInfo.remoteUserId = undefined;
    }

    this.updateCallState(CallState.DISCONNECTED);
    this.cleanup();
  }

  private async handleOffer(message: SignalingMessage): Promise<void> {
    console.log("📩 Received offer from:", message.userId);
    console.log("🎯 I will answer the offer (not initiator)");

    if (!this.callInfo) {
      console.error("❌ No call info available when handling offer");
      return;
    }

    this.callInfo.isInitiator = false;
    this.callInfo.remoteUserId = message.userId;

    // Update state to show we're establishing connection
    this.updateCallState(CallState.CONNECTING);

    console.log("🔗 Creating peer connection for offer handling");
    // Create peer connection and handle offer
    await this.createPeerConnection();

    console.log("📝 Setting remote description (offer)");
    await this.peerConnection!.setRemoteDescription(
      new RTCSessionDescription(message.data)
    );

    console.log("💬 Creating and setting answer");
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    console.log("📤 Sending answer");
    this.signalingService.sendMessage({
      type: "answer",
      roomId: this.callInfo.roomId,
      data: answer,
    });
  }

  private async handleAnswer(message: SignalingMessage): Promise<void> {
    console.log("📨 Received answer from:", message.userId);

    if (this.peerConnection) {
      console.log("📝 Setting remote description (answer)");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.data)
      );
      console.log(
        "✅ Answer processed successfully - WebRTC should connect now"
      );
    } else {
      console.error("❌ No peer connection available when handling answer");
    }
  }

  private async handleIceCandidate(message: SignalingMessage): Promise<void> {
    console.log("Received ICE candidate from:", message.userId);

    if (this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(message.data)
        );
        console.log("ICE candidate added successfully");
      } catch (error) {
        console.error("Failed to add ICE candidate:", error);
      }
    } else {
      console.error("No peer connection available when handling ICE candidate");
    }
  }

  private handleError(message: SignalingMessage): void {
    console.error("Signaling error:", message.data?.error);
    this.updateCallState(CallState.ERROR);
  }

  private async makeOffer(): Promise<void> {
    if (!this.peerConnection || !this.callInfo) {
      console.error("Cannot make offer: missing peer connection or call info");
      return;
    }

    console.log("Creating and sending offer");
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    console.log("Sending offer to room:", this.callInfo.roomId);
    this.signalingService.sendMessage({
      type: "offer",
      roomId: this.callInfo.roomId,
      data: offer,
    });
  }

  private updateCallState(state: CallState): void {
    if (this.callInfo) {
      this.callInfo.callState = state;
    }

    if (this.onCallStateChange) {
      this.onCallStateChange(state);
    }
  }

  private cleanup(): void {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.mediaInfo.localStream) {
      this.mediaInfo.localStream.getTracks().forEach((track) => track.stop());
      this.mediaInfo.localStream = null;
    }

    // Clear remote stream
    this.mediaInfo.remoteStream = null;

    // Disconnect signaling
    this.signalingService.disconnect();

    // Clear call info
    this.callInfo = null;
  }

  // Public getters and setters
  getCallInfo(): CallInfo | null {
    return this.callInfo;
  }

  getMediaInfo(): MediaStreamInfo {
    return this.mediaInfo;
  }

  setCallStateChangeCallback(callback: (state: CallState) => void): void {
    this.onCallStateChange = callback;
  }

  setRemoteStreamCallback(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamReceived = callback;
  }

  setLocalStreamCallback(callback: (stream: MediaStream) => void): void {
    this.onLocalStreamReceived = callback;
  }

  // Media controls
  toggleAudio(): void {
    if (this.mediaInfo.localStream) {
      const audioTrack = this.mediaInfo.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }

  toggleVideo(): void {
    if (this.mediaInfo.localStream) {
      const videoTrack = this.mediaInfo.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }

  isAudioEnabled(): boolean {
    if (this.mediaInfo.localStream) {
      const audioTrack = this.mediaInfo.localStream.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    }
    return false;
  }

  isVideoEnabled(): boolean {
    if (this.mediaInfo.localStream) {
      const videoTrack = this.mediaInfo.localStream.getVideoTracks()[0];
      return videoTrack ? videoTrack.enabled : false;
    }
    return false;
  }
}

