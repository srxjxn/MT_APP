import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { Subscription } from '@/lib/types';

interface MembershipPayCardProps {
  subscription: Subscription;
  studentName?: string;
  onPayNow: () => void;
  onSubscribe?: () => void;
  onCancelSubscription?: () => void;
  loading?: boolean;
  cancelLoading?: boolean;
  testID?: string;
}

export function MembershipPayCard({
  subscription,
  studentName,
  onPayNow,
  onSubscribe,
  onCancelSubscription,
  loading,
  cancelLoading,
  testID,
}: MembershipPayCardProps) {
  const priceDollars = (subscription.price_cents / 100).toFixed(2);

  const hasStripeSub = !!subscription.stripe_subscription_id;
  const hasStripePriceId = !!(subscription as any).stripe_price_id;
  const cancelPending = !!(subscription as any).cancel_at_period_end;
  const periodEnd = (subscription as any).current_period_end;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
          ${priceDollars}/4 weeks
        </Text>
        <Text variant="bodySmall" style={styles.status}>
          Status: {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </Text>

        {/* Active Stripe subscription with cancel pending */}
        {hasStripeSub && cancelPending && periodEnd && (
          <Text variant="bodySmall" style={styles.cancelNotice}>
            Cancels on {formatDate(periodEnd)}
          </Text>
        )}

        {/* Active Stripe subscription — show period and cancel button */}
        {hasStripeSub && !cancelPending && subscription.status === 'active' && (
          <View style={styles.actions}>
            {periodEnd && (
              <Text variant="bodySmall" style={styles.periodText}>
                Next billing: {formatDate(periodEnd)}
              </Text>
            )}
            {onCancelSubscription && (
              <Button
                mode="outlined"
                onPress={onCancelSubscription}
                loading={cancelLoading}
                style={styles.cancelButton}
                textColor={COLORS.error}
                testID="cancel-subscription-button"
              >
                Cancel Subscription
              </Button>
            )}
          </View>
        )}

        {/* No Stripe sub but has price_id — offer subscription */}
        {!hasStripeSub && hasStripePriceId && subscription.status === 'active' && onSubscribe && (
          <Button
            mode="contained"
            onPress={onSubscribe}
            loading={loading}
            style={styles.payButton}
            testID="subscribe-button"
          >
            Complete Payment
          </Button>
        )}

        {/* Payment pending notice */}
        {!hasStripeSub && hasStripePriceId && (
          <Text variant="bodySmall" style={styles.pendingNotice}>
            Payment required to activate
          </Text>
        )}

        {/* No stripe_price_id — one-time pay (existing behavior) */}
        {!hasStripeSub && !hasStripePriceId && subscription.status === 'active' && (
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
  cancelNotice: {
    color: COLORS.warning,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  actions: {
    marginTop: SPACING.sm,
  },
  periodText: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  cancelButton: {
    borderColor: COLORS.error,
  },
  pendingNotice: {
    color: COLORS.warning,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
});
