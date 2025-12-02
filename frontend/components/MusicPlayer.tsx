// components/MusicPlayer.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

export default function MusicPlayer() {
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
      {/* Progress bar at the very top */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Main player content */}
      <View style={styles.playerContent}>
        {/* Album cover */}
        <Image
          source={{ uri: coverUrl }}
          style={styles.nowPlayingCover}
        />

        {/* Song info */}
        <View style={styles.songInfo}>
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>
            {currentSong ? currentSong.title : 'Nothing playing'}
          </Text>
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>
            {currentAlbum
              ? currentAlbum.artist
              : 'Tap an album to start listening'}
          </Text>
        </View>

        {/* Play/Pause button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayPause}
          disabled={!currentSong}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color="#050712"
          />
        </TouchableOpacity>

        {/* Volume control */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-medium" size={20} color="#9CA3AF" />
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={setVolume}
            minimumTrackTintColor="#A855F7"
            maximumTrackTintColor="#1F2937"
            thumbTintColor="#F9FAFB"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nowPlaying: {
    width: '100%',
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  progressBarBg: {
    height: 3,
    width: '100%',
    backgroundColor: '#1F2937',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A855F7',
  },
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  nowPlayingCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Allow text to shrink
  },
  nowPlayingTitle: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
  nowPlayingArtist: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    gap: 8,
  },
  volumeSlider: {
    flex: 1,
  },
});

