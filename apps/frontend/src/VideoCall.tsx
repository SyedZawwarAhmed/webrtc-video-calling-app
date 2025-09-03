import React, { useState, useRef, useEffect } from 'react';
import { joinRoom, leaveRoom, toggleAudio, toggleVideo, setCallbacks } from './webrtc';
import './VideoCall.css';

function VideoCall() {
  const [roomId, setRoomId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log('🔧 Setting up WebRTC callbacks');
    // Setup WebRTC callbacks
    setCallbacks({
      onLocalStream: (stream) => {
        console.log('📹 CALLBACK: Got local stream');
        console.log('📹 CALLBACK: Stream tracks:', stream.getTracks().length);
        setLocalStreamState(stream);
      },
      onRemoteStream: (stream) => {
        console.log('📺 CALLBACK: Got remote stream with', stream.getTracks().length, 'tracks');
        console.log('📺 Video tracks:', stream.getVideoTracks().length);
        console.log('📺 Audio tracks:', stream.getAudioTracks().length);
        setRemoteStreamState(stream);
      },
      onConnectionState: (state) => {
        console.log('🔗 CALLBACK: Connection state:', state);
        setConnectionState(state);
      }
    });
  }, []);

  // Set local video when stream is available
  useEffect(() => {
    console.log('🎥 Local stream effect triggered');
    console.log('🎥 localStreamState:', !!localStreamState);
    console.log('🎥 localVideoRef.current:', !!localVideoRef.current);
    
    if (localStreamState) {
      // Use a small timeout to ensure the video element is rendered
      const setupVideo = () => {
        if (localVideoRef.current) {
          console.log('🎥 Setting local video element with stream');
          localVideoRef.current.srcObject = localStreamState;
          localVideoRef.current.play().then(() => {
            console.log('✅ Local video started playing');
          }).catch(err => {
            console.error('❌ Local video play error:', err);
          });
        } else {
          console.log('⏳ Video ref not ready, retrying in 100ms');
          setTimeout(setupVideo, 100);
        }
      };
      
      setupVideo();
    }
  }, [localStreamState, inCall]);

  // Set remote video when stream is available
  useEffect(() => {
    if (remoteStreamState && remoteVideoRef.current) {
      console.log('📺 Setting remote video element with stream');
      console.log('📺 Stream tracks:', remoteStreamState.getTracks().length);
      remoteVideoRef.current.srcObject = remoteStreamState;
      remoteVideoRef.current.play().then(() => {
        console.log('✅ Remote video playing');
      }).catch(err => {
        console.error('❌ Remote video play error:', err);
      });
    } else {
      console.log('📺 Remote stream or video ref not ready:', !!remoteStreamState, !!remoteVideoRef.current);
    }
  }, [remoteStreamState]);

  const handleJoinRoom = async () => {
    if (!roomId.trim()) return;
    
    try {
      console.log('🚪 Starting to join room:', roomId.trim());
      setConnectionState('connecting');
      await joinRoom(roomId.trim());
      console.log('🚪 Successfully joined room');
      setInCall(true);
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setConnectionState('error');
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setInCall(false);
    setConnectionState('idle');
    setLocalStreamState(null);
    setRemoteStreamState(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleToggleAudio = () => {
    const enabled = toggleAudio();
    setAudioEnabled(enabled);
  };

  const handleToggleVideo = () => {
    const enabled = toggleVideo();
    setVideoEnabled(enabled);
  };

  if (!inCall) {
    return (
      <div className="join-container">
        <div className="join-card">
          <div className="join-header">
            <h1 className="join-title">🎥 Video Call</h1>
            <p className="join-subtitle">Connect with friends and colleagues instantly</p>
          </div>
          
          <div className="join-form">
            <div className="input-group">
              <label htmlFor="roomId" className="input-label">Room ID</label>
              <div className="input-row">
                <input
                  id="roomId"
                  type="text"
                  placeholder="Enter room ID (e.g., MEET123)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  className="room-input"
                  maxLength={10}
                />
                <button 
                  type="button"
                  onClick={() => setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase())}
                  className="generate-btn"
                  title="Generate random room ID"
                >
                  🎲
                </button>
              </div>
            </div>
            
            <button 
              onClick={handleJoinRoom}
              disabled={!roomId.trim() || connectionState === 'connecting'}
              className={`join-btn ${connectionState === 'connecting' ? 'joining' : ''}`}
            >
              {connectionState === 'connecting' ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Join Room
                </>
              )}
            </button>
            
            {connectionState === 'error' && (
              <div className="error-message">
                <span>⚠️</span>
                Failed to connect. Please try again.
              </div>
            )}
          </div>
          
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">🎤</span>
              <span>Crystal clear audio</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📹</span>
              <span>HD video quality</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Secure & private</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      {/* Header */}
      <div className="call-header">
        <div className="room-info">
          <h2 className="room-title">📱 Room: {roomId}</h2>
          <div className="connection-status">
            <span className={`status-badge ${connectionState}`}>
              {connectionState === 'connecting' && <span className="status-spinner"></span>}
              <span className="status-dot"></span>
              {connectionState}
            </span>
          </div>
        </div>
        <button onClick={handleLeaveRoom} className="leave-btn">
          <span>👋</span>
          Leave Room
        </button>
      </div>

      {/* Video Grid */}
      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local">
          <div className="video-label">
            <span className="label-icon">👤</span>
            You
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="video-element"
          />
          {!videoEnabled && (
            <div className="video-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">📹</span>
                <span>Camera off</span>
              </div>
            </div>
          )}
        </div>

        {/* Remote video */}
        <div className="video-container remote">
          <div className="video-label">
            <span className="label-icon">👥</span>
            Participant
          </div>
          {connectionState === 'connected' && remoteStreamState ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="video-element"
            />
          ) : (
            <div className="video-placeholder">
              <div className="placeholder-content">
                {connectionState === 'connecting' ? (
                  <>
                    <span className="spinner large"></span>
                    <span>Connecting...</span>
                  </>
                ) : connectionState === 'waiting' ? (
                  <>
                    <span className="placeholder-icon">⏳</span>
                    <span>Waiting for participant...</span>
                  </>
                ) : (
                  <>
                    <span className="placeholder-icon">👥</span>
                    <span>No participant yet</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="control-panel">
        <div className="controls">
          <button
            onClick={handleToggleAudio}
            className={`control-btn audio ${!audioEnabled ? 'disabled' : ''}`}
            title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            <span className="control-icon">
              {audioEnabled ? '🎤' : '🔇'}
            </span>
            <span className="control-label">
              {audioEnabled ? 'Mute' : 'Unmute'}
            </span>
          </button>
          
          <button
            onClick={handleToggleVideo}
            className={`control-btn video ${!videoEnabled ? 'disabled' : ''}`}
            title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            <span className="control-icon">
              {videoEnabled ? '📹' : '📴'}
            </span>
            <span className="control-label">
              {videoEnabled ? 'Stop Video' : 'Start Video'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;