// lib/types.ts
// TypeScript types for API responses

export type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  profileImageUrl?: string; // TODO: Backend - Add profile image URL field to user table
};

export type LeaderboardEntry = {
  userId: number;
  name: string;
  hours: number;
};

export type Song = {
  title: string;
  url: string;
};

export type Album = {
  id: string; // API returns string IDs like "an-evening-with-silk-sonic"
  title: string;
  artist: string;
  coverUrl: string;
  songs: Song[];
  artistId?: number;
};

export type Track = {
  id: number;
  title: string;
  artist: string;
  albumId: number;
  duration?: number;
};

export type Playlist = {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  trackCount?: number;
  description?: string; // Playlist bio/description
  coverImageUri?: string; // Playlist cover image
  ownerName?: string; // Display name of playlist owner
  isPublic?: boolean; // Whether playlist is public or private
};

export type Comment = {
  id: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
};

export type SearchResult = {
  type: 'song' | 'album' | 'artist';
  id: number;
  title: string;
  artist?: string;
  coverUrl?: string;
};

export type Artist = {
  id: number;
  name: string;
  bio?: string;
  coverUrl?: string;
  followerCount?: number;
  isFollowing?: boolean;
};



