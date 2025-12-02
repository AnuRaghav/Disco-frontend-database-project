// lib/api.ts
// Central API wrapper for Disco frontend

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  LeaderboardEntry,
  Album,
  Track,
  Playlist,
  Comment,
  SearchResult,
  Artist,
} from './types';
import { STORAGE_USER_KEY, STORAGE_TOKEN_KEY } from '@/constants/storage';

// Valid JWT token for testing (expires in 30 days)
// TODO: Replace with real authentication when backend is ready
// This token is signed with the same secret as the Lambda functions
const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImVtYWlsIjoidGVzdEBkaXNjby5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzY0NzA4NDA2LCJleHAiOjE3NjczMDA0MDZ9.oF7CV9zTUpST05Le6xhNYDjVP2CM0kdEJHxVGJUavxo';

const STORAGE_KEY = STORAGE_USER_KEY; // Alias for backward compatibility

// Base URL - API Gateway endpoint
const BASE_URL = 'https://k81z0bskkc.execute-api.us-east-1.amazonaws.com';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear storage and redirect to login
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const authApi = {
  /**
   * Sign up a new user
   * POST /signup
   */
  signup: async (
    name: string,
    username: string,
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    // TODO: Replace with actual API call when backend is ready
    // const response = await api.post('/signup', { name, username, email, password });
    // return response.data;

    // Mock response for now
    const mockUser: User = { id: 1, name, username, email };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, MOCK_JWT_TOKEN);
    return { user: mockUser, token: MOCK_JWT_TOKEN };
  },

  /**
   * Log in an existing user
   * POST /login
   */
  login: async (
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    // TODO: Replace with actual API call when backend is ready
    // const response = await api.post('/login', { email, password });
    // return response.data;

    // Mock response for now
    const mockUser: User = {
      id: 1,
      name: 'Test User',
      username: 'testuser',
      email,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, MOCK_JWT_TOKEN);
    return { user: mockUser, token: MOCK_JWT_TOKEN };
  },

  /**
   * Get current user from storage
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.log('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Logout: Clear storage
   */
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
  },
};

// ============================================================================
// LEADERBOARD
// ============================================================================

export const leaderboardApi = {
  /**
   * Get leaderboard entries
   * GET /leaderboard
   */
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    // TODO: Replace with actual API call when backend is ready
    // const response = await api.get('/leaderboard');
    // return response.data;

    // Mock data matching current UI structure
    return [
      { userId: 1, name: 'Meghan J.', hours: 47 },
      { userId: 2, name: 'Bryan Wolf', hours: 41 },
      { userId: 3, name: 'Alex Turner', hours: 33 },
      { userId: 4, name: 'Sarah Chen', hours: 34 },
      { userId: 5, name: 'Mike Johnson', hours: 28 },
    ];
  },
};

// ============================================================================
// ALBUMS & MUSIC
// ============================================================================

export const albumsApi = {
  /**
   * Get albums for home page
   * GET /albums
   * Fetches albums from S3 bucket via API Gateway
   * Handles Lambda response format with statusCode and body as JSON string
   */
  getAlbums: async (filter?: 'forYou' | 'trending' | 'new'): Promise<Album[]> => {
    try {
      const response = await api.get('/albums', { 
        params: filter ? { filter } : undefined 
      });
      
      // Handle Lambda response format: { statusCode: 200, body: "..." }
      // API Gateway may return either format depending on configuration
      let albums: Album[] = [];
      
      if (response.data && typeof response.data === 'object' && 'body' in response.data) {
        // Lambda proxy integration format: body is a JSON string
        try {
          albums = JSON.parse(response.data.body);
        } catch (parseError) {
          console.error('Error parsing albums body:', parseError);
          throw new Error('Failed to parse albums response');
        }
      } else if (Array.isArray(response.data)) {
        // Direct array response (API Gateway configured to parse Lambda response)
        albums = response.data;
      } else {
        // Fallback: try to use response.data as-is
        albums = response.data || [];
      }
      
      // Ensure albums is an array
      if (!Array.isArray(albums)) {
        console.error('Unexpected albums response format:', albums);
        return [];
      }
      
      // Handle empty coverUrl - provide default placeholder
      albums = albums.map((album) => ({
        ...album,
        coverUrl: album.coverUrl || 'https://images.pexels.com/photos/63703/turntable-record-player-vinyl-sound-63703.jpeg?auto=compress&cs=tinysrgb&w=300',
      }));
      
      return albums;
    } catch (error) {
      console.error('Error fetching albums from S3:', error);
      throw error;
    }
  },

  /**
   * Get album by ID
   * GET /albums/:id
   */
  getAlbumById: async (id: number): Promise<Album> => {
    // TODO: Replace with actual API call
    throw new Error('Not implemented');
  },
};

// ============================================================================
// PLAYLISTS
// ============================================================================

interface CreatePlaylistPayload {
  name: string;
  description?: string;
  coverImageUri?: string;
  isPublic?: boolean;
}

export const playlistsApi = {
  /**
   * Get user's playlists
   * GET /playlists
   */
  getPlaylists: async (): Promise<Playlist[]> => {
    // TODO: Replace with actual API call when backend is ready
    // const response = await api.get('/playlists');
    // return response.data;
    return [];
  },

  /**
   * Create a new playlist
   * POST /playlists
   */
  createPlaylist: async (payload: CreatePlaylistPayload): Promise<Playlist> => {
    // TODO: Replace with actual API call when backend is ready
    // const response = await api.post('/playlists', payload);
    // return response.data;

    // Mock implementation for frontend-only development
    const currentUser = await authApi.getCurrentUser();
    const mockPlaylist: Playlist = {
      id: Date.now(), // Use timestamp as mock ID
      name: payload.name,
      description: payload.description,
      coverImageUri: payload.coverImageUri,
      userId: currentUser?.id || 1,
      ownerName: currentUser?.name || 'Unknown User',
      trackCount: 0,
      isPublic: payload.isPublic ?? true,
      createdAt: new Date().toISOString(),
    };

    console.log('Mock playlist created:', mockPlaylist);
    return mockPlaylist;
  },

  /**
   * Get playlist by ID
   * GET /playlists/:id
   */
  getPlaylistById: async (id: number): Promise<Playlist> => {
    // TODO: Replace with actual API call
    // const response = await api.get(`/playlists/${id}`);
    // return response.data;
    throw new Error('Not implemented');
  },

  /**
   * Update playlist
   * PUT /playlists/:id
   */
  updatePlaylist: async (id: number, payload: Partial<CreatePlaylistPayload>): Promise<Playlist> => {
    // TODO: Replace with actual API call
    // const response = await api.put(`/playlists/${id}`, payload);
    // return response.data;
    throw new Error('Not implemented');
  },

  /**
   * Delete playlist
   * DELETE /playlists/:id
   */
  deletePlaylist: async (id: number): Promise<void> => {
    // TODO: Replace with actual API call
    // await api.delete(`/playlists/${id}`);
    throw new Error('Not implemented');
  },

  /**
   * Add track to playlist
   * POST /playlists/:id/tracks
   */
  addTrackToPlaylist: async (
    playlistId: number,
    trackId: number
  ): Promise<void> => {
    // TODO: Replace with actual API call
    // await api.post(`/playlists/${playlistId}/tracks`, { trackId });
    throw new Error('Not implemented');
  },

  /**
   * Remove track from playlist
   * DELETE /playlists/:id/tracks/:trackId
   */
  removeTrackFromPlaylist: async (
    playlistId: number,
    trackId: number
  ): Promise<void> => {
    // TODO: Replace with actual API call
    // await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
    throw new Error('Not implemented');
  },
};

// ============================================================================
// SEARCH (Placeholder - will implement in next step)
// ============================================================================

export const searchApi = {
  /**
   * Global search
   * GET /search?q=...
   */
  search: async (query: string): Promise<SearchResult[]> => {
    // TODO: Replace with actual API call
    // const response = await api.get('/search', { params: { q: query } });
    // return response.data;
    return [];
  },
};

// ============================================================================
// COMMENTS (Placeholder - will implement in next step)
// ============================================================================

export const commentsApi = {
  getComments: async (musicId: number): Promise<Comment[]> => {
    // TODO: GET /music/:id/comments
    return [];
  },
  createComment: async (
    musicId: number,
    content: string
  ): Promise<Comment> => {
    // TODO: POST /music/:id/comments
    throw new Error('Not implemented');
  },
  deleteComment: async (commentId: number): Promise<void> => {
    // TODO: DELETE /comments/:id
    throw new Error('Not implemented');
  },
};

// ============================================================================
// ARTISTS (Placeholder - will implement in next step)
// ============================================================================

export const artistsApi = {
  getArtist: async (id: number): Promise<Artist> => {
    // TODO: GET /artist/:id
    throw new Error('Not implemented');
  },
  followArtist: async (id: number): Promise<void> => {
    // TODO: POST /artist/:id/follow
    throw new Error('Not implemented');
  },
  unfollowArtist: async (id: number): Promise<void> => {
    // TODO: DELETE /artist/:id/follow
    throw new Error('Not implemented');
  },
};

// Export default api instance for custom requests
export default api;



