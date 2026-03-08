import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function ParentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Parents' }} />
      <Stack.Screen name="[id]" options={{ title: 'Parent Detail' }} />
    </Stack>
  );
}
