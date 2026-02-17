import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING } from '@/constants/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID ?? 'empty-state'}>
      <MaterialCommunityIcons name={icon} size={64} color={COLORS.textDisabled} />
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {description && <Text variant="bodyMedium" style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button} testID="empty-state-action">
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    marginTop: SPACING.md,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  description: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: SPACING.lg,
  },
});
