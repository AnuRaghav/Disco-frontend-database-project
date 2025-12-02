// constants/storage.ts
// =============================================================================
// STORAGE KEYS - Centralized AsyncStorage keys
// =============================================================================
// 
// This file contains all AsyncStorage keys used throughout the app.
// Using centralized constants prevents typos and makes refactoring easier.
//
// IMPORTANT: Always use these constants instead of hardcoded strings!
// =============================================================================

/**
 * Storage key for user data
 * Used to store the current user's profile information
 */
export const STORAGE_USER_KEY = 'discoUser';

/**
 * Storage key for authentication token
 * Used to store the JWT token for API requests
 */
export const STORAGE_TOKEN_KEY = 'discoToken';

/**
 * Storage key for app preferences
 * Used to store user preferences (theme, language, etc.)
 */
export const STORAGE_PREFERENCES_KEY = 'discoPreferences';

// Add more storage keys as needed
// Example:
// export const STORAGE_PLAYLIST_CACHE_KEY = 'discoPlaylistCache';
// export const STORAGE_RECENTLY_PLAYED_KEY = 'discoRecentlyPlayed';

