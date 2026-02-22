import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';

interface PayrollSummaryProps {
  groupHours: number;
  privateHours: number;
  groupRateCents: number;
  privateRateCents: number;
  testID?: string;
}

export function PayrollSummary({ groupHours, privateHours, groupRateCents, privateRateCents, testID }: PayrollSummaryProps) {
  const groupTotal = Math.round(groupHours * groupRateCents);
  const privateTotal = Math.round(privateHours * privateRateCents);
  const grandTotal = groupTotal + privateTotal;

  return (
    <Card style={styles.card} testID={testID}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>Pay Summary</Text>

        <View style={styles.lineItem}>
          <Text variant="bodyMedium" style={styles.label}>Group Hours</Text>
          <Text variant="bodyMedium" style={styles.value}>
            {groupHours}h x ${(groupRateCents / 100).toFixed(2)}/h = ${(groupTotal / 100).toFixed(2)}
          </Text>
        </View>

        <View style={styles.lineItem}>
          <Text variant="bodyMedium" style={styles.label}>Private Hours</Text>
          <Text variant="bodyMedium" style={styles.value}>
            {privateHours}h x ${(privateRateCents / 100).toFixed(2)}/h = ${(privateTotal / 100).toFixed(2)}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.lineItem}>
          <Text variant="titleMedium" style={styles.totalLabel}>Total</Text>
          <Text variant="titleLarge" style={styles.totalValue}>${(grandTotal / 100).toFixed(2)}</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  label: {
    color: COLORS.textSecondary,
  },
  value: {
    color: COLORS.textPrimary,
  },
  divider: {
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  totalValue: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
