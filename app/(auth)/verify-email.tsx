import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function VerifyEmailScreen() {
  const { session } = useAuth();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  useEffect(() => {
    // Poll for email confirmation every 5 seconds
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        clearInterval(interval);
        router.replace('/(auth)/onboarding');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    if (!session?.user?.email) return;
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      });
      if (error) throw error;
      showSnackbar('Verification email sent!', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to resend email', 'error');
    }
  };

  const handleContinue = () => {
    router.replace('/(auth)/onboarding');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="email-outline"
          size={64}
          color={COLORS.primary}
        />
        <Text variant="headlineSmall" style={styles.title}>
          Verify Your Email
        </Text>
        <Text variant="bodyLarge" style={styles.message}>
          We sent a verification link to{'\n'}
          <Text style={styles.emailHighlight}>
            {session?.user?.email ?? 'your email'}
          </Text>
        </Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Please check your inbox and click the link to verify your account.
        </Text>

        <Button
          mode="contained"
          onPress={handleContinue}
          style={styles.continueButton}
          contentStyle={styles.buttonContent}
        >
          Continue to Setup
        </Button>

        <Button
          mode="outlined"
          onPress={handleResend}
          style={styles.resendButton}
          contentStyle={styles.buttonContent}
        >
          Resend Verification Email
        </Button>

        <Button
          mode="text"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
        >
          Back to Sign In
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.contentPadding,
  },
  title: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  message: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 24,
  },
  emailHighlight: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  hint: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  continueButton: {
    marginTop: SPACING.xl,
    minWidth: 250,
  },
  resendButton: {
    marginTop: SPACING.md,
    minWidth: 250,
  },
  backButton: {
    marginTop: SPACING.md,
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
});
