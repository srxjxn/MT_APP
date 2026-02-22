import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function PayrollLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Coach Payroll' }} />
      <Stack.Screen name="generate" options={{ title: 'Generate Payroll' }} />
      <Stack.Screen name="[id]" options={{ title: 'Payout Details' }} />
    </Stack>
  );
}
