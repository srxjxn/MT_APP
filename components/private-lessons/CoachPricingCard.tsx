import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { CoachWithPricing } from '@/lib/hooks/useCoachPricing';

interface CoachPricingCardProps {
  coach: CoachWithPricing;
  onRequestLesson: () => void;
}

export function CoachPricingCard({ coach, onRequestLesson }: CoachPricingCardProps) {
  const dropInDisplay = coach.drop_in_rate_cents
    ? `$${(coach.drop_in_rate_cents / 100).toFixed(0)}/hr`
    : 'Not set';

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.name}>
          {coach.first_name} {coach.last_name}
        </Text>
        <Text variant="bodyMedium" style={styles.dropIn}>
          Drop-in: {dropInDisplay}
        </Text>

        {coach.packages.length > 0 ? (
          coach.packages.map((pkg) => {
            const perHour = pkg.num_hours > 0 ? (pkg.price_cents / pkg.num_hours / 100).toFixed(0) : '0';
            return (
              <Text key={pkg.id} variant="bodySmall" style={styles.packageLine}>
                {pkg.num_hours} hrs for ${(pkg.price_cents / 100).toFixed(0)} (${perHour}/hr)
              </Text>
            );
          })
        ) : (
          <Text variant="bodySmall" style={styles.noPackages}>No packages available</Text>
        )}

        <Button
          mode="contained"
          onPress={onRequestLesson}
          style={styles.requestButton}
          compact
        >
          Request Lesson
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  dropIn: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  packageLine: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  noPackages: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  requestButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
  },
});
