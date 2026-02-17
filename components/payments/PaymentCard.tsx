import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { PaymentWithJoins } from '@/lib/hooks/usePayments';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: COLORS.successLight, text: COLORS.success },
  pending: { bg: COLORS.warningLight, text: COLORS.warning },
  failed: { bg: COLORS.errorLight, text: COLORS.error },
  refunded: { bg: COLORS.infoLight, text: COLORS.info },
};

interface PaymentCardProps {
  payment: PaymentWithJoins;
  onPress?: () => void;
  testID?: string;
}

export function PaymentCard({ payment, onPress, testID }: PaymentCardProps) {
  const statusColor = STATUS_COLORS[payment.payment_status] ?? { bg: '#F5F5F5', text: COLORS.textSecondary };

  return (
    <Card
      style={styles.card}
      onPress={onPress}
      testID={testID ?? `payment-card-${payment.id}`}
    >
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.amount}>
            {formatCents(payment.amount_cents)}
          </Text>
          <Chip
            style={[styles.statusChip, { backgroundColor: statusColor.bg }]}
            textStyle={[styles.statusText, { color: statusColor.text }]}
          >
            {payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
          </Chip>
        </View>
        <View style={styles.meta}>
          <Text variant="bodySmall" style={styles.type}>
            {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)}
          </Text>
          {payment.payment_platform && (
            <Text variant="bodySmall" style={styles.platform}>
              {payment.payment_platform.charAt(0).toUpperCase() + payment.payment_platform.slice(1)}
            </Text>
          )}
        </View>
        {payment.user && (
          <Text variant="bodySmall" style={styles.user}>
            {payment.user.first_name} {payment.user.last_name}
          </Text>
        )}
        {payment.subscription && (
          <Text variant="bodySmall" style={styles.subscription}>
            Plan: {payment.subscription.name}
          </Text>
        )}
        {payment.description && (
          <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
            {payment.description}
          </Text>
        )}
        <Text variant="bodySmall" style={styles.date}>
          {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : new Date(payment.created_at).toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  amount: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 26,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  type: {
    color: COLORS.textSecondary,
  },
  platform: {
    color: COLORS.textSecondary,
  },
  user: {
    color: COLORS.textSecondary,
  },
  subscription: {
    color: COLORS.info,
  },
  description: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  date: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
