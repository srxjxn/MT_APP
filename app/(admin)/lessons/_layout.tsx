import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function LessonsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Lesson Templates' }} />
      <Stack.Screen name="create" options={{ title: 'Create Template' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit Template' }} />
      <Stack.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Stack.Screen name="instance/[id]" options={{ title: 'Lesson Detail' }} />
    </Stack>
  );
}
