import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/hooks/useAuth';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

export default function PendingApprovalScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="clock-outline"
        size={80}
        color={COLORS.primary}
        style={styles.icon}
      />
      <Text variant="headlineSmall" style={styles.title}>
        Account Pending Approval
      </Text>
      <Text variant="bodyLarge" style={styles.description}>
        An administrator will review and activate your account soon.
      </Text>
      <Button
        mode="outlined"
        onPress={signOut}
        style={styles.button}
        contentStyle={styles.buttonContent}
        testID="pending-sign-out"
      >
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.contentPadding,
    backgroundColor: COLORS.background,
  },
  icon: {
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  button: {
    marginTop: SPACING.md,
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
});
