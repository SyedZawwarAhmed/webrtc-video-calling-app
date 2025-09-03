import { useState, useEffect, useCallback, useRef } from "react";
import { WebRTCService } from "../services/WebRTCService";
import { CallState, type CallInfo, type MediaDevices } from "../types/webrtc";

interface WebRTCHook {
  webrtcService: WebRTCService;
  callState: CallState;
  callInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  error: string | null;
  joinRoom: (roomId: string, mediaDevices?: MediaDevices) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

export const useWebRTC = (): WebRTCHook => {
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const [callState, setCallState] = useState<CallState>(CallState.IDLE);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!webrtcServiceRef.current) {
      webrtcServiceRef.current = new WebRTCService();

      // Set up callbacks
      webrtcServiceRef.current.setCallStateChangeCallback(
        (state: CallState) => {
          setCallState(state);
          if (state === CallState.ERROR) {
            setError("Call failed - please try again");
          } else {
            setError(null);
          }
        }
      );

      webrtcServiceRef.current.setLocalStreamCallback((stream: MediaStream) => {
        console.log(
          "\n\n ---> apps/frontend/src/hooks/useWebRTC.ts:47 -> stream: ",
          stream
        );
        setLocalStream(stream);
        // Update audio/video enabled state based on tracks
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        setIsAudioEnabled(audioTrack ? audioTrack.enabled : false);
        setIsVideoEnabled(videoTrack ? videoTrack.enabled : false);
      });

      webrtcServiceRef.current.setRemoteStreamCallback(
        (stream: MediaStream) => {
          console.log(
            "\n\n ---> apps/frontend/src/hooks/useWebRTC.ts:57 -> stream: ",
            stream
          );
          setRemoteStream(stream);
        }
      );
    }

    return () => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.leaveRoom();
      }
    };
  }, []);

  // Update call info when call state changes
  useEffect(() => {
    if (webrtcServiceRef.current) {
      setCallInfo(webrtcServiceRef.current.getCallInfo());
    }
  }, [callState]);

  const joinRoom = async (
    roomId: string,
    mediaDevices: MediaDevices = { video: true, audio: true }
  ): Promise<void> => {
    try {
      setError(null);

      if (!webrtcServiceRef.current) {
        throw new Error("WebRTC service not initialized");
      }

      // Initialize media first
      await webrtcServiceRef.current.initializeMedia(mediaDevices);

      // Join the room
      await webrtcServiceRef.current.joinRoom(roomId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to join room";
      setError(errorMessage);
      setCallState(CallState.ERROR);
      console.error("Error joining room:", err);
      throw err;
    }
  };

  const leaveRoom = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.leaveRoom();
      }

      // Reset state
      setLocalStream(null);
      setRemoteStream(null);
      setCallInfo(null);
      setCallState(CallState.IDLE);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to leave room";
      setError(errorMessage);
      console.error("Error leaving room:", err);
    }
  }, []);

  const toggleAudio = useCallback((): void => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.toggleAudio();
      setIsAudioEnabled(webrtcServiceRef.current.isAudioEnabled());
    }
  }, []);

  const toggleVideo = useCallback((): void => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.toggleVideo();
      setIsVideoEnabled(webrtcServiceRef.current.isVideoEnabled());
    }
  }, []);

  return {
    webrtcService: webrtcServiceRef.current!,
    callState,
    callInfo,
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  };
};

