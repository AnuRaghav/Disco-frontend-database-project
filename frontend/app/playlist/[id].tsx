// app/playlist/[id].tsx
// Playlist detail screen (placeholder for future implementation)

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PlaylistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Playlist</Text>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.placeholderContainer}>
            <Ionicons name="musical-notes" size={80} color="#6B7280" />
            <Text style={styles.placeholderTitle}>Playlist Detail</Text>
            <Text style={styles.placeholderText}>
              Playlist ID: {id}
            </Text>
            <Text style={styles.placeholderSubtext}>
              This screen will display playlist details, tracks, and allow playback.
            </Text>
            <Text style={styles.placeholderSubtext}>
              Coming soon in future implementation!
            </Text>
          </View>
        </ScrollView>
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderContainer: {
    alignItems: 'center',
    maxWidth: 400,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginBottom: 8,
  },
  placeholderSubtext: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

