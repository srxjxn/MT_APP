import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function CoachesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Coaches' }} />
      <Stack.Screen name="[id]" options={{ title: 'Coach Details' }} />
    </Stack>
  );
}
