// app/album/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { albumsApi } from '@/lib/api';
import type { Album, Song } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

const { width } = Dimensions.get('window');
// Music player height: progress bar (3px) + content padding (24px) + album cover (56px) + spacing ≈ 90px
const PLAYER_HEIGHT = 90;

export default function AlbumDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    currentSong,
    currentAlbum,
    isPlaying,
    playbackStatus,
    playSong,
    togglePlayPause,
  } = useMusicPlayer();
  
  // Calculate bottom padding: player height + safe area bottom
  const bottomPadding = PLAYER_HEIGHT + insets.bottom;

  // Load album data
  useEffect(() => {
    const loadAlbum = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      try {
        const albums = await albumsApi.getAlbums();
        const foundAlbum = albums.find((a) => a.id === id);
        if (foundAlbum) {
          setAlbum(foundAlbum);
        } else {
          setError('Album not found');
        }
      } catch (err) {
        console.error('Error loading album:', err);
        setError('Failed to load album');
      } finally {
        setLoading(false);
      }
    };

    loadAlbum();
  }, [id]);

  const handlePlaySong = async (song: Song) => {
    if (!album) return;
    await playSong(song, album);
  };

  const handlePreviousSong = async () => {
    if (!album || album.songs.length === 0) return;
    
    // If no song is playing or playing a different album, start with last song
    if (!currentSong || currentAlbum?.id !== album.id) {
      await handlePlaySong(album.songs[album.songs.length - 1]);
      return;
    }
    
    const currentIndex = album.songs.findIndex((s) => s.url === currentSong.url);
    if (currentIndex > 0) {
      await handlePlaySong(album.songs[currentIndex - 1]);
    } else {
      // If at the first song, loop to the last song
      await handlePlaySong(album.songs[album.songs.length - 1]);
    }
  };

  const handleNextSong = async () => {
    if (!album || album.songs.length === 0) return;
    
    // If no song is playing or playing a different album, start with first song
    if (!currentSong || currentAlbum?.id !== album.id) {
      await handlePlaySong(album.songs[0]);
      return;
    }
    
    const currentIndex = album.songs.findIndex((s) => s.url === currentSong.url);
    if (currentIndex < album.songs.length - 1) {
      await handlePlaySong(album.songs[currentIndex + 1]);
    } else {
      // If at the last song, loop to the first song
      await handlePlaySong(album.songs[0]);
    }
  };

  const formatDuration = (milliseconds: number | undefined): string => {
    if (!milliseconds) return '--:--';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Loading album...</Text>
        </View>
      </View>
    );
  }

  if (error || !album) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Album not found'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

    const totalDuration = playbackStatus?.isLoaded
      ? playbackStatus.durationMillis
      : undefined;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonHeader}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
        </View>

        {/* Album Info Section */}
        <View style={styles.albumInfoSection}>
          <Image
            source={{ uri: album.coverUrl }}
            style={styles.albumCover}
            resizeMode="cover"
          />
          <View style={styles.albumDetails}>
            <Text style={styles.albumType}>ALBUM</Text>
            <Text style={styles.albumTitle}>{album.title}</Text>
            <View style={styles.artistRow}>
              <View style={styles.artistIcon}>
                <Text style={styles.artistIconText}>
                  {album.artist.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.artistName}>{album.artist}</Text>
            </View>
            <Text style={styles.songCount}>
              {album.songs.length} {album.songs.length === 1 ? 'song' : 'songs'}
            </Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handlePreviousSong}
          >
            <Ionicons
              name="play-skip-back"
              size={24}
              color="#F9FAFB"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => {
              if (currentSong && currentAlbum?.id === album.id) {
                togglePlayPause();
              } else if (album.songs.length > 0) {
                handlePlaySong(album.songs[0]);
              }
            }}
          >
            <Ionicons
              name={isPlaying && currentAlbum?.id === album.id ? 'pause' : 'play'}
              size={32}
              color="#050712"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleNextSong}
          >
            <Ionicons
              name="play-skip-forward"
              size={24}
              color="#F9FAFB"
            />
          </TouchableOpacity>
        </View>

        {/* Track List Header */}
        <View style={styles.trackListHeader}>
          <Text style={styles.trackListHeaderText}>#</Text>
          <Text style={[styles.trackListHeaderText, { flex: 1 }]}>Title</Text>
          <Ionicons name="time-outline" size={16} color="#9CA3AF" />
        </View>

        {/* Track List */}
        <View style={styles.trackList}>
          {album.songs.map((song, index) => {
            const isCurrent = currentSong?.url === song.url && currentAlbum?.id === album.id;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.trackItem, isCurrent && styles.trackItemActive]}
                onPress={() => handlePlaySong(song)}
                activeOpacity={0.7}
              >
                <Text style={[styles.trackNumber, isCurrent && styles.trackNumberActive]}>
                  {isCurrent && isPlaying ? (
                    <Ionicons name="volume-high" size={16} color="#A855F7" />
                  ) : (
                    index + 1
                  )}
                </Text>
                <View style={styles.trackInfo}>
                  <Text
                    style={[
                      styles.trackTitle,
                      isCurrent && styles.trackTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {song.title}
                  </Text>
                  {isCurrent && (
                    <Text style={styles.trackArtist}>{album.artist}</Text>
                  )}
                </View>
                <Text style={styles.trackDuration}>
                  {isCurrent && playbackStatus?.isLoaded
                    ? formatDuration(totalDuration)
                    : '--:--'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050712',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4C1D95',
  },
  backButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  albumInfoSection: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 24,
  },
  albumCover: {
    width: 160,
    height: 160,
    borderRadius: 8,
    marginRight: 16,
  },
  albumDetails: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  albumType: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  albumTitle: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  artistIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4C1D95',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  artistIconText: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '600',
  },
  artistName: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '500',
  },
  songCount: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 24,
  },
  skipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  trackListHeaderText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginRight: 16,
    width: 32,
  },
  trackList: {
    paddingBottom: 100, // Space for now playing bar
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  trackItemActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  trackNumber: {
    color: '#9CA3AF',
    fontSize: 14,
    width: 32,
    textAlign: 'center',
    marginRight: 16,
  },
  trackNumberActive: {
    color: '#A855F7',
  },
  trackInfo: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
  },
  trackTitleActive: {
    color: '#A855F7',
    fontWeight: '600',
  },
  trackArtist: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  trackDuration: {
    color: '#9CA3AF',
    fontSize: 14,
    minWidth: 50,
    textAlign: 'right',
  },
});

