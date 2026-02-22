import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { SubscriptionWithUser } from '@/lib/hooks/useSubscriptions';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface SubscriptionCardProps {
  subscription: SubscriptionWithUser;
  onPress?: () => void;
  testID?: string;
}

export function SubscriptionCard({ subscription, onPress, testID }: SubscriptionCardProps) {
  return (
    <Card
      style={styles.card}
      onPress={onPress}
      testID={testID ?? `subscription-card-${subscription.id}`}
    >
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
            {subscription.name}
          </Text>
          <StatusBadge status={subscription.status} />
        </View>
        {subscription.user && (
          <Text variant="bodySmall" style={styles.user}>
            {subscription.user.first_name} {subscription.user.last_name}
          </Text>
        )}
        {subscription.student && (
          <Text variant="bodySmall" style={styles.user}>
            Student: {subscription.student.first_name} {subscription.student.last_name}
          </Text>
        )}
        <View style={styles.details}>
          <Text variant="titleLarge" style={styles.price}>
            {formatCents(subscription.price_cents)}
          </Text>
          <Text variant="bodySmall" style={styles.period}>/month</Text>
        </View>
        <View style={styles.meta}>
          <Text variant="bodySmall" style={styles.metaText}>
            {subscription.starts_at}{subscription.ends_at ? ` - ${subscription.ends_at}` : ''}
          </Text>
          {subscription.lessons_per_month && (
            <Text variant="bodySmall" style={styles.metaText}>
              {subscription.lessons_per_month} lessons/mo
            </Text>
          )}
        </View>
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
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  user: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.xs,
  },
  price: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  period: {
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  metaText: {
    color: COLORS.textSecondary,
  },
});
