import React, { useRef, useEffect } from "react";
import { CallState } from "../types/webrtc";
import styles from "./VideoCall.module.css";

interface VideoCallProps {
  roomId: string;
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  error: string | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveRoom: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  callState,
  localStream,
  remoteStream,
  isAudioEnabled,
  isVideoEnabled,
  error,
  onToggleAudio,
  onToggleVideo,
  onLeaveRoom,
}) => {
  console.log(
    "\n\n ---> apps/frontend/src/components/VideoCall.tsx:29 -> remoteStream: ",
    remoteStream
  );
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Setup local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log(
        "🎥 Setting local video stream:",
        localStream.getTracks().length,
        "tracks"
      );
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Setup remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log(
        "📺 Setting remote video stream:",
        remoteStream.getTracks().length,
        "tracks"
      );
      remoteVideoRef.current.srcObject = remoteStream;

      // Force play if needed
      remoteVideoRef.current.play().catch((error) => {
        console.warn("Failed to auto-play remote video:", error);
      });
    }
  }, [remoteStream]);

  const getCallStatusClass = (state: CallState): string => {
    return `${styles.callStatus} ${styles[state]}`;
  };

  const renderVideoPlaceholder = (type: "local" | "remote") => (
    <div className={styles.videoPlaceholder}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      <span>
        {type === "local"
          ? callState === CallState.CONNECTING
            ? "Connecting..."
            : "No video"
          : "Waiting for participant..."}
      </span>
    </div>
  );

  return (
    <div className={styles.videoCallContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.roomInfo}>
          <span className={styles.roomId}>Room: {roomId}</span>
          <span className={getCallStatusClass(callState)}>
            {callState === CallState.CONNECTING && (
              <span className={styles.loadingSpinner}></span>
            )}
            {callState}
          </span>
        </div>
      </div>

      {/* Error display */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Video area */}
      <div
        className={`${styles.videoArea} ${remoteStream ? styles.dualVideo : ""}`}
      >
        {/* Local video */}
        <div className={`${styles.videoContainer} ${styles.local}`}>
          <div className={styles.videoLabel}>You</div>
          {localStream && isVideoEnabled ? (
            <video
              ref={localVideoRef}
              className={styles.video}
              autoPlay
              muted
              playsInline
            />
          ) : (
            renderVideoPlaceholder("local")
          )}
        </div>

        {/* Remote video */}
        {(remoteStream || callState === CallState.CONNECTING) && (
          <div className={`${styles.videoContainer} ${styles.remote}`}>
            <div className={styles.videoLabel}>Participant</div>
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                className={styles.video}
                autoPlay
                playsInline
              />
            ) : (
              renderVideoPlaceholder("remote")
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={`${styles.controlButton} ${styles.audio} ${!isAudioEnabled ? styles.muted : ""}`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isAudioEnabled ? (
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          ) : (
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1m0 0V7a3 3 0 013-3m3 3v2M9 9a3 3 0 012.12-2.88"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 9v3a3 3 0 01-3 3m-3-6V9a3 3 0 013-3m0 0a3 3 0 013 3m-3-3a1.5 1.5 0 00-1.5 1.5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3l18 18"
              />
            </svg>
          )}
        </button>

        <button
          className={`${styles.controlButton} ${styles.video} ${!isVideoEnabled ? styles.disabled : ""}`}
          onClick={onToggleVideo}
          title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoEnabled ? (
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          ) : (
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8v2a4 4 0 01-4 4H6"
              />
            </svg>
          )}
        </button>

        <button
          className={`${styles.controlButton} ${styles.hangup}`}
          onClick={onLeaveRoom}
          title="Leave room"
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width="20"
            height="20"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

