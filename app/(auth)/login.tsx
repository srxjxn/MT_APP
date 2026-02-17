import React, { useState } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Apple sign-in failed', 'error');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Google sign-in failed', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title} testID="login-title">
            Modern Tennis
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Sign in to your account
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="login-email"
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="login-password"
          />

          <Button
            mode="contained"
            onPress={handleEmailLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="login-submit"
          >
            Sign In
          </Button>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === 'ios' && (
            <Button
              mode="outlined"
              onPress={handleAppleLogin}
              icon="apple"
              style={styles.socialButton}
              contentStyle={styles.buttonContent}
              testID="login-apple"
            >
              Sign in with Apple
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            icon="google"
            style={styles.socialButton}
            contentStyle={styles.buttonContent}
            testID="login-google"
          >
            Sign in with Google
          </Button>
        </View>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.footerText}>
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/register" asChild>
            <Button mode="text" compact testID="login-register-link">
              Sign Up
            </Button>
          </Link>
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.textSecondary,
  },
  socialButton: {
    marginBottom: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
  },
});
