import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, Button } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { UncompletedLesson } from '@/lib/hooks/useLessonInstances';

interface UncompletedLessonItemProps {
  lesson: UncompletedLesson;
  onComplete: (id: string) => void;
  completing: boolean;
  testID?: string;
}

export function UncompletedLessonItem({ lesson, onComplete, completing, testID }: UncompletedLessonItemProps) {
  const lessonType = lesson.lesson_type ?? 'group';

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text variant="bodyMedium" style={styles.date}>{lesson.date}</Text>
          <Text variant="bodySmall" style={styles.time}>
            {lesson.start_time} - {lesson.end_time}
          </Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodySmall" style={styles.name}>{lesson.name ?? 'Lesson'}</Text>
          <Chip compact style={styles.chip}>
            {lessonType === 'group' ? 'Group' : 'Private'} • {lesson.duration_minutes ?? 60}min
          </Chip>
        </View>
      </View>
      <Button
        mode="contained"
        compact
        onPress={() => onComplete(lesson.id)}
        loading={completing}
        disabled={completing}
        style={styles.completeButton}
        labelStyle={styles.completeLabel}
      >
        Complete
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  info: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  time: {
    color: COLORS.textSecondary,
  },
  name: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  completeButton: {
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  completeLabel: {
    fontSize: 12,
  },
});
