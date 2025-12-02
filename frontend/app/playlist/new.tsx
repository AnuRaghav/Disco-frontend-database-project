// app/playlist/new.tsx
// Spotify-style playlist creation screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playlistsApi } from '@/lib/api';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/types';

export default function NewPlaylistScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [playlistName, setPlaylistName] = useState('My Playlist');
  const [description, setDescription] = useState('');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Handle image picker
  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to choose a playlist cover.'
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
        setCoverImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Handle create playlist
  const handleCreatePlaylist = async () => {
    // Validate name
    if (!playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name.');
      return;
    }

    setIsCreating(true);
    try {
      const playlist = await playlistsApi.createPlaylist({
        name: playlistName.trim(),
        description: description.trim() || undefined,
        coverImageUri: coverImageUri || undefined,
        isPublic: true,
      });

      console.log('Playlist created successfully:', playlist);
      Alert.alert('Success', `Playlist "${playlist.name}" created!`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with gradient background */}
        <LinearGradient
          colors={['#6B21A8', '#4C1D95', '#1F1F1F']}
          locations={[0, 0.5, 1]}
          style={styles.headerGradient}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            {/* Left side - Cover image */}
            <TouchableOpacity
              style={styles.coverContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {coverImageUri ? (
                <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="musical-notes" size={80} color="#9CA3AF" />
                </View>
              )}
              {/* Edit overlay */}
              <View style={styles.editOverlay}>
                <Ionicons name="pencil" size={20} color="#FFFFFF" />
                <Text style={styles.editText}>Choose photo</Text>
              </View>
            </TouchableOpacity>

            {/* Right side - Playlist info */}
            <View style={styles.infoContainer}>
              <Text style={styles.playlistTypeLabel}>Public Playlist</Text>
              
              {/* Playlist name input */}
              <TextInput
                style={styles.playlistNameInput}
                value={playlistName}
                onChangeText={setPlaylistName}
                placeholder="My Playlist"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
              />

              {/* Owner info */}
              <View style={styles.ownerRow}>
                <Text style={styles.ownerText}>
                  {currentUser?.name || 'Loading...'}
                </Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.songCountText}>0 songs</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Description section */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionLabel}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Add an optional description"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
            maxLength={300}
          />
        </View>

        {/* Search section (disabled placeholder to match Spotify) */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Let's find something for your playlist</Text>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for songs or episodes"
              placeholderTextColor="#6B7280"
              editable={false}
            />
          </View>
          <Text style={styles.searchHint}>
            Song search will be available after playlist is created
          </Text>
        </View>

        {/* Create button */}
        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreatePlaylist}
          disabled={isCreating}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Playlist</Text>
          )}
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  headerContent: {
    flexDirection: 'row',
    gap: 20,
  },
  coverContainer: {
    width: 200,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3D3D3D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  playlistTypeLabel: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  playlistNameInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    padding: 0,
    marginBottom: 12,
    minHeight: 60,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dotSeparator: {
    color: '#E0E0E0',
    fontSize: 14,
    marginHorizontal: 6,
  },
  songCountText: {
    color: '#E0E0E0',
    fontSize: 14,
  },
  descriptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  descriptionLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionInput: {
    color: '#FFFFFF',
    fontSize: 14,
    padding: 12,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchSection: {
    padding: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 8,
  },
  searchHint: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#A855F7',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
});

