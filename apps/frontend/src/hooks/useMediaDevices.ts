import { useState, useEffect, useCallback } from 'react';
import { type MediaDevices } from '../types/webrtc';

interface MediaDevicesHook {
  availableDevices: {
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
  };
  currentDevices: MediaDevices;
  hasPermissions: {
    video: boolean;
    audio: boolean;
  };
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<void>;
  updateDevices: (devices: MediaDevices) => void;
  checkDeviceAvailability: () => Promise<void>;
}

export const useMediaDevices = (): MediaDevicesHook => {
  const [availableDevices, setAvailableDevices] = useState<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
  }>({
    videoDevices: [],
    audioDevices: []
  });

  const [currentDevices, setCurrentDevices] = useState<MediaDevices>({
    video: true,
    audio: true
  });

  const [hasPermissions, setHasPermissions] = useState<{
    video: boolean;
    audio: boolean;
  }>({
    video: false,
    audio: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDeviceAvailability = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Media devices not supported in this browser');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      setAvailableDevices({
        videoDevices,
        audioDevices
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enumerate media devices';
      setError(errorMessage);
      console.error('Error checking device availability:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permissions by trying to access media
      const constraints = {
        video: currentDevices.video,
        audio: currentDevices.audio
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check which permissions were granted
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      setHasPermissions({
        video: videoTracks.length > 0,
        audio: audioTracks.length > 0
      });

      // Stop the stream as we only needed it for permission checking
      stream.getTracks().forEach(track => track.stop());

      // Update available devices after permission grant
      await checkDeviceAvailability();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request media permissions';
      setError(errorMessage);
      console.error('Error requesting permissions:', err);

      // Set permissions based on what failed
      if (errorMessage.includes('video') || errorMessage.includes('camera')) {
        setHasPermissions(prev => ({ ...prev, video: false }));
      }
      if (errorMessage.includes('audio') || errorMessage.includes('microphone')) {
        setHasPermissions(prev => ({ ...prev, audio: false }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentDevices, checkDeviceAvailability]);

  const updateDevices = useCallback((devices: MediaDevices): void => {
    setCurrentDevices(devices);
  }, []);

  // Check initial device availability
  useEffect(() => {
    checkDeviceAvailability();
  }, [checkDeviceAvailability]);

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      checkDeviceAvailability();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [checkDeviceAvailability]);

  return {
    availableDevices,
    currentDevices,
    hasPermissions,
    isLoading,
    error,
    requestPermissions,
    updateDevices,
    checkDeviceAvailability
  };
};