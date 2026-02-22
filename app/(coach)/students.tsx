import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useCoachStudentPackages, CoachStudentPackage } from '@/lib/hooks/useCoachStudentHours';
import { StudentHoursCard } from '@/components/coach/StudentHoursCard';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

export default function CoachStudentsScreen() {
  const { data: packages, isLoading, refetch, isRefetching } = useCoachStudentPackages();

  if (isLoading) {
    return <LoadingScreen message="Loading students..." testID="coach-students-loading" />;
  }

  return (
    <View style={styles.container} testID="coach-students">
      <Text variant="titleMedium" style={styles.title}>My Students</Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        View student hours from your lesson packages (read-only)
      </Text>

      <FlatList
        data={packages}
        renderItem={({ item }: { item: CoachStudentPackage }) => (
          <StudentHoursCard pkg={item} testID={`student-hours-${item.id}`} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={packages?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-group"
            title="No Students"
            description="You don't have any active student packages yet"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  subtitle: {
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  list: {
    padding: SPACING.md,
    paddingTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
  },
});
