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
    try {
      const requestPayload = { username, email, password };
      console.log('Signup request payload:', { username, email, password: '***' });
      console.log('Signup request URL:', `${BASE_URL}/signup`);
      
      const response = await api.post('/signup', requestPayload);
      console.log('Signup response status:', response.status);
      console.log('Signup response data:', JSON.stringify(response.data, null, 2));
      
      // Handle Lambda response format: { statusCode: 200, body: "..." }
      let responseBody: any;
      if (response.data && typeof response.data === 'object' && 'body' in response.data) {
        // Lambda proxy integration format: body is a JSON string
        try {
          responseBody = JSON.parse(response.data.body);
        } catch (parseError) {
          console.error('Error parsing response body:', parseError, response.data.body);
          throw new Error('Invalid response format from server');
        }
      } else {
        // Direct response (API Gateway configured to parse Lambda response)
        responseBody = response.data;
      }

      // Check for error in response
      if (responseBody.statusCode && responseBody.statusCode !== 200) {
        const errorMsg = responseBody.message || responseBody.error || 'Signup failed';
        console.error('Signup failed with status:', responseBody.statusCode, errorMsg);
        throw new Error(errorMsg);
      }

      // Check if response indicates an error even with 200 status
      if (responseBody.error || !responseBody.token || !responseBody.user) {
        const errorMsg = responseBody.message || responseBody.error || 'Signup failed - missing data';
        console.error('Signup response missing required fields:', responseBody);
        throw new Error(errorMsg);
      }

      // Extract token and user from response
      const token = responseBody.token;
      const backendUser = responseBody.user;
      
      if (!backendUser || !backendUser.userID) {
        console.error('Invalid user data in response:', backendUser);
        throw new Error('Invalid user data received from server');
      }
      
      // Map backend user format (userID) to frontend format (id)
      // Backend doesn't return name, so we use username as fallback
      const user: User = {
        id: backendUser.userID,
        name: name || backendUser.username,
        username: backendUser.username,
        email: backendUser.email,
      };

      // Store user and token
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);

      console.log('Signup successful, user stored:', user.id);
      return { user, token };
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data ? JSON.parse(error.config.data) : null,
        },
      });
      
      // Log the full error response body if available
      if (error.response?.data) {
        console.error('Full error response data:', JSON.stringify(error.response.data, null, 2));
        // Try to extract error message from Lambda error format
        if (typeof error.response.data === 'object' && 'body' in error.response.data) {
          try {
            const errorBody = JSON.parse(error.response.data.body);
            console.error('Parsed error body:', JSON.stringify(errorBody, null, 2));
          } catch (e) {
            console.error('Could not parse error body:', error.response.data.body);
          }
        }
      }
      
      // Handle network errors (no response)
      if (!error.response) {
        console.error('Network error - no response from server');
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Extract error message from response if available
      if (error.response?.data) {
        let errorBody: any;
        try {
          // Try to parse if it's a string or has a body property
          if (typeof error.response.data === 'string') {
            errorBody = JSON.parse(error.response.data);
          } else if (typeof error.response.data === 'object' && 'body' in error.response.data) {
            // Lambda proxy integration format: body is a JSON string
            errorBody = JSON.parse(error.response.data.body);
          } else {
            errorBody = error.response.data;
          }
          
          // Extract error message from various possible fields
          const errorMsg = 
            errorBody.message || 
            errorBody.error || 
            errorBody.errorMessage ||
            (errorBody.statusCode === 500 ? 'Internal server error. Please try again later.' : `Server error (${error.response.status})`);
          
          throw new Error(errorMsg);
        } catch (parseError) {
          // If we can't parse the error, use status-based message
          const status = error.response.status;
          if (status === 500) {
            throw new Error('Internal server error. Please try again later.');
          } else if (status === 400) {
            throw new Error('Invalid request. Please check your information.');
          } else if (status === 409) {
            throw new Error('Username or email already exists.');
          } else {
            throw new Error(`Server error: ${status || 'Unknown'}`);
          }
        }
      }
      
      // If it's already our custom error, re-throw it
      if (error.message && error.message !== 'Request failed with status code') {
        throw error;
      }
      
      throw new Error(error.message || 'Signup failed. Please try again.');
    }
  },

  /**
   * Log in an existing user
   * POST /login
   */
  login: async (
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    try {
      const response = await api.post('/login', { email, password });
      
      // Handle Lambda response format: { statusCode: 200, body: "..." }
      let responseBody: any;
      if (response.data && typeof response.data === 'object' && 'body' in response.data) {
        // Lambda proxy integration format: body is a JSON string
        responseBody = JSON.parse(response.data.body);
      } else {
        // Direct response (API Gateway configured to parse Lambda response)
        responseBody = response.data;
      }

      // Check for error in response
      if (responseBody.statusCode && responseBody.statusCode !== 200) {
        throw new Error(responseBody.message || 'Login failed');
      }

      // Extract token and user from response
      const token = responseBody.token;
      const backendUser = responseBody.user;
      
      // Map backend user format (userID) to frontend format (id)
      // Backend doesn't return name, so we use username as fallback
      const user: User = {
        id: backendUser.userID,
        name: backendUser.username, // Use username as name since backend doesn't provide name
        username: backendUser.username,
        email: backendUser.email,
      };

      // Store user and token
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);

      return { user, token };
    } catch (error: any) {
      console.error('Login error:', error);
      // Extract error message from response if available
      if (error.response?.data) {
        let errorBody: any;
        if (typeof error.response.data === 'object' && 'body' in error.response.data) {
          errorBody = JSON.parse(error.response.data.body);
        } else {
          errorBody = error.response.data;
        }
        throw new Error(errorBody.message || 'Invalid email or password. Please try again.');
      }
      throw new Error(error.message || 'Invalid email or password. Please try again.');
    }
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



