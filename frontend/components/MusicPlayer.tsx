// components/MusicPlayer.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface MusicPlayerProps {
  onUploadPress?: () => void;
}

export default function MusicPlayer({ onUploadPress }: MusicPlayerProps) {
  const {
    currentSong,
    currentAlbum,
    isPlaying,
    playbackStatus,
    volume,
    togglePlayPause,
    setVolume,
  } = useMusicPlayer();

  const progress = playbackStatus?.isLoaded
    ? playbackStatus.positionMillis / playbackStatus.durationMillis
    : 0;

  const coverUrl = currentAlbum?.coverUrl || 
    'https://images.pexels.com/photos/63703/turntable-record-player-vinyl-sound-63703.jpeg?auto=compress&cs=tinysrgb&w=300';

  return (
    <View style={styles.nowPlaying}>
      <Image
        source={{ uri: coverUrl }}
        style={styles.nowPlayingCover}
      />
      <Text style={styles.nowPlayingTitle} numberOfLines={1}>
        {currentSong ? currentSong.title : 'Nothing playing'}
      </Text>
      <Text style={styles.nowPlayingArtist} numberOfLines={1}>
        {currentAlbum
          ? currentAlbum.artist
          : 'Tap an album to start listening'}
      </Text>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.volumeRow}>
        <Text style={{ color: '#9CA3AF' }}>🔈</Text>
        <Slider
          style={{ flex: 1 }}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={setVolume}
          minimumTrackTintColor="#A855F7"
          maximumTrackTintColor="#1F2937"
          thumbTintColor="#F9FAFB"
        />
      </View>

      {onUploadPress && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onUploadPress}
        >
          <View style={styles.uploadInner}>
            <Text style={{ color: 'white', fontSize: 24 }}>⬆️</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nowPlaying: {
    width: 280,
    backgroundColor: '#020617',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  nowPlayingCover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 12,
  },
  nowPlayingTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  nowPlayingArtist: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarBg: {
    height: 4,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A855F7',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  uploadButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

