import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function SubscriptionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Subscriptions' }} />
      <Stack.Screen name="create" options={{ title: 'New Subscription' }} />
      <Stack.Screen name="[id]" options={{ title: 'Subscription Details' }} />
      <Stack.Screen name="payments" options={{ title: 'Payments' }} />
      <Stack.Screen name="packages" options={{ title: 'Student Packages' }} />
    </Stack>
  );
}
