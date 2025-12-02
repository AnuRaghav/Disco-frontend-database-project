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

const STORAGE_KEY = 'discoUser';
const STORAGE_TOKEN_KEY = 'discoToken';

// Base URL - replace with actual backend URL when available
const BASE_URL = 'https://example.com/api';

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
    const mockToken = 'mock-jwt-token';
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, mockToken);
    return { user: mockUser, token: mockToken };
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
    const mockToken = 'mock-jwt-token';
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, mockToken);
    return { user: mockUser, token: mockToken };
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
   * GET /albums or GET /home
   */
  getAlbums: async (filter?: 'forYou' | 'trending' | 'new'): Promise<Album[]> => {
    // TODO: Replace with actual API call when backend is ready
    // const response = await api.get('/albums', { params: { filter } });
    // return response.data;

    // Mock data matching current structure
    return [
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
// PLAYLISTS (Placeholder - will implement in next step)
// ============================================================================

export const playlistsApi = {
  getPlaylists: async (): Promise<Playlist[]> => {
    // TODO: GET /playlists
    return [];
  },
  createPlaylist: async (name: string): Promise<Playlist> => {
    // TODO: POST /playlists
    throw new Error('Not implemented');
  },
  updatePlaylist: async (id: number, name: string): Promise<Playlist> => {
    // TODO: PUT /playlists/:id
    throw new Error('Not implemented');
  },
  deletePlaylist: async (id: number): Promise<void> => {
    // TODO: DELETE /playlists/:id
    throw new Error('Not implemented');
  },
  addTrackToPlaylist: async (
    playlistId: number,
    trackId: number
  ): Promise<void> => {
    // TODO: POST /playlists/:id/tracks
    throw new Error('Not implemented');
  },
  removeTrackFromPlaylist: async (
    playlistId: number,
    trackId: number
  ): Promise<void> => {
    // TODO: DELETE /playlists/:id/tracks/:trackID
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


