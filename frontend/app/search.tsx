// app/search.tsx
// Search results screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchApi } from '@/lib/api';
import type { SearchResult } from '@/lib/types';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = params.q || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perform search when query changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      performSearch(searchQuery);
    } else {
      setResults([]);
      setError(null);
    }
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchApi.search(query);
      setResults(searchResults);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    performSearch(searchQuery);
  };

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'album') {
      router.push(`/album/${result.id}`);
    } else if (result.type === 'artist') {
      // TODO: Navigate to artist page when implemented
      console.log('Navigate to artist:', result.id);
    } else if (result.type === 'song') {
      // TODO: Navigate to song/album page
      console.log('Navigate to song:', result.id);
    }
  };

  const renderResult = (result: SearchResult, index: number) => {
    const iconName =
      result.type === 'song'
        ? 'musical-notes'
        : result.type === 'album'
        ? 'disc'
        : 'person';

    return (
      <TouchableOpacity
        key={`${result.type}-${result.id}-${index}`}
        style={styles.resultItem}
        onPress={() => handleResultPress(result)}
        activeOpacity={0.7}
      >
        {result.coverUrl ? (
          <Image source={{ uri: result.coverUrl }} style={styles.resultImage} />
        ) : (
          <View style={styles.resultImagePlaceholder}>
            <Ionicons name={iconName} size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {result.title}
          </Text>
          {result.artist && (
            <Text style={styles.resultArtist} numberOfLines={1}>
              {result.artist}
            </Text>
          )}
          <View style={styles.resultTypeBadge}>
            <Text style={styles.resultTypeText}>
              {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to play?"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus={!initialQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setResults([]);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
      >
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#A855F7" size="large" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => performSearch(searchQuery)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && searchQuery.trim().length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="search" size={64} color="#6B7280" />
            <Text style={styles.emptyText}>Start typing to search</Text>
            <Text style={styles.emptySubtext}>
              Find songs, albums, and artists
            </Text>
          </View>
        )}

        {!loading && !error && searchQuery.trim().length > 0 && results.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="musical-notes-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search term
            </Text>
          </View>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <Text style={styles.resultsHeader}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </Text>
            {results.map((result, index) => renderResult(result, index))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050712',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
  },
  resultsHeader: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    marginBottom: 8,
  },
  resultImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  resultImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultArtist: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 6,
  },
  resultTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4C1D95',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultTypeText: {
    color: '#F9FAFB',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4C1D95',
  },
  retryButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
});

