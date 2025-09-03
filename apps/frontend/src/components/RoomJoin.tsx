import React, { useState } from 'react';
import { type MediaDevices } from '../types/webrtc';
import { useMediaDevices } from '../hooks/useMediaDevices';
import styles from './RoomJoin.module.css';

interface RoomJoinProps {
  onJoinRoom: (roomId: string, mediaDevices: MediaDevices) => Promise<void>;
  isJoining: boolean;
  error: string | null;
}

export const RoomJoin: React.FC<RoomJoinProps> = ({
  onJoinRoom,
  isJoining,
  error
}) => {
  const [roomId, setRoomId] = useState('');
  const [mediaDevices, setMediaDevices] = useState<MediaDevices>({
    video: true,
    audio: true
  });

  const {
    availableDevices,
    hasPermissions,
    isLoading: mediaLoading,
    error: mediaError,
    requestPermissions
  } = useMediaDevices();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomId.trim()) {
      return;
    }

    try {
      await onJoinRoom(roomId.trim(), mediaDevices);
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  const handleMediaDeviceChange = (type: 'video' | 'audio', enabled: boolean) => {
    setMediaDevices(prev => ({
      ...prev,
      [type]: enabled
    }));
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  const needsPermissions = (mediaDevices.video && !hasPermissions.video) || 
                          (mediaDevices.audio && !hasPermissions.audio);

  return (
    <div className={styles.joinContainer}>
      <div className={styles.joinCard}>
        <h1 className={styles.title}>WebRTC Video Call</h1>
        <p className={styles.subtitle}>
          Enter a room ID to start or join a video call
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="roomId" className={styles.label}>
              Room ID
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter room ID (e.g., ABC123)"
                className={styles.input}
                maxLength={10}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={generateRoomId}
                className={styles.permissionButton}
                style={{ padding: '0.875rem 1rem' }}
              >
                Generate
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Media Settings</label>
            <div className={styles.mediaOptions}>
              <label className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={mediaDevices.video}
                  onChange={(e) => handleMediaDeviceChange('video', e.target.checked)}
                />
                <span className={styles.checkboxLabel}>Camera</span>
              </label>
              <label className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={mediaDevices.audio}
                  onChange={(e) => handleMediaDeviceChange('audio', e.target.checked)}
                />
                <span className={styles.checkboxLabel}>Microphone</span>
              </label>
            </div>
          </div>

          {/* Permission status */}
          {mediaDevices.video || mediaDevices.audio ? (
            <div>
              {needsPermissions ? (
                <div className={styles.permissionWarning}>
                  <p>Camera and microphone permissions are required.</p>
                  <button
                    type="button"
                    onClick={requestPermissions}
                    disabled={mediaLoading}
                    className={styles.permissionButton}
                  >
                    {mediaLoading ? (
                      <>
                        <span className={styles.loadingSpinner}></span>
                        Requesting permissions...
                      </>
                    ) : (
                      'Grant Permissions'
                    )}
                  </button>
                </div>
              ) : (
                <div className={styles.permissionStatus}>
                  ✓ Media permissions granted
                  {availableDevices.videoDevices.length > 0 && mediaDevices.video && (
                    <span> • {availableDevices.videoDevices.length} camera(s) found</span>
                  )}
                  {availableDevices.audioDevices.length > 0 && mediaDevices.audio && (
                    <span> • {availableDevices.audioDevices.length} microphone(s) found</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.permissionWarning}>
              At least one media device (camera or microphone) must be enabled.
            </div>
          )}

          {/* Error messages */}
          {(error || mediaError) && (
            <div className={styles.error}>
              {error || mediaError}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isJoining || 
              !roomId.trim() || 
              mediaLoading ||
              needsPermissions ||
              (!mediaDevices.video && !mediaDevices.audio)
            }
            className={styles.joinButton}
          >
            {isJoining ? (
              <>
                <span className={styles.loadingSpinner}></span>
                Joining Room...
              </>
            ) : (
              'Join Room'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};