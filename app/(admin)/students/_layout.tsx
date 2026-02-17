import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function StudentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Students' }} />
      <Stack.Screen name="create" options={{ title: 'Add Student' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit Student' }} />
    </Stack>
  );
}
