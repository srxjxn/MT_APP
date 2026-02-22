import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { CoachPayoutWithJoins } from '@/lib/hooks/useCoachPayroll';

interface PayoutCardProps {
  payout: CoachPayoutWithJoins;
  onPress?: () => void;
  testID?: string;
}

export function PayoutCard({ payout, onPress, testID }: PayoutCardProps) {
  const coachName = `${payout.coach.first_name} ${payout.coach.last_name}`;
  const totalDollars = (payout.total_cents / 100).toFixed(2);

  return (
    <Card style={styles.card} onPress={onPress} testID={testID}>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium" style={styles.coachName}>{coachName}</Text>
        <StatusBadge status={payout.status} />
        <Text variant="bodyMedium" style={styles.period}>
          {payout.period_start} — {payout.period_end}
        </Text>
        <Text variant="bodySmall" style={styles.hours}>
          Group: {payout.group_hours}h • Private: {payout.private_hours}h
        </Text>
        <Text variant="titleLarge" style={styles.total}>${totalDollars}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  content: {
    gap: SPACING.xs,
  },
  coachName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  period: {
    color: COLORS.textSecondary,
  },
  hours: {
    color: COLORS.textSecondary,
  },
  total: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
