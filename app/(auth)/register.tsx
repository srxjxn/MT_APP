import React, { useState } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterScreen() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail } = useAuth();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const updateField = (field: string) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleRegister = async () => {
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(form.email, form.password, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      });
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title} testID="register-title">
            Create Account
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Join as a parent
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="First Name"
            value={form.firstName}
            onChangeText={updateField('firstName')}
            error={errors.firstName}
            autoCapitalize="words"
            testID="register-first-name"
          />
          <FormField
            label="Last Name"
            value={form.lastName}
            onChangeText={updateField('lastName')}
            error={errors.lastName}
            autoCapitalize="words"
            testID="register-last-name"
          />
          <FormField
            label="Email"
            value={form.email}
            onChangeText={updateField('email')}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="register-email"
          />
          <FormField
            label="Phone (optional)"
            value={form.phone}
            onChangeText={updateField('phone')}
            keyboardType="phone-pad"
            testID="register-phone"
          />
          <FormField
            label="Password"
            value={form.password}
            onChangeText={updateField('password')}
            error={errors.password}
            secureTextEntry
            testID="register-password"
          />
          <FormField
            label="Confirm Password"
            value={form.confirmPassword}
            onChangeText={updateField('confirmPassword')}
            error={errors.confirmPassword}
            secureTextEntry
            testID="register-confirm-password"
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="register-submit"
          >
            Create Account
          </Button>
        </View>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.footerText}>
            Already have an account?{' '}
          </Text>
          <Button mode="text" compact onPress={() => router.back()} testID="register-login-link">
            Sign In
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
  },
});
