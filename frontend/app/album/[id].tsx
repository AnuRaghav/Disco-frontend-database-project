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
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { albumsApi, authApi } from '@/lib/api';
import type { Album, Song, User } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useLikes } from '@/contexts/LikesContext';

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
  const [songDurations, setSongDurations] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const {
    currentSong,
    currentAlbum,
    isPlaying,
    playbackStatus,
    playSong,
    togglePlayPause,
  } = useMusicPlayer();
  
  const { isLiked, toggleLike, loadLikes } = useLikes();
  
  // Calculate bottom padding: player height + safe area bottom
  const bottomPadding = PLAYER_HEIGHT + insets.bottom;

  // Load current user to check admin status and load likes
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        console.log('Current user loaded:', { id: user?.id, isAdmin: user?.isAdmin, email: user?.email });
        setCurrentUser(user);
        
        // Load likes for this user
        if (user?.email) {
          await loadLikes(user.email);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, [loadLikes]);

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
          
          // Load durations for all songs (non-blocking)
          const loadDurations = async () => {
            for (const song of foundAlbum.songs) {
              try {
                const { sound } = await Audio.Sound.createAsync(
                  { uri: song.url },
                  { shouldPlay: false }
                );
                
                // Wait for status to be loaded with retries
                let status = await sound.getStatusAsync();
                let attempts = 0;
                while ((!status.isLoaded || !status.durationMillis) && attempts < 5) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                  status = await sound.getStatusAsync();
                  attempts++;
                }
                
                if (status.isLoaded && status.durationMillis) {
                  setSongDurations((prev) => ({
                    ...prev,
                    [song.url]: status.durationMillis!,
                  }));
                }
                
                await sound.unloadAsync();
              } catch (err) {
                // Silently skip if duration can't be loaded
              }
            }
          };
          // Don't await - load in background
          loadDurations();
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

  // Cache duration when a song starts playing
  useEffect(() => {
    if (
      currentSong &&
      currentAlbum?.id === album?.id &&
      playbackStatus?.isLoaded &&
      playbackStatus.durationMillis
    ) {
      setSongDurations((prev) => ({
        ...prev,
        [currentSong.url]: playbackStatus.durationMillis!,
      }));
    }
  }, [playbackStatus, currentSong, currentAlbum, album]);

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

  const handleDeleteAlbum = () => {
    console.log('========================================');
    console.log('handleDeleteAlbum CALLED');
    console.log('========================================');
    console.log('Route ID:', id);
    console.log('Album ID:', album?.id);
    console.log('Album Title:', album?.title);
    console.log('Is Admin:', currentUser?.isAdmin);
    console.log('Current User:', currentUser);
    console.log('========================================');
    
    if (!album || !currentUser?.isAdmin || !id) {
      console.log('❌ Delete blocked:', { 
        hasAlbum: !!album, 
        hasId: !!id, 
        isAdmin: currentUser?.isAdmin 
      });
      return;
    }

    console.log('✅ All checks passed, showing delete confirmation modal...');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!album || !id) return;
    
    console.log('========================================');
    console.log('✅ DELETE CONFIRMED BY USER');
    console.log('========================================');
    console.log('Calling API with route ID:', id);
    
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    
    try {
      // Use the route id parameter, not album.id, since that's what the API expects
      await albumsApi.deleteAlbum(id);
      console.log('========================================');
      console.log('✅ ALBUM DELETED SUCCESSFULLY');
      console.log('========================================');
      // Navigate back after successful deletion
      router.back();
    } catch (error: any) {
      console.error('========================================');
      console.error('❌ ERROR DELETING ALBUM');
      console.error('========================================');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      console.error('Error response status:', error?.response?.status);
      console.error('========================================');
      setIsDeleting(false);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete album. Please try again.';
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const cancelDelete = () => {
    console.log('========================================');
    console.log('❌ DELETE CANCELLED BY USER');
    console.log('========================================');
    setShowDeleteConfirm(false);
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

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Header with back button and delete button (admin only) */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonHeader}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          {currentUser?.isAdmin && (
            <TouchableOpacity
              style={styles.deleteButtonHeader}
              onPress={() => {
                console.log('Delete button pressed');
                handleDeleteAlbum();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              )}
            </TouchableOpacity>
          )}
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
            const songIsLiked = currentUser?.email ? isLiked(song.url) : false;
            
            return (
              <View
                key={index}
                style={[styles.trackItem, isCurrent && styles.trackItemActive]}
              >
                <TouchableOpacity
                  style={styles.trackItemContent}
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
                    {isCurrent && playbackStatus?.isLoaded && playbackStatus.durationMillis
                      ? formatDuration(playbackStatus.durationMillis)
                      : songDurations[song.url]
                      ? formatDuration(songDurations[song.url])
                      : '--:--'}
                  </Text>
                </TouchableOpacity>
                
                {/* Like Button */}
                {currentUser?.email && (
                  <TouchableOpacity
                    style={styles.likeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (currentUser.email) {
                        toggleLike(song.url, currentUser.email);
                      }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={songIsLiked ? 'heart' : 'heart-outline'}
                      size={20}
                      color={songIsLiked ? '#EF4444' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Album</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{album?.title}"? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  deleteButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
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
  trackItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  likeButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalMessage: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

