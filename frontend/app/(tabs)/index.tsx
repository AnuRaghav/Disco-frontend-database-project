// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { leaderboardApi, authApi, albumsApi } from '@/lib/api';
import type { Album, LeaderboardEntry, User } from '@/lib/types';
import MusicUploadModal from '@/components/music-upload-modal-enhanced';
import { STORAGE_USER_KEY } from '@/constants/storage';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = STORAGE_USER_KEY; // Using centralized storage constant

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState<'forYou' | 'trending' | 'new'>('forYou');
  
  // Calculate bottom padding: safe area bottom
  const bottomPadding = insets.bottom;
  // Music player height: progress bar (3px) + content padding (24px) + album cover (56px) + spacing ≈ 90px
  const playerHeight = 90;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [albumsError, setAlbumsError] = useState<string | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Fetch leaderboard and current user on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaderboardData, userFromApi] = await Promise.all([
          leaderboardApi.getLeaderboard(),
          authApi.getCurrentUser(),
        ]);
  
        setLeaderboard(leaderboardData);
  
        let finalUser = userFromApi;
  
        // fallback: if API user is null/undefined, try AsyncStorage
        if (!finalUser) {
          const saved = await AsyncStorage.getItem(STORAGE_KEY);
          if (saved) {
            finalUser = JSON.parse(saved);
          }
        }
  
        setCurrentUser(finalUser || null);
      } catch (error) {
        console.error('Error fetching leaderboard/current user:', error);
      } finally {
        setLoadingLeaderboard(false);
      }
    };
  
    fetchData();
  }, []);

  // Fetch albums from S3 when component mounts or filter changes
  useEffect(() => {
    const fetchAlbums = async () => {
      setLoadingAlbums(true);
      setAlbumsError(null);
      try {
        const albumsData = await albumsApi.getAlbums(activeFilter);
        setAlbums(albumsData);
      } catch (error) {
        console.error('Error fetching albums from S3:', error);
        setAlbumsError('Failed to load albums. Please try again.');
        // Keep empty array on error
        setAlbums([]);
      } finally {
        setLoadingAlbums(false);
      }
    };

    fetchAlbums();
  }, [activeFilter]);

  const handleAlbumPress = (album: Album) => {
    router.push(`/album/${album.id}`);
  };

  const handleLogout = async () => {
    try {
      // Clear API auth token
      await authApi.logout();
      // Clear local storage
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.log('Error during logout', e);
    }
    
    // Navigate to login page - ensure navigation happens after storage is cleared
    // Use setTimeout to ensure async operations complete before navigation
    setTimeout(() => {
      router.replace('/');
    }, 100);
  };
  

  const renderAlbumGrid = () => {
    if (loadingAlbums) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator color="#9CA3AF" />
          <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Loading albums...</Text>
        </View>
      );
    }

    if (albumsError) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: '#EF4444', marginBottom: 8 }}>{albumsError}</Text>
          <TouchableOpacity
            onPress={async () => {
              setLoadingAlbums(true);
              setAlbumsError(null);
              try {
                const albumsData = await albumsApi.getAlbums(activeFilter);
                setAlbums(albumsData);
              } catch (error) {
                console.error('Error retrying album fetch:', error);
                setAlbumsError('Failed to load albums. Please try again.');
              } finally {
                setLoadingAlbums(false);
              }
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: '#4C1D95',
            }}
          >
            <Text style={{ color: '#F9FAFB' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (albums.length === 0) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: '#9CA3AF' }}>No albums found</Text>
        </View>
      );
    }

    return (
      <View style={styles.albumGrid}>
        {albums.map((album) => (
          <TouchableOpacity
            key={album.id}
            style={styles.albumCard}
            onPress={() => handleAlbumPress(album)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: album.coverUrl }} style={styles.albumImage} />
            <Text style={styles.albumTitle} numberOfLines={1}>
              {album.title}
            </Text>
            <Text style={styles.albumArtist} numberOfLines={1}>
              {album.artist}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* LEFT SIDEBAR */}
      <View style={styles.sidebar}>
        <Text style={styles.logo}>DISCO</Text>
        <Text style={styles.sectionTitle}>Leaderboard (Plays)</Text>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {loadingLeaderboard ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color="#9CA3AF" />
            </View>
          ) : (
            leaderboard.map((entry) => {
              const isCurrentUser =
                currentUser && entry.userId === currentUser.id;
              return (
                <View
                  key={entry.userId}
                  style={[
                    styles.leaderboardRow,
                    isCurrentUser && styles.leaderboardRowYou,
                  ]}
                >
                  <View style={styles.avatarCircle} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderboardName}>
                      {isCurrentUser ? 'You' : entry.name}
                    </Text>
                    <Text style={styles.leaderboardSub}>
                      {entry.hours} plays
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* New Playlist button - Hidden */}
        {/* <TouchableOpacity
          style={[styles.newPlaylistButton, { marginBottom: 8 }]}
          onPress={() => router.push('/playlist/new')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#A855F7" />
          <Text style={styles.newPlaylistText}>New Playlist</Text>
        </TouchableOpacity> */}

        {/* Logout button - positioned above the audio player */}
        <TouchableOpacity 
          style={[styles.logoutButton, { marginBottom: playerHeight + bottomPadding + 8 }]} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.main}>
        <View style={styles.topRow}>
        <Text style={styles.welcome}>
          Welcome Back, {currentUser?.username || currentUser?.name || 'User'}!
        </Text>
          <View style={styles.pillsRow}>
            <TouchableOpacity onPress={() => setActiveFilter('forYou')}>
              <Text
                style={[
                  styles.pill,
                  activeFilter === 'forYou' && styles.pillActive,
                ]}
              >
                For you
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPadding }}
        >
          <Text style={styles.sectionTitle}>Recently Played</Text>
          {renderAlbumGrid()}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Most Popular
          </Text>
          {renderAlbumGrid()}
        </ScrollView>
      </View>

      {/* Upload Button - Floating Above Everything - Only for Admins */}
      {currentUser?.isAdmin && (
        <>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setUploadModalVisible(true)}
          >
            <Ionicons name="cloud-upload-outline" size={44} color="white" />
          </TouchableOpacity>

          {/* Music Upload Modal */}
          <MusicUploadModal
            visible={uploadModalVisible}
            onClose={() => setUploadModalVisible(false)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050712',
    flexDirection: 'row',
    position: 'relative',
  },
  sidebar: {
    width: 260,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: '#050712',
    borderRightWidth: 1,
    borderRightColor: '#111827',
  },
  logo: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: 2,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 14,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  leaderboardRowYou: {
    backgroundColor: 'rgba(147, 51, 234, 0.35)',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    marginRight: 8,
  },
  leaderboardName: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '500',
  },
  leaderboardSub: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  newPlaylistButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: '#A855F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newPlaylistText: {
    color: '#A855F7',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
    alignItems: 'center',
  },
  logoutText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  main: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcome: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
    color: '#E5E7EB',
    fontSize: 12,
  },
  pillActive: {
    backgroundColor: '#4C1D95',
    borderColor: '#4C1D95',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  albumCard: {
    width: 140,
  },
  albumImage: {
    width: 140,
    height: 140,
    borderRadius: 14,
    marginBottom: 8,
  },
  albumTitle: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
  },
  albumArtist: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  uploadButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 25,
    zIndex: 99999,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});