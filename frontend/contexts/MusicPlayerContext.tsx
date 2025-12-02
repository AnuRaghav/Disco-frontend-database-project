// contexts/MusicPlayerContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import type { Song, Album } from '@/lib/types';
import { leaderboardApi, authApi } from '@/lib/api';

interface MusicPlayerContextType {
  currentSong: Song | null;
  currentAlbum: Album | null;
  isPlaying: boolean;
  playbackStatus: any;
  volume: number;
  playSong: (song: Song, album: Album) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  seek: (positionMillis: number) => Promise<void>;
  stop: () => Promise<void>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [volume, setVolumeState] = useState(0.7);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Configure audio mode on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playSong = async (song: Song, album: Album) => {
    try {
      // Stop current playback if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setCurrentSong(song);
      setCurrentAlbum(album);
      
      // Update leaderboard score when song starts playing
      // Get current user's email and update score
      try {
        console.log('🎵 Song started playing, updating leaderboard...');
        const currentUser = await authApi.getCurrentUser();
        console.log('Current user:', currentUser);
        
        if (currentUser?.email) {
          console.log('✅ User email found:', currentUser.email);
          // Call API to update leaderboard score
          // Fire and forget - don't wait for response or interrupt playback
          leaderboardApi.updateLeaderboardScore(currentUser.email).catch((error) => {
            // Log errors but don't interrupt playback
            console.error('❌ Failed to update leaderboard score:', error);
          });
        } else {
          console.warn('⚠️ No user email found. Cannot update leaderboard.');
          console.log('User object:', JSON.stringify(currentUser, null, 2));
        }
      } catch (error) {
        // Log errors but don't interrupt playback
        console.error('❌ Failed to get user email for leaderboard update:', error);
      }
      
      // Load and play the new song
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.url },
        { shouldPlay: true, volume: volume },
        (status) => {
          setPlaybackStatus(status);
          if (status.isLoaded) {
            setIsPlaying(!status.didJustFinish && status.isPlaying);
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const setVolume = async (newVolume: number) => {
    setVolumeState(newVolume);
    if (soundRef.current) {
      try {
        await soundRef.current.setVolumeAsync(newVolume);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  };

  const seek = async (positionMillis: number) => {
    if (!soundRef.current) return;
    
    try {
      await soundRef.current.setPositionAsync(positionMillis);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const stop = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (error) {
        console.error('Error stopping playback:', error);
      }
    }
    setCurrentSong(null);
    setCurrentAlbum(null);
    setIsPlaying(false);
    setPlaybackStatus(null);
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        currentAlbum,
        isPlaying,
        playbackStatus,
        volume,
        playSong,
        togglePlayPause,
        setVolume,
        seek,
        stop,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}

