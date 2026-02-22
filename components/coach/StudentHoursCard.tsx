import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar } from 'react-native-paper';
import { StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { CoachStudentPackage } from '@/lib/hooks/useCoachStudentHours';

interface StudentHoursCardProps {
  pkg: CoachStudentPackage;
  testID?: string;
}

export function StudentHoursCard({ pkg, testID }: StudentHoursCardProps) {
  const progress = pkg.hoursPurchased > 0 ? pkg.hoursUsed / pkg.hoursPurchased : 0;
  const progressColor = pkg.hoursRemaining <= 1 ? COLORS.warning : COLORS.primary;

  return (
    <Card style={styles.card} testID={testID}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.name}>{pkg.studentName}</Text>
          <StatusBadge status={pkg.status} />
        </View>

        <View style={styles.hoursRow}>
          <Text variant="bodySmall" style={styles.hoursLabel}>
            {pkg.hoursUsed}h used / {pkg.hoursPurchased}h purchased
          </Text>
          <Text variant="bodySmall" style={[styles.remaining, pkg.hoursRemaining <= 1 && styles.lowHours]}>
            {pkg.hoursRemaining}h remaining
          </Text>
        </View>

        <ProgressBar
          progress={Math.min(progress, 1)}
          color={progressColor}
          style={styles.progressBar}
        />
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
    marginBottom: SPACING.sm,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  hoursLabel: {
    color: COLORS.textSecondary,
  },
  remaining: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  lowHours: {
    color: COLORS.warning,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});
