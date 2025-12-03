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
   * Expected request body: { username, email, password }
   */
  signup: async (
    name: string,
    username: string,
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    console.log('========================================');
    console.log('🔵 SIGNUP API CALL');
    console.log('========================================');
    console.log('Request data:', { username, email, password: '***' });
    
    try {
      // API expects: { username, email, password } (no name field)
      const requestBody = {
        username,
        email,
        password,
      };
      
      console.log('Request body:', JSON.stringify(requestBody));
      console.log('Making POST request to /signup...');
      
      const response = await api.post('/signup', requestBody);
      
      console.log('========================================');
      console.log('✅ SIGNUP SUCCESS');
      console.log('========================================');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      // Handle Lambda response format: { statusCode: 200, body: "..." }
      let responseData: any = response.data;
      
      if (responseData && typeof responseData === 'object' && 'body' in responseData) {
        // Lambda proxy integration format: body is a JSON string
        try {
          responseData = JSON.parse(responseData.body);
          console.log('Parsed response body:', responseData);
        } catch (parseError) {
          console.error('Error parsing response body:', parseError);
          throw new Error('Failed to parse signup response');
        }
      }
      
      // Extract user and token from response
      const user: User = {
        id: responseData.user?.id || responseData.id,
        name: responseData.user?.name || name, // Use provided name as fallback
        username: responseData.user?.username || responseData.username || username,
        email: responseData.user?.email || responseData.email || email,
        isAdmin: responseData.user?.isAdmin || responseData.isAdmin || false,
      };
      
      const token = responseData.token || responseData.user?.token || '';
      
      console.log('Extracted user:', user);
      console.log('Token received:', token ? 'Yes' : 'No');
      
      // Store user and token
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
      
      console.log('User and token stored in AsyncStorage');
      console.log('========================================');
      
      return { user, token };
    } catch (error: any) {
      console.log('========================================');
      console.error('❌ SIGNUP ERROR');
      console.log('========================================');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      console.error('Error response status:', error?.response?.status);
      console.log('========================================');
      throw error;
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
    // Admin login - skip API call
    const ADMIN_EMAIL = 'admin@disco.com';
    const ADMIN_PASSWORD = 'adminadmin';
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser: User = {
        id: 0, // Special ID for admin
        name: 'Admin',
        username: 'admin',
        email: ADMIN_EMAIL,
        isAdmin: true,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, MOCK_JWT_TOKEN);
      return { user: adminUser, token: MOCK_JWT_TOKEN };
    }

    // Regular user login - call API
    try {
      const response = await api.post('/login', { email, password });
      
      // Handle Lambda response format: { statusCode: 200, body: "..." }
      let loginData: { user: User; token: string } | null = null;
      
      if (response.data && typeof response.data === 'object' && 'body' in response.data) {
        // Lambda proxy integration format: body is a JSON string
        try {
          loginData = JSON.parse(response.data.body);
        } catch (parseError) {
          console.error('Error parsing login body:', parseError);
          throw new Error('Failed to parse login response');
        }
      } else {
        // Direct response format
        loginData = response.data;
      }
      
      if (!loginData || !loginData.user) {
        throw new Error('Invalid login response');
      }
      
      // Ensure isAdmin is set to false for regular users
      const user: User = {
        ...loginData.user,
        isAdmin: false,
      };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, loginData.token);
      return { user, token: loginData.token };
    } catch (error) {
      // If API call fails, throw the error to be handled by the login screen
      console.error('Login API error:', error);
      throw error;
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
   * Returns leaderboard data from the API
   */
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    try {
      const response = await api.get('/leaderboard');
      
      // Handle Lambda response format: { statusCode: 200, body: "..." }
      // API Gateway may return either format depending on configuration
      let leaderboardData: Array<{
        leaderboardID: number;
        email: string;
        score: number;
      }> = [];
      
      if (response.data && typeof response.data === 'object' && 'body' in response.data) {
        // Lambda proxy integration format: body is a JSON string
        try {
          leaderboardData = JSON.parse(response.data.body);
        } catch (parseError) {
          console.error('Error parsing leaderboard body:', parseError);
          throw new Error('Failed to parse leaderboard response');
        }
      } else if (Array.isArray(response.data)) {
        // Direct array response (API Gateway configured to parse Lambda response)
        leaderboardData = response.data;
      } else {
        // Fallback: try to use response.data as-is
        leaderboardData = response.data || [];
      }
      
      // Ensure leaderboardData is an array
      if (!Array.isArray(leaderboardData)) {
        console.error('Unexpected leaderboard response format:', leaderboardData);
        return [];
      }
      
      // Map API response to LeaderboardEntry format
      // Extract name from email (username part before @) or use email as fallback
      const mappedEntries: LeaderboardEntry[] = leaderboardData.map((entry) => {
        // Extract name from email - get the part before @
        const emailName = entry.email.split('@')[0];
        // Capitalize first letter and format nicely
        const displayName = emailName
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        
        return {
          userId: entry.leaderboardID,
          name: displayName || entry.email, // Use formatted name or email as fallback
          hours: entry.score, // Using score directly as hours - adjust conversion if needed
        };
      });
      
      return mappedEntries;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  },

  /**
   * Update leaderboard score for a user
   * POST /leaderboard
   * Called when a user plays a song to increment their score
   */
  updateLeaderboardScore: async (email: string): Promise<void> => {
    try {
      console.log('========================================');
      console.log('UPDATE LEADERBOARD SCORE API CALL');
      console.log('========================================');
      console.log('Email:', email);
      
      // Send email in request body - API Gateway will transform it to Lambda event format
      const requestBody = { email: email };

      console.log('Request URL:', `${BASE_URL}/leaderboard`);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await api.post('/leaderboard', requestBody);

      console.log('========================================');
      console.log('UPDATE LEADERBOARD SCORE API RESPONSE');
      console.log('========================================');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
      console.log('========================================');

      // Handle Lambda response format if needed
      if (response.data && typeof response.data === 'object' && 'statusCode' in response.data) {
        // Lambda proxy integration format
        if (response.data.statusCode !== 200 && response.data.statusCode !== 201) {
          const errorBody = typeof response.data.body === 'string' 
            ? JSON.parse(response.data.body) 
            : response.data.body;
          const errorMessage = errorBody?.message || 'Failed to update leaderboard score';
          console.error('Leaderboard update failed:', errorMessage);
          throw new Error(errorMessage);
        }
        console.log('✅ Leaderboard score updated successfully');
      } else if (response.status === 200 || response.status === 201) {
        console.log('✅ Leaderboard score updated successfully (direct response)');
      }

      // Success - no return value needed
      return;
    } catch (error: any) {
      console.error('========================================');
      console.error('ERROR UPDATING LEADERBOARD SCORE');
      console.error('========================================');
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.response?.status);
      console.error('Full error:', error);
      console.error('========================================');
      // Don't throw - we don't want to interrupt playback if score update fails
      // Just log the error for debugging
    }
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

  /**
   * Delete album (admin only)
   * POST /delete-album
   * Sends event JSON structure with album path
   */
  deleteAlbum: async (albumId: string): Promise<void> => {
    try {
      const eventData = {
        rawPath: `/album/${albumId}`,
        requestContext: {
          http: {
            method: 'DELETE',
            path: `/album/${albumId}`,
          },
        },
      };

      const fullUrl = `${BASE_URL}/delete-album`;
      console.log('========================================');
      console.log('DELETE ALBUM API CALL');
      console.log('========================================');
      console.log('URL:', fullUrl);
      console.log('Method: POST');
      console.log('Request Body:', JSON.stringify(eventData, null, 2));
      console.log('Album ID:', albumId);
      console.log('Full Request:', {
        url: fullUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer [token from storage]',
        },
        data: eventData,
      });
      console.log('========================================');
      
      const response = await api.post('/delete-album', eventData);
      
      console.log('========================================');
      console.log('DELETE ALBUM API RESPONSE');
      console.log('========================================');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', response.headers);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
      console.log('Full Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      });
      console.log('========================================');
      
      // Handle Lambda response format if needed
      if (response.data && typeof response.data === 'object' && 'body' in response.data) {
        // Lambda proxy integration format - check for success
        try {
          const body = JSON.parse(response.data.body);
          if (response.data.statusCode !== 200 && response.data.statusCode !== 204) {
            throw new Error(body.message || 'Failed to delete album');
          }
        } catch (parseError) {
          // If parsing fails but status is 200/204, consider it success
          if (response.data.statusCode === 200 || response.data.statusCode === 204) {
            return;
          }
          throw new Error('Failed to delete album');
        }
      }
      
      // If response status is 200/204, consider it success
      if (response.status === 200 || response.status === 204) {
        return;
      }
      
      return;
    } catch (error: any) {
      console.error('Error deleting album:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      throw error;
    }
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



