// Simple WebRTC implementation in TypeScript
let ws: WebSocket | null = null;
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;

// Simple state
let roomId: string | null = null;
let isInitiator = false;
let userId: string | null = null;

// Callback types
type StreamCallback = (stream: MediaStream) => void;
type StateCallback = (state: string) => void;

// Callbacks
let onLocalStream: StreamCallback | null = null;
let onRemoteStream: StreamCallback | null = null;
let onConnectionState: StateCallback | null = null;

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Connect to signaling server
function connectSignaling(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket("ws://192.168.0.243:3001");

    ws.onopen = () => {
      console.log("📡 Connected to signaling server");
      resolve();
    };

    ws.onerror = reject;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("📨 Received:", message.type);
      handleSignalingMessage(message);
    };
  });
}

// Send signaling message
function sendMessage(message: any): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Handle signaling messages
function handleSignalingMessage(message: any): void {
  switch (message.type) {
    case "connection":
      console.log("✅ Connected with ID:", message.userId);
      userId = message.userId || null;
      break;

    case "room-joined":
      console.log("🏠 Joined room:", message.roomId);
      const existingUsers = message.data?.existingUsers || [];
      if (existingUsers.length > 0) {
        console.log(
          "👥 Found existing users - I joined second, so I will initiate"
        );
        if (!pc) {
          isInitiator = true;
          createPeerConnection();
          makeOffer();
        }
      } else {
        console.log("⏳ Waiting for other users");
        onConnectionState?.("waiting");
      }
      break;

    case "user-joined":
      console.log(
        "👤 New user joined - but I was here first, so I will NOT initiate"
      );
      // When someone joins me, I don't initiate - they should initiate since they joined second
      console.log("⏳ Waiting for the new user to send me an offer");
      isInitiator = false;
      break;

    case "offer":
      console.log("📩 Received offer from:", message.userId);
      console.log(
        "📩 Current state - isInitiator:",
        isInitiator,
        "pc exists:",
        !!pc
      );

      // Only handle offer if we should not be the initiator
      if (!pc) {
        console.log("✅ Creating peer connection to handle offer");
        isInitiator = false;
        createPeerConnection();
        handleOffer(message.data);
      } else {
        console.log("⏭️ Already have peer connection, ignoring offer");
      }
      break;

    case "answer":
      console.log("📨 Received answer from:", message.userId);
      console.log("📨 My role - isInitiator:", isInitiator);
      handleAnswer(message.data);
      break;

    case "ice-candidate":
      console.log("🧊 Received ICE candidate");
      handleIceCandidate(message.data);
      break;

    case "user-left":
      console.log("👋 User left");
      cleanup();
      onConnectionState?.("waiting");
      break;
  }
}

// Get user media
async function getUserMedia(): Promise<MediaStream> {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log(
      "🎥 Got local stream with",
      localStream.getTracks().length,
      "tracks"
    );
    console.log("📹 Video tracks:", localStream.getVideoTracks().length);
    console.log("🎤 Audio tracks:", localStream.getAudioTracks().length);

    if (onLocalStream) {
      console.log("📞 Calling onLocalStream callback");
      onLocalStream(localStream);
    } else {
      console.warn("⚠️ No onLocalStream callback set!");
    }

    return localStream;
  } catch (error) {
    console.error("❌ Error getting media:", error);
    throw error;
  }
}

// Create peer connection
function createPeerConnection(): void {
  pc = new RTCPeerConnection({ iceServers });

  // Add local stream
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc!.addTrack(track, localStream!);
    });
  }

  // Handle remote stream
  pc.ontrack = (event) => {
    console.log(
      "🎵 Got remote track:",
      event.track.kind,
      "enabled:",
      event.track.enabled
    );
    console.log("🎵 Event streams:", event.streams.length);

    if (event.streams && event.streams[0]) {
      console.log(
        "✅ Using stream from event with",
        event.streams[0].getTracks().length,
        "tracks"
      );
      remoteStream = event.streams[0];
      if (onRemoteStream) {
        console.log("📞 Calling onRemoteStream callback");
        onRemoteStream(remoteStream);
      }
      onConnectionState?.("connected");
    } else {
      console.log("🔧 Creating new stream from track");
      // Create a new stream with the track
      if (!remoteStream) {
        remoteStream = new MediaStream();
        console.log("📺 Created new MediaStream");
      }

      // Check if track already exists to avoid duplicates
      const existingTrack = remoteStream
        .getTracks()
        .find((t) => t.kind === event.track.kind);
      if (existingTrack) {
        console.log("🔄 Replacing existing", event.track.kind, "track");
        remoteStream.removeTrack(existingTrack);
      }

      remoteStream.addTrack(event.track);
      console.log(
        "📺 Remote stream now has",
        remoteStream.getTracks().length,
        "tracks"
      );

      if (onRemoteStream) {
        console.log("📞 Calling onRemoteStream callback");
        onRemoteStream(remoteStream);
      }
      onConnectionState?.("connected");
    }
  };

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendMessage({
        type: "ice-candidate",
        roomId: roomId,
        data: event.candidate,
      });
    }
  };

  // Handle connection state
  pc.onconnectionstatechange = () => {
    console.log("🔗 Connection state:", pc!.connectionState);
    if (pc!.connectionState === "connected") {
      onConnectionState?.("connected");
    } else if (pc!.connectionState === "failed") {
      onConnectionState?.("failed");
    }
  };
}

// Make offer
async function makeOffer(): Promise<void> {
  if (!pc) return;

  onConnectionState?.("connecting");
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  sendMessage({
    type: "offer",
    roomId: roomId,
    data: offer,
  });
}

// Handle offer
async function handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
  if (!pc) return;

  onConnectionState?.("connecting");
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  sendMessage({
    type: "answer",
    roomId: roomId,
    data: answer,
  });
}

// Handle answer
async function handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
  if (!pc) {
    console.error("❌ No peer connection for answer");
    return;
  }

  console.log("📝 Current signaling state:", pc.signalingState);

  if (pc.signalingState === "have-local-offer") {
    console.log("✅ Setting remote description (answer)");
    await pc.setRemoteDescription(answer);
  } else {
    console.error("❌ Wrong state for answer:", pc.signalingState);
  }
}

// Handle ICE candidate
async function handleIceCandidate(
  candidate: RTCIceCandidateInit
): Promise<void> {
  if (!pc) return;
  await pc.addIceCandidate(candidate);
}

// Join room
async function joinRoom(room: string): Promise<void> {
  roomId = room;
  await getUserMedia();
  await connectSignaling();

  sendMessage({
    type: "join-room",
    roomId: roomId,
  });
}

// Leave room
function leaveRoom(): void {
  sendMessage({
    type: "leave-room",
    roomId: roomId,
  });
  cleanup();
}

// Cleanup
function cleanup(): void {
  console.log("🧹 Cleaning up WebRTC resources");

  if (pc) {
    console.log("🔌 Closing peer connection");
    pc.close();
    pc = null;
  }

  if (localStream) {
    console.log("🎥 Stopping local stream tracks");
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  remoteStream = null;
  isInitiator = false;
  userId = null;

  console.log("✅ Cleanup completed");
}

// Toggle audio/video
function toggleAudio(): boolean {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
  }
  return false;
}

function toggleVideo(): boolean {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
  }
  return false;
}

// Set callbacks
function setCallbacks(callbacks: {
  onLocalStream?: StreamCallback;
  onRemoteStream?: StreamCallback;
  onConnectionState?: StateCallback;
}): void {
  onLocalStream = callbacks.onLocalStream || null;
  onRemoteStream = callbacks.onRemoteStream || null;
  onConnectionState = callbacks.onConnectionState || null;
}

// Export functions
export { joinRoom, leaveRoom, toggleAudio, toggleVideo, setCallbacks };

