// app/profile.tsx
// =============================================================================
// PROFILE PAGE - User Profile Display
// =============================================================================
// 
// BACKEND INTEGRATION NOTES:
// --------------------------
// This page currently uses mock data. To connect to the backend:
//
// 1. USER DATA:
//    - Replace `mockUser` with data from your user API endpoint
//    - Expected endpoint: GET /api/users/:userId or GET /api/users/me
//    - Expected response shape: { id, name, username, email, profileImageUrl, 
//      playlistCount, followerCount, followingCount }
//
// 2. TOP ARTISTS:
//    - Replace `mockTopArtists` with data from listening history API
//    - Expected endpoint: GET /api/users/:userId/top-artists?period=month
//    - Expected response shape: Array of { id, name, imageUrl }
//
// 3. TOP TRACKS:
//    - Replace `mockTopTracks` with data from listening history API
//    - Expected endpoint: GET /api/users/:userId/top-tracks?period=month
//    - Expected response shape: Array of { id, title, artist, album, 
//      albumCoverUrl, duration, isLiked }
//
// 4. PROFILE IMAGE UPLOAD:
//    - The `handleChangePhoto` function currently uses expo-image-picker
//    - After picking an image, upload it to your storage service
//    - Expected endpoint: POST /api/users/:userId/profile-image
//    - Send as multipart/form-data with the image file
//    - Update the user record with the new image URL
//
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/types';

// Music player height: progress bar (3px) + content padding (24px) + album cover (56px) + spacing ≈ 90px
const PLAYER_HEIGHT = 90;

// =============================================================================
// MOCK DATA - Replace with API calls in production
// =============================================================================

// TODO: Backend - Replace with actual user data from GET /api/users/me
interface ProfileUser extends User {
  profileImageUrl?: string;
  playlistCount?: number;
  followerCount?: number;
  followingCount?: number;
}

// TODO: Backend - Replace with data from GET /api/users/:userId/top-artists
interface Artist {
  id: number;
  name: string;
  imageUrl: string;
}

const mockTopArtists: Artist[] = [
  {
    id: 1,
    name: 'Playboi Carti',
    imageUrl: 'https://images.pexels.com/photos/1699161/pexels-photo-1699161.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 2,
    name: 'Chris Brown',
    imageUrl: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 3,
    name: 'Tyla',
    imageUrl: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 4,
    name: 'GIVĒON',
    imageUrl: 'https://images.pexels.com/photos/1644616/pexels-photo-1644616.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 5,
    name: 'Doja Cat',
    imageUrl: 'https://images.pexels.com/photos/1484794/pexels-photo-1484794.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
  {
    id: 6,
    name: 'The Weeknd',
    imageUrl: 'https://images.pexels.com/photos/1699159/pexels-photo-1699159.jpeg?auto=compress&cs=tinysrgb&w=300',
  },
];

// TODO: Backend - Replace with data from GET /api/users/:userId/top-tracks
interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumCoverUrl: string;
  duration: string; // Format: "M:SS"
  isLiked: boolean;
}

const mockTopTracks: Track[] = [
  {
    id: 1,
    title: 'Shirt',
    artist: 'SZA',
    album: 'SOS',
    albumCoverUrl: 'https://images.pexels.com/photos/1021876/pexels-photo-1021876.jpeg?auto=compress&cs=tinysrgb&w=300',
    duration: '3:01',
    isLiked: true,
  },
  {
    id: 2,
    title: 'RATHER LIE (with The Weeknd)',
    artist: 'Playboi Carti, The Weeknd',
    album: 'MUSIC',
    albumCoverUrl: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=300',
    duration: '3:29',
    isLiked: false,
  },
  {
    id: 3,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    albumCoverUrl: 'https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=300',
    duration: '3:20',
    isLiked: true,
  },
  {
    id: 4,
    title: 'Kiss Me More',
    artist: 'Doja Cat ft. SZA',
    album: 'Planet Her',
    albumCoverUrl: 'https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg?auto=compress&cs=tinysrgb&w=300',
    duration: '3:28',
    isLiked: false,
  },
];

// =============================================================================
// PROFILE SCREEN COMPONENT
// =============================================================================

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topArtists, setTopArtists] = useState<Artist[]>(mockTopArtists);
  const [topTracks, setTopTracks] = useState<Track[]>(mockTopTracks);

  // ---------------------------------------------------------------------------
  // FETCH USER DATA
  // ---------------------------------------------------------------------------
  // TODO: Backend - Update this useEffect to fetch additional profile data
  // You may need to create a new API endpoint that returns extended user info
  // including playlistCount, followerCount, followingCount, and listening stats
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (currentUser) {
          // TODO: Backend - Fetch additional profile stats here
          // const profileStats = await profileApi.getProfileStats(currentUser.id);
          setUser({
            ...currentUser,
            // Mock stats - replace with actual data from backend
            playlistCount: 4,
            followerCount: 3,
            followingCount: 6,
          });
          setProfileImage(currentUser.profileImageUrl || null);
        }

        // TODO: Backend - Fetch top artists
        // const artists = await listeningApi.getTopArtists(currentUser.id, 'month');
        // setTopArtists(artists);

        // TODO: Backend - Fetch top tracks
        // const tracks = await listeningApi.getTopTracks(currentUser.id, 'month');
        // setTopTracks(tracks);

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // ---------------------------------------------------------------------------
  // PROFILE IMAGE PICKER
  // ---------------------------------------------------------------------------
  // TODO: Backend - After selecting an image, upload it to your storage service
  // and update the user's profileImageUrl in the database
  const handleChangePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0].uri;
        setProfileImage(selectedImage);

        // TODO: Backend - Upload the image to your storage service
        // Example implementation:
        // 
        // const formData = new FormData();
        // formData.append('image', {
        //   uri: selectedImage,
        //   type: 'image/jpeg',
        //   name: 'profile.jpg',
        // });
        // 
        // const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/profile-image`, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${token}`,
        //     'Content-Type': 'multipart/form-data',
        //   },
        //   body: formData,
        // });
        // 
        // const { imageUrl } = await response.json();
        // setProfileImage(imageUrl);
        
        console.log('Profile image selected:', selectedImage);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // NAVIGATION HANDLERS
  // ---------------------------------------------------------------------------
  const handleBackPress = () => {
    router.back();
  };

  const handleShowAllArtists = () => {
    // TODO: Navigate to full artists list
    console.log('Show all artists');
  };

  const handleShowAllTracks = () => {
    // TODO: Navigate to full tracks list
    console.log('Show all tracks');
  };

  const handleArtistPress = (artist: Artist) => {
    // TODO: Navigate to artist page
    console.log('Artist pressed:', artist.name);
  };

  const handleTrackPress = (track: Track) => {
    // TODO: Play track or navigate to track details
    console.log('Track pressed:', track.title);
  };

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header with Gradient */}
      <LinearGradient
        colors={['#7C3AED', '#A855F7', '#6B21A8', '#1F1F1F']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.headerGradient}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.profileHeader}>
          {/* Profile Image with Change Photo Overlay */}
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={handleChangePhoto}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={60} color="#9CA3AF" />
              </View>
            )}
            {/* Change Photo Overlay */}
            <View style={styles.changePhotoOverlay}>
              <Ionicons name="pencil" size={20} color="#FFFFFF" />
              <Text style={styles.changePhotoText}>Choose photo</Text>
            </View>
          </TouchableOpacity>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.profileLabel}>Profile</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>
                {user?.playlistCount || 0} Public Playlists
              </Text>
              <Text style={styles.statDot}>•</Text>
              <Text style={styles.statText}>
                {user?.followerCount || 0} Followers
              </Text>
              <Text style={styles.statDot}>•</Text>
              <Text style={styles.statText}>
                {user?.followingCount || 0} Following
              </Text>
            </View>
          </View>
        </View>

        {/* More Options Button */}
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Content Sections */}
      <View style={styles.content}>
        {/* Top Artists Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Top artists this month</Text>
              <Text style={styles.sectionSubtitle}>Only visible to you</Text>
            </View>
            <TouchableOpacity onPress={handleShowAllArtists}>
              <Text style={styles.showAllText}>Show all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.artistsContainer}
          >
            {topArtists.map((artist) => (
              <TouchableOpacity
                key={artist.id}
                style={styles.artistCard}
                onPress={() => handleArtistPress(artist)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: artist.imageUrl }}
                  style={styles.artistImage}
                />
                <Text style={styles.artistName} numberOfLines={1}>
                  {artist.name}
                </Text>
                <Text style={styles.artistLabel}>Artist</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Top Tracks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Top tracks this month</Text>
              <Text style={styles.sectionSubtitle}>Only visible to you</Text>
            </View>
            <TouchableOpacity onPress={handleShowAllTracks}>
              <Text style={styles.showAllText}>Show all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tracksContainer}>
            {topTracks.map((track, index) => (
              <TouchableOpacity
                key={track.id}
                style={styles.trackRow}
                onPress={() => handleTrackPress(track)}
                activeOpacity={0.7}
              >
                <Text style={styles.trackNumber}>{index + 1}</Text>
                <Image
                  source={{ uri: track.albumCoverUrl }}
                  style={styles.trackImage}
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <View style={styles.trackArtistRow}>
                    {/* Explicit badge - TODO: Backend - Add isExplicit field to track */}
                    <View style={styles.explicitBadge}>
                      <Text style={styles.explicitText}>E</Text>
                    </View>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {track.artist}
                    </Text>
                  </View>
                </View>
                <Text style={styles.trackAlbum} numberOfLines={1}>
                  {track.album}
                </Text>
                {track.isLiked && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#1DB954"
                    style={styles.likedIcon}
                  />
                )}
                <Text style={styles.trackDuration}>{track.duration}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacing for music player */}
        <View style={[styles.bottomSpacing, { height: PLAYER_HEIGHT + insets.bottom }]} />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7C3AED', // Match gradient top color
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    backgroundColor: '#3D3D3D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 70,
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  userInfo: {
    flex: 1,
    marginLeft: 20,
  },
  profileLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statText: {
    color: '#E0E0E0',
    fontSize: 13,
  },
  statDot: {
    color: '#E0E0E0',
    fontSize: 13,
    marginHorizontal: 6,
  },
  moreButton: {
    marginTop: 20,
  },
  content: {
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  showAllText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  artistsContainer: {
    gap: 16,
  },
  artistCard: {
    width: 140,
    alignItems: 'center',
  },
  artistImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 12,
  },
  artistName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  tracksContainer: {
    gap: 8,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  trackNumber: {
    color: '#9CA3AF',
    fontSize: 14,
    width: 24,
    textAlign: 'center',
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginLeft: 12,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  trackArtistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  explicitBadge: {
    backgroundColor: '#9CA3AF',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 6,
  },
  explicitText: {
    color: '#121212',
    fontSize: 9,
    fontWeight: '700',
  },
  trackArtist: {
    color: '#9CA3AF',
    fontSize: 13,
    flex: 1,
  },
  trackAlbum: {
    color: '#9CA3AF',
    fontSize: 13,
    width: 100,
    textAlign: 'right',
    marginRight: 12,
  },
  likedIcon: {
    marginRight: 12,
  },
  trackDuration: {
    color: '#9CA3AF',
    fontSize: 13,
    width: 40,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 40,
  },
});

