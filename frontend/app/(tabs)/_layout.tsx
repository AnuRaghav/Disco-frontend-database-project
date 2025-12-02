// app/(tabs)/_layout.tsx
// =============================================================================
// TABS LAYOUT - Main authenticated layout with header
// =============================================================================
// 
// BACKEND INTEGRATION NOTES:
// --------------------------
// This layout fetches the current user to display their profile image in the header.
// The user data is fetched from the authApi.getCurrentUser() method.
// 
// TODO: Backend - Ensure the user endpoint returns profileImageUrl field
// =============================================================================

import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/header';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/types';

export default function TabsLayout() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  const handleSearch = (query: string) => {
    // Navigate to search screen with query
    if (query && query.trim() !== '') {
      router.push(`/(tabs)/search?query=${encodeURIComponent(query)}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        onSearch={handleSearch} 
        profileImageUrl={user?.profileImageUrl}
      />
      <View style={styles.content}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050712',
  },
  content: {
    flex: 1,
  },
});
