import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Chip, Portal } from 'react-native-paper';
import { useCoachLessonHistory, useCompleteLessonWithNotification, CoachLessonHistoryItem } from '@/lib/hooks/useLessonInstances';
import { LoadingScreen, EmptyState, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { formatTime } from '@/lib/utils/formatTime';

export default function CoachLessonHistoryScreen() {
  const { data: lessons, isLoading, refetch, isRefetching } = useCoachLessonHistory();
  const completeLesson = useCompleteLessonWithNotification();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [completeId, setCompleteId] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!completeId) return;
    try {
      const result = await completeLesson.mutateAsync(completeId);
      showSnackbar(
        `Lesson completed. ${result.notifiedCount} parent${result.notifiedCount !== 1 ? 's' : ''} notified.`,
        'success'
      );
      setCompleteId(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to complete lesson', 'error');
      setCompleteId(null);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading lesson history..." testID="history-loading" />;
  }

  const renderLesson = ({ item }: { item: CoachLessonHistoryItem }) => {
    const isCompleted = item.status === 'completed';
    const studentNames = item.enrolledStudentNames?.join(', ') || 'No students';

    return (
      <Card
        style={styles.card}
        onPress={!isCompleted ? () => setCompleteId(item.id) : undefined}
        testID={`history-lesson-${item.id}`}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.lessonName} numberOfLines={1}>
              {item.name}
            </Text>
            <Chip
              mode="flat"
              compact
              style={isCompleted ? styles.completedChip : styles.needsCompletionChip}
              textStyle={isCompleted ? styles.completedChipText : styles.needsCompletionChipText}
              icon={isCompleted ? 'check-circle' : 'alert-circle-outline'}
            >
              {isCompleted ? 'Completed' : 'Needs Completion'}
            </Chip>
          </View>
          <Text variant="bodyMedium" style={styles.studentNames}>{studentNames}</Text>
          <Text variant="bodySmall" style={styles.details}>
            {item.date} • {formatTime(item.start_time)} - {formatTime(item.end_time)}
            {item.court?.name ? ` • ${item.court.name}` : ''}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container} testID="coach-lesson-history">
      <FlatList
        data={lessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={lessons?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title="No Lesson History"
            description="Your past private lessons will appear here"
          />
        }
      />

      <Portal>
        <ConfirmDialog
          visible={!!completeId}
          title="Mark Lesson Complete"
          message="Mark this lesson as completed? Parents will be notified."
          confirmLabel="Mark Complete"
          onConfirm={handleComplete}
          onCancel={() => setCompleteId(null)}
          testID="complete-lesson-dialog"
        />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
  },
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  lessonName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  completedChip: {
    backgroundColor: COLORS.successLight,
  },
  completedChipText: {
    color: COLORS.success,
    fontSize: 11,
  },
  needsCompletionChip: {
    backgroundColor: COLORS.warningLight,
  },
  needsCompletionChipText: {
    color: COLORS.warning,
    fontSize: 11,
  },
  studentNames: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  details: {
    color: COLORS.textSecondary,
  },
});
