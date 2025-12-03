// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { LikesProvider } from '@/contexts/LikesContext';
import MusicPlayer from '@/components/MusicPlayer';
import '@/global.css';

function LayoutContent() {
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  
  // Show player on all authenticated screens (not on login/signup)
  const firstSegment = segments[0] as string | undefined;
  const isAuthenticated = firstSegment !== undefined && firstSegment !== 'index' && firstSegment !== 'signup';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* "/" → app/index.tsx (Login) */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* "/signup" → app/signup.tsx */}
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        {/* "/(tabs)" → app/(tabs)/index.tsx */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* "/profile" → app/profile.tsx */}
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        {/* "/playlist/new" → app/playlist/new.tsx */}
        <Stack.Screen name="playlist/new" options={{ headerShown: false }} />
        {/* "/playlist/[id]" → app/playlist/[id].tsx */}
        <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
        {/* "/album/[id]" → app/album/[id].tsx */}
        <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
      </Stack>
      {isAuthenticated && (
        <View style={[styles.globalPlayer, { paddingBottom: insets.bottom }]}>
          <MusicPlayer />
        </View>
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="dark">
      <MusicPlayerProvider>
        <LikesProvider>
          <LayoutContent />
        </LikesProvider>
      </MusicPlayerProvider>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  globalPlayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});