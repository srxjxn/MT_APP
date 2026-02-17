import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, Button } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { StudentPackageWithDetails } from '@/lib/hooks/useStudentPackages';

interface StudentPackageCardProps {
  studentName: string;
  primaryCoach: string | null;
  packages: StudentPackageWithDetails[];
  lessonStats: { upcoming: number; completed: number };
  onRequestLesson: () => void;
}

export function StudentPackageCard({
  studentName,
  primaryCoach,
  packages,
  lessonStats,
  onRequestLesson,
}: StudentPackageCardProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.name}>{studentName}</Text>
        <Text variant="bodySmall" style={styles.coachLabel}>
          {primaryCoach ? `Coach: ${primaryCoach}` : 'No assigned coach'}
        </Text>

        <Text variant="bodySmall" style={styles.statsText}>
          {lessonStats.upcoming} upcoming | {lessonStats.completed} completed
        </Text>

        {packages.length > 0 ? (
          packages.map((pkg) => {
            const progress = pkg.hours_purchased > 0 ? pkg.hours_used / pkg.hours_purchased : 0;
            const coachName = `${pkg.coach_package.coach.first_name} ${pkg.coach_package.coach.last_name}`;
            return (
              <View key={pkg.id} style={styles.packageRow}>
                <Text variant="bodySmall" style={styles.packageLabel}>
                  {pkg.coach_package.name} ({coachName})
                </Text>
                <ProgressBar
                  progress={Math.min(progress, 1)}
                  color={COLORS.primary}
                  style={styles.progressBar}
                />
                <Text variant="bodySmall" style={styles.hoursText}>
                  {pkg.hours_used}/{pkg.hours_purchased} hrs used
                </Text>
              </View>
            );
          })
        ) : (
          <Text variant="bodySmall" style={styles.noPackages}>No active packages</Text>
        )}

        <Button
          mode="outlined"
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
  coachLabel: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statsText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  packageRow: {
    marginBottom: SPACING.sm,
  },
  packageLabel: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: SPACING.xs,
  },
  hoursText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  noPackages: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  requestButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
});
