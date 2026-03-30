import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { PaperProvider, Snackbar } from 'react-native-paper';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppState, type AppStateStatus, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import { appTheme, COLORS } from '@/constants/theme';
import { useUIStore } from '@/lib/stores/uiStore';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated, userRole, userProfile, needsRoleSelection, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { snackbar, hideSnackbar } = useUIStore();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        focusManager.setFocused(true);
      } else {
        focusManager.setFocused(false);
      }
      appState.current = nextAppState;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      const authPage = (segments as string[])[1];
      const publicPages = ['login', 'register', 'forgot-password', 'verify-email', 'reset-password'];
      if (!inAuthGroup || !publicPages.includes(authPage)) {
        router.replace('/(auth)/login');
      }
    } else if (isAuthenticated && needsRoleSelection) {
      if ((segments as string[])[1] !== 'role-select') {
        router.replace('/(auth)/role-select');
      }
    } else if (isAuthenticated && needsOnboarding && userProfile?.role === 'parent') {
      if (segments[0] !== '(auth)' || (segments as string[])[1] !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
    } else if (isAuthenticated && userProfile && !userProfile.is_active) {
      // Inactive user (e.g. coach pending approval) — gate to pending screen
      if ((segments as string[])[1] !== 'pending-approval') {
        router.replace('/(auth)/pending-approval');
      }
    } else if (isAuthenticated && inAuthGroup && userProfile) {
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
  }, [isLoading, isAuthenticated, userRole, userProfile, needsRoleSelection, needsOnboarding, segments]);

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
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={appTheme}>
          <RootLayoutNav />
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
