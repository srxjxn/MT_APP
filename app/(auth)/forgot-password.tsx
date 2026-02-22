import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleReset = async () => {
    if (!email) {
      showSnackbar('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'modern-tennis://reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <MaterialCommunityIcons
            name="email-check-outline"
            size={64}
            color={COLORS.primary}
          />
          <Text variant="headlineSmall" style={styles.sentTitle}>
            Check Your Email
          </Text>
          <Text variant="bodyLarge" style={styles.sentMessage}>
            We sent a password reset link to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          <Text variant="bodyMedium" style={styles.sentHint}>
            If you don't see it, check your spam folder.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
          >
            Back to Sign In
          </Button>
          <Button
            mode="text"
            onPress={() => {
              setSent(false);
              setEmail('');
            }}
            style={styles.retryButton}
          >
            Try a different email
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
            Reset Password
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="forgot-email"
          />

          <Button
            mode="contained"
            onPress={handleReset}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="forgot-submit"
          >
            Send Reset Link
          </Button>
        </View>

        <View style={styles.footer}>
          <Button
            mode="text"
            compact
            onPress={() => router.back()}
            testID="forgot-back"
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
  sentTitle: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  sentMessage: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 24,
  },
  emailHighlight: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  sentHint: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  backButton: {
    marginTop: SPACING.xl,
    minWidth: 200,
  },
  retryButton: {
    marginTop: SPACING.sm,
  },
});
