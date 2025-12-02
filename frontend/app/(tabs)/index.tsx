// app/(tabs)/index.tsx
import Slider from '@react-native-community/slider';

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
import { leaderboardApi, authApi } from '@/lib/api';
import type { Album, LeaderboardEntry, User } from '@/lib/types';
import MusicUploadModal from '@/components/music-upload-modal';

const STORAGE_KEY = 'discoUser';

const mockAlbums: Album[] = [
  {
    id: 1,
    title: 'Breathe',
    artist: 'Artist',
    coverUrl:
      'https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 2,
    title: 'Normal Sceauxhell',
    artist: 'Artist',
    coverUrl:
      'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 3,
    title: 'Polaroid',
    artist: 'Artist',
    coverUrl:
      'https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 4,
    title: 'Charm',
    artist: 'Artist',
    coverUrl:
      'https://images.pexels.com/photos/63703/turntable-record-player-vinyl-sound-63703.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const [currentTrack, setCurrentTrack] = useState<Album | null>(null);
  const [activeFilter, setActiveFilter] =
    useState<'forYou' | 'trending' | 'new'>('forYou');
  const [volume, setVolume] = useState(0.7); // 0–1
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
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

  const handleAlbumPress = (album: Album) => {
    setCurrentTrack(album);
  };

  const handleLogout = async () => {
    try {
      // clear API auth token
      await authApi.logout?.(); // if logout() exists
      // OR, if there's a clearToken() helper, call that instead
  
      // keep your existing local user clear if you want:
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.log('Error during logout', e);
    } finally {
      router.replace('/'); // back to signup/login
    }
  };
  

  const renderAlbumGrid = () => (
    <View style={styles.albumGrid}>
      {mockAlbums.map((album) => (
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

  return (
    <View style={styles.root}>
      {/* LEFT SIDEBAR */}
      <View style={styles.sidebar}>
        <Text style={styles.logo}>DISCO</Text>
        <Text style={styles.sectionTitle}>Leaderboard (Hours)</Text>
        <ScrollView style={{ flex: 1 }}>
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
                      {entry.hours} hrs
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Logout button at bottom */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
            <TouchableOpacity onPress={() => setActiveFilter('trending')}>
              <Text
                style={[
                  styles.pill,
                  activeFilter === 'trending' && styles.pillActive,
                ]}
              >
                Trending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveFilter('new')}>
              <Text
                style={[styles.pill, activeFilter === 'new' && styles.pillActive]}
              >
                New
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          {renderAlbumGrid()}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Most Popular
          </Text>
          {renderAlbumGrid()}
        </ScrollView>
      </View>

      {/* NOW PLAYING PANEL */}
      <View style={styles.nowPlaying}>
        <Image
          source={{
            uri: currentTrack
              ? currentTrack.coverUrl
              : 'https://images.pexels.com/photos/63703/turntable-record-player-vinyl-sound-63703.jpeg?auto=compress&cs=tinysrgb&w=300',
          }}
          style={styles.nowPlayingCover}
        />
        <Text style={styles.nowPlayingTitle}>
          {currentTrack ? currentTrack.title : 'Nothing playing'}
        </Text>
        <Text style={styles.nowPlayingArtist}>
          {currentTrack
            ? currentTrack.artist
            : 'Tap an album to start listening'}
        </Text>

        <View style={styles.progressBarBg}>
          <View style={styles.progressBarFill} />
        </View>

        <View style={styles.volumeRow}>
          <Text style={{ color: '#9CA3AF' }}>🔈</Text>
          <Slider
            style={{ flex: 1 }}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={(val) => {
              console.log('volume →', val);
              setVolume(val);
            }}
            minimumTrackTintColor="#A855F7"
            maximumTrackTintColor="#1F2937"
            thumbTintColor="#F9FAFB"
          />
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setUploadModalVisible(true)}
        >
          <View style={styles.uploadInner}>
            <Text style={{ color: 'white', fontSize: 24 }}>⬆️</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Music Upload Modal */}
      <MusicUploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050712',
    flexDirection: 'row',
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
    marginBottom: 16,
    letterSpacing: 2,
    marginBottom: 20, 
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
  },
  nowPlayingArtist: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
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
    width: '45%',
    backgroundColor: '#A855F7',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  volumeBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: '#A855F7',
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