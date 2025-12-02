// lib/types.ts
// TypeScript types for API responses

export type User = {
  id: number;
  name: string;
  username: string;
  email: string;
};

export type LeaderboardEntry = {
  userId: number;
  name: string;
  hours: number;
};

export type Album = {
  id: number;
  title: string;
  artist: string;
  coverUrl: string;
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


