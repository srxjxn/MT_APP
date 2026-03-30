import React, { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  useEffect(() => {
    const restoreSession = async (url: string | null) => {
      if (!url) {
        // No URL — check if there's already an active session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSessionReady(true);
        } else {
          setSessionError(true);
        }
        return;
      }
      try {
        const parsed = new URL(url);
        // Tokens are in the hash fragment: #access_token=...&refresh_token=...
        const params = new URLSearchParams(parsed.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          setSessionReady(true);
        } else {
          // No tokens in URL — check for existing session
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setSessionReady(true);
          } else {
            setSessionError(true);
          }
        }
      } catch {
        setSessionError(true);
      }
    };

    Linking.getInitialURL().then(restoreSession);

    const sub = Linking.addEventListener('url', ({ url }) => restoreSession(url));
    return () => sub.remove();
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady && !sessionError) {
    return (
      <View style={styles.centeredContent}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text variant="bodyLarge" style={styles.verifyingText}>
          Verifying...
        </Text>
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.centeredContent}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={COLORS.error}
        />
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Invalid or Expired Link
        </Text>
        <Text variant="bodyLarge" style={styles.errorMessage}>
          This password reset link is no longer valid. Please request a new one.
        </Text>
        <Button
          mode="contained"
          onPress={() => router.replace('/(auth)/forgot-password')}
          style={styles.doneButton}
          contentStyle={styles.buttonContent}
        >
          Request New Link
        </Button>
        <Button
          mode="text"
          compact
          onPress={() => router.replace('/(auth)/login')}
          style={{ marginTop: SPACING.sm }}
        >
          Back to Sign In
        </Button>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={64}
            color={COLORS.success}
          />
          <Text variant="headlineSmall" style={styles.doneTitle}>
            Password Updated
          </Text>
          <Text variant="bodyLarge" style={styles.doneMessage}>
            Your password has been reset successfully.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.doneButton}
            contentStyle={styles.buttonContent}
          >
            Sign In
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Set New Password
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Enter your new password below.
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
            testID="reset-password"
          />

          <FormField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
            testID="reset-confirm-password"
          />

          <Button
            mode="contained"
            onPress={handleReset}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="reset-submit"
          >
            Reset Password
          </Button>
        </View>

        <View style={styles.footer}>
          <Button
            mode="text"
            compact
            onPress={() => router.replace('/(auth)/login')}
            testID="reset-back"
          >
            Back to Sign In
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: LAYOUT.contentPadding,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  form: {
    marginBottom: SPACING.lg,
  },
  button: {
    marginTop: SPACING.md,
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
  footer: {
    alignItems: 'center',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.contentPadding,
  },
  verifyingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorTitle: {
    color: COLORS.error,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  errorMessage: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  doneTitle: {
    color: COLORS.success,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  doneMessage: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  doneButton: {
    marginTop: SPACING.xl,
    minWidth: 200,
  },
});
