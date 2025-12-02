// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GluestackUIProvider mode="dark">
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
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}