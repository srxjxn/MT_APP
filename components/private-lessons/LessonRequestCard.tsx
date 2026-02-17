import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { StatusBadge } from '@/components/ui';
import { LessonRequestWithJoins } from '@/lib/hooks/useLessonRequests';

interface LessonRequestCardProps {
  request: LessonRequestWithJoins;
  onCancel?: () => void;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function LessonRequestCard({ request, onCancel }: LessonRequestCardProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleSmall" style={styles.title}>
            {request.student.first_name} {request.student.last_name} → {request.coach.first_name} {request.coach.last_name}
          </Text>
          <StatusBadge status={request.status} />
        </View>
        <Text variant="bodySmall" style={styles.detail}>
          {formatDate(request.preferred_date)} at {formatTime(request.preferred_time)}
        </Text>
        {request.admin_notes && (
          <Text variant="bodySmall" style={styles.notes}>
            Note: {request.admin_notes}
          </Text>
        )}
        {request.status === 'pending' && onCancel && (
          <Button
            mode="outlined"
            onPress={onCancel}
            style={styles.cancelButton}
            compact
            textColor={COLORS.error}
          >
            Cancel
          </Button>
        )}
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
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  detail: {
    color: COLORS.textSecondary,
  },
  notes: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  cancelButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    borderColor: COLORS.error,
  },
});
