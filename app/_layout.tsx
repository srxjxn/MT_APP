import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, Snackbar } from 'react-native-paper';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import { useAuth } from '@/lib/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import { appTheme, COLORS } from '@/constants/theme';
import { useUIStore } from '@/lib/stores/uiStore';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated, userRole, userProfile, needsRoleSelection } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { snackbar, hideSnackbar } = useUIStore();

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && needsRoleSelection) {
      if ((segments as string[])[1] !== 'role-select') {
        router.replace('/(auth)/role-select');
      }
    } else if (isAuthenticated && userProfile && !userProfile.is_active) {
      // Inactive user (e.g. coach pending approval) — gate to pending screen
      if ((segments as string[])[1] !== 'pending-approval') {
        router.replace('/(auth)/pending-approval');
      }
    } else if (isAuthenticated && inAuthGroup) {
      // Route based on role
      switch (userRole) {
        case 'owner':
        case 'admin':
          router.replace('/(admin)/dashboard');
          break;
        case 'coach':
          router.replace('/(coach)/schedule');
          break;
        case 'parent':
        default:
          router.replace('/(parent)/home');
          break;
      }
    }
  }, [isLoading, isAuthenticated, userRole, userProfile, needsRoleSelection, segments]);

  const snackbarColor = snackbar.type === 'error' ? COLORS.error
    : snackbar.type === 'success' ? COLORS.success
    : COLORS.info;

  return (
    <>
      <Slot />
      <Snackbar
        visible={snackbar.visible}
        onDismiss={hideSnackbar}
        duration={3000}
        style={{ backgroundColor: snackbarColor }}
        action={{ label: 'OK', onPress: hideSnackbar, textColor: '#FFFFFF' }}
      >
        {snackbar.message}
      </Snackbar>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={appTheme}>
            <RootLayoutNav />
          </PaperProvider>
        </QueryClientProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
