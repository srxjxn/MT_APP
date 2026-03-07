import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '@/lib/hooks/useAuth';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';

export default function RoleSelectScreen() {
  const [role, setRole] = useState<'parent' | 'coach'>('parent');
  const [loading, setLoading] = useState(false);
  const { createSocialProfile } = useAuth();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await createSocialProfile(role);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Welcome!
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Choose your role to get started
          </Text>
        </View>

        <SegmentedButtons
          value={role}
          onValueChange={(value) => setRole(value as 'parent' | 'coach')}
          buttons={[
            { value: 'parent', label: 'Parent' },
            { value: 'coach', label: 'Coach' },
          ]}
          style={styles.roleToggle}
        />

        {role === 'coach' && (
          <Text variant="bodySmall" style={styles.note}>
            Coach accounts require admin approval before access is granted.
          </Text>
        )}

        <Button
          mode="contained"
          onPress={handleContinue}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: LAYOUT.contentPadding,
  },
  content: {
    alignItems: 'center',
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
  roleToggle: {
    marginBottom: SPACING.md,
    alignSelf: 'stretch',
  },
  note: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  button: {
    marginTop: SPACING.md,
    alignSelf: 'stretch',
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
});
