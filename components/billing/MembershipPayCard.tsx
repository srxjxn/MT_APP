import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { Subscription } from '@/lib/types';

interface MembershipPayCardProps {
  subscription: Subscription;
  studentName?: string;
  onPayNow: () => void;
  loading?: boolean;
  testID?: string;
}

export function MembershipPayCard({ subscription, studentName, onPayNow, loading, testID }: MembershipPayCardProps) {
  const priceDollars = (subscription.price_cents / 100).toFixed(2);

  return (
    <Card style={styles.card} testID={testID}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.name}>
          {subscription.name}
        </Text>
        {studentName && (
          <Text variant="bodySmall" style={styles.student}>Student: {studentName}</Text>
        )}
        <Text variant="headlineMedium" style={styles.price}>
          ${priceDollars}/month
        </Text>
        <Text variant="bodySmall" style={styles.status}>
          Status: {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </Text>
        {subscription.status === 'active' && (
          <Button
            mode="contained"
            onPress={onPayNow}
            loading={loading}
            style={styles.payButton}
            testID="pay-now-button"
          >
            Pay Now
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  student: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  price: {
    color: COLORS.primary,
    fontWeight: '700',
    marginVertical: SPACING.sm,
  },
  status: {
    color: COLORS.textSecondary,
  },
  payButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
  },
});
