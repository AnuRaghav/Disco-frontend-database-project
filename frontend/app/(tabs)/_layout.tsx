// app/(tabs)/_layout.tsx
import { Slot } from 'expo-router';

export default function TabsLayout() {
  // Just render whatever is in (tabs), no bottom tab bar, no extra logic
  return <Slot />;
}