// contexts/LikesContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LikesContextType {
  likedSongs: Set<string>; // Set of song URLs that are liked
  toggleLike: (songUrl: string, userEmail: string) => Promise<void>;
  isLiked: (songUrl: string) => boolean;
  loadLikes: (userEmail: string) => Promise<void>;
}

const LikesContext = createContext<LikesContextType | undefined>(undefined);

const LIKES_STORAGE_KEY = 'discoLikes';

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());

  const getStorageKey = (userEmail: string) => {
    return `${LIKES_STORAGE_KEY}_${userEmail}`;
  };

  const loadLikes = async (userEmail: string) => {
    try {
      const storageKey = getStorageKey(userEmail);
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const likedUrls: string[] = JSON.parse(stored);
        setLikedSongs(new Set(likedUrls));
      } else {
        setLikedSongs(new Set());
      }
    } catch (error) {
      console.error('Error loading likes:', error);
      setLikedSongs(new Set());
    }
  };

  const toggleLike = async (songUrl: string, userEmail: string) => {
    try {
      const newLikedSongs = new Set(likedSongs);
      
      if (newLikedSongs.has(songUrl)) {
        newLikedSongs.delete(songUrl);
      } else {
        newLikedSongs.add(songUrl);
      }
      
      setLikedSongs(newLikedSongs);
      
      // Save to AsyncStorage
      const storageKey = getStorageKey(userEmail);
      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(newLikedSongs)));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const isLiked = (songUrl: string): boolean => {
    return likedSongs.has(songUrl);
  };

  return (
    <LikesContext.Provider
      value={{
        likedSongs,
        toggleLike,
        isLiked,
        loadLikes,
      }}
    >
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikesContext);
  if (context === undefined) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
}

