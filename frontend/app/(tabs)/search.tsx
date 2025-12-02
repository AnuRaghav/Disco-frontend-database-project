// app/(tabs)/search.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { albumsApi } from '@/lib/api';
import type { Album } from '@/lib/types';

interface SearchResult {
  type: 'album' | 'song';
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  albumId?: string;
  songUrl?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const query = (params.query as string) || '';

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  // Fetch all albums first
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const allAlbums = await albumsApi.getAlbums();
        setAlbums(allAlbums);
      } catch (error) {
        console.error('Error fetching albums for search:', error);
      }
    };
    fetchAlbums();
  }, []);

  // Perform search when query or albums change
  useEffect(() => {
    if (!query || query.trim() === '') {
      setResults([]);
      return;
    }

    performSearch(query.trim().toLowerCase());
  }, [query, albums]);

  const performSearch = async (searchQuery: string) => {
    setSearching(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search through albums
      for (const album of albums) {
        // Check if album title or artist matches
        if (
          album.title.toLowerCase().includes(searchQuery) ||
          album.artist.toLowerCase().includes(searchQuery)
        ) {
          searchResults.push({
            type: 'album',
            id: album.id,
            title: album.title,
            artist: album.artist,
            coverUrl: album.coverUrl,
          });
        }

        // Search through songs in the album
        if (album.songs && Array.isArray(album.songs)) {
          for (const song of album.songs) {
            // Songs inherit artist from album (songs don't have separate artist field in current type)
            if (song.title.toLowerCase().includes(searchQuery)) {
              searchResults.push({
                type: 'song',
                id: `${album.id}-${song.title}`,
                title: song.title,
                artist: album.artist,
                coverUrl: album.coverUrl,
                albumId: album.id,
                songUrl: song.url,
              });
            }
          }
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAlbumPress = (albumId: string) => {
    router.push(`/album/${albumId}`);
  };

  const handleSongPress = (result: SearchResult) => {
    if (result.albumId) {
      // Navigate to album and play the song
      router.push(`/album/${result.albumId}`);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Results</Text>
      </View>

      {/* Search Query Display */}
      {query && (
        <View style={styles.queryContainer}>
          <Text style={styles.queryLabel}>Searching for:</Text>
          <Text style={styles.queryText}>"{query}"</Text>
        </View>
      )}

      {/* Results */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {searching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#3D3D3D" />
            <Text style={styles.emptyTitle}>
              {query ? 'No results found' : 'Start searching'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {query
                ? `Try searching for different albums or songs`
                : 'Enter a search term in the header'}
            </Text>
          </View>
        ) : (
          <>
            {/* Albums Section */}
            {results.filter((r) => r.type === 'album').length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Albums ({results.filter((r) => r.type === 'album').length})
                </Text>
                {results
                  .filter((r) => r.type === 'album')
                  .map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      style={styles.resultItem}
                      onPress={() => handleAlbumPress(result.id)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: result.coverUrl }}
                        style={styles.resultCover}
                      />
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {result.title}
                        </Text>
                        <View style={styles.resultMeta}>
                          <Ionicons name="albums-outline" size={14} color="#9CA3AF" />
                          <Text style={styles.resultArtist} numberOfLines={1}>
                            Album • {result.artist}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* Songs Section */}
            {results.filter((r) => r.type === 'song').length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Songs ({results.filter((r) => r.type === 'song').length})
                </Text>
                {results
                  .filter((r) => r.type === 'song')
                  .map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      style={styles.resultItem}
                      onPress={() => handleSongPress(result)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: result.coverUrl }}
                        style={styles.resultCover}
                      />
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {result.title}
                        </Text>
                        <View style={styles.resultMeta}>
                          <Ionicons name="musical-note-outline" size={14} color="#9CA3AF" />
                          <Text style={styles.resultArtist} numberOfLines={1}>
                            Song • {result.artist}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="play-circle-outline" size={24} color="#A855F7" />
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#050712',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  queryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1A1A1A',
  },
  queryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  queryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  section: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  resultCover: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#242424',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultArtist: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
});

