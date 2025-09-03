import React, { useState, useRef, useEffect } from 'react';
import { joinRoom, leaveRoom, toggleAudio, toggleVideo, setCallbacks } from './webrtc';

export default function VideoCall() {
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
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Simple Video Call</h1>
        <div style={{ margin: '20px 0' }}>
          <input
            type="text"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ padding: '10px', marginRight: '10px', fontSize: '16px' }}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <button 
            onClick={handleJoinRoom}
            disabled={!roomId.trim()}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Join Room
          </button>
        </div>
        {connectionState === 'error' && (
          <p style={{ color: 'red' }}>Failed to connect. Please try again.</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Room: {roomId}</h2>
        <div>
          <span style={{ 
            padding: '5px 10px', 
            borderRadius: '5px',
            backgroundColor: connectionState === 'connected' ? '#28a745' : '#ffc107',
            color: 'white',
            marginRight: '10px'
          }}>
            {connectionState}
          </span>
          <button 
            onClick={handleLeaveRoom}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Leave
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        {/* Local video */}
        <div style={{ flex: 1 }}>
          <h3>You</h3>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ 
              width: '100%', 
              maxWidth: '400px',
              backgroundColor: '#000',
              borderRadius: '10px'
            }}
          />
        </div>

        {/* Remote video */}
        <div style={{ flex: 1 }}>
          <h3>Participant</h3>
          {connectionState === 'connected' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ 
                width: '100%', 
                maxWidth: '400px',
                backgroundColor: '#000',
                borderRadius: '10px'
              }}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              maxWidth: '400px',
              height: '300px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6c757d'
            }}>
              {connectionState === 'waiting' ? 'Waiting for participant...' : 'Connecting...'}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleToggleAudio}
          style={{
            padding: '15px',
            margin: '0 10px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: audioEnabled ? '#28a745' : '#dc3545',
            color: 'white',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          🎤
        </button>
        
        <button
          onClick={handleToggleVideo}
          style={{
            padding: '15px',
            margin: '0 10px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: videoEnabled ? '#28a745' : '#dc3545',
            color: 'white',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          📹
        </button>
      </div>
    </div>
  );
}