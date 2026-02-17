import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';
import { LESSON_TYPE_LABELS } from '@/lib/validation/lessonTemplate';

interface LessonCardProps {
  instance: LessonInstanceWithJoins;
  onPress?: () => void;
  testID?: string;
}

export function LessonCard({ instance, onPress, testID }: LessonCardProps) {
  const maxStudents = instance.template?.max_students;
  const lessonType = instance.template?.lesson_type;

  return (
    <Card style={styles.card} onPress={onPress} testID={testID}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.name}>
            {instance.template?.name ?? 'Ad-hoc Lesson'}
          </Text>
          <StatusBadge status={instance.status} />
        </View>
        <Text variant="bodyMedium" style={styles.detail}>
          {instance.date} • {instance.start_time} - {instance.end_time}
        </Text>
        <Text variant="bodyMedium" style={styles.detail}>
          {instance.coach ? `${instance.coach.first_name} ${instance.coach.last_name}` : ''}
          {instance.court ? ` • ${instance.court.name}` : ''}
        </Text>
        {instance.template?.description && (
          <Text variant="bodySmall" style={styles.descriptionSnippet} numberOfLines={1}>
            {instance.template.description}
          </Text>
        )}
        <View style={styles.footer}>
          {lessonType && (
            <Text variant="bodySmall" style={styles.type}>
              {LESSON_TYPE_LABELS[lessonType] ?? lessonType}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.enrollment}>
            {instance.enrollment_count ?? 0}{maxStudents ? `/${maxStudents}` : ''} enrolled
          </Text>
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
  detail: {
    color: COLORS.textSecondary,
  },
  descriptionSnippet: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  type: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  enrollment: {
    color: COLORS.textSecondary,
  },
});
