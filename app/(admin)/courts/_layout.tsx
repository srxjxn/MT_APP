import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function CourtsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Courts' }} />
      <Stack.Screen name="create" options={{ title: 'Add Court' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit Court' }} />
    </Stack>
  );
}
