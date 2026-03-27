import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useParentLessonInstances, useLessonInstancesWithVirtuals, useMaterializeInstance, LessonInstanceWithJoins, ParentLessonInstance } from '@/lib/hooks/useLessonInstances';
import { EnrollChildDialog } from '@/components/lessons/EnrollChildDialog';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { Text, Chip, Card, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { StatusBadge } from '@/components/ui';
import { formatTime } from '@/lib/utils/formatTime';

function BrowseLessonCard({ instance, onPress, testID }: { instance: LessonInstanceWithJoins; onPress?: () => void; testID?: string }) {
  const maxStudents = instance.max_students;
  const enrollmentCount = instance.enrollment_count ?? 0;
  const isFull = maxStudents != null && enrollmentCount >= maxStudents;
  const enrollmentColor = isFull ? COLORS.error : COLORS.success;

  return (
    <Card style={[styles.card, instance._isVirtual && styles.virtualCard]} onPress={onPress} testID={testID}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.cardName}>
            {instance.name}
          </Text>
          {instance._isVirtual ? (
            <Chip compact style={styles.templateChip} textStyle={styles.templateChipText}>Template</Chip>
          ) : (
            <StatusBadge status={instance.status} />
          )}
        </View>
        <Text variant="bodyMedium" style={styles.cardDetail}>
          {instance.date} • {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
        </Text>
        <Text variant="bodyMedium" style={styles.cardDetail}>
          {instance.coach ? `${instance.coach.first_name} ${instance.coach.last_name}` : ''}
          {instance.court ? ` • ${instance.court.name}` : ''}
        </Text>
        <View style={styles.cardFooter}>
          <Text variant="bodySmall" style={[styles.cardEnrollment, { color: enrollmentColor }]}>
            {enrollmentCount}{maxStudents ? `/${maxStudents}` : ''} enrolled
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

function MyLessonCard({ instance, testID }: { instance: ParentLessonInstance; testID?: string }) {
  return (
    <Card style={styles.card} testID={testID}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.cardName}>
            {instance.name}
          </Text>
          <StatusBadge status={instance.status} />
        </View>
        <Text variant="bodyMedium" style={styles.cardDetail}>
          {instance.date} • {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
        </Text>
        <Text variant="bodyMedium" style={styles.cardDetail}>
          {instance.coach ? `${instance.coach.first_name} ${instance.coach.last_name}` : ''}
          {instance.court ? ` • ${instance.court.name}` : ''}
        </Text>
        {instance.enrolledChildren && instance.enrolledChildren.length > 0 && (
          <View style={styles.childChips}>
            {instance.enrolledChildren.map((child, idx) => (
              <Chip key={idx} compact style={styles.childChip} textStyle={styles.childChipText}>
                {child.first_name} {child.last_name}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

export default function ParentSchedule() {
  const { data: myInstances, isLoading: loadingMy, refetch: refetchMy, isRefetching: refetchingMy } = useParentLessonInstances();
  const { data: allInstances, isLoading: loadingAll, refetch: refetchAll, isRefetching: refetchingAll } = useLessonInstancesWithVirtuals({ lessonType: 'group' });
  const materialize = useMaterializeInstance();
  const [tab, setTab] = useState('enrolled');
  const [selectedInstance, setSelectedInstance] = useState<LessonInstanceWithJoins | null>(null);
  const [materializing, setMaterializing] = useState(false);

  const isLoading = tab === 'enrolled' ? loadingMy : loadingAll;

  if (isLoading) {
    return <LoadingScreen message="Loading schedule..." testID="parent-schedule-loading" />;
  }

  return (
    <View style={styles.container} testID="parent-schedule">
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'enrolled', label: 'My Lessons' },
          { value: 'browse', label: 'Browse All' },
        ]}
        style={styles.tabToggle}
      />
      {tab === 'enrolled' ? (
        <FlatList
          data={myInstances as ParentLessonInstance[]}
          renderItem={({ item }) => (
            <MyLessonCard
              instance={item}
              testID={`parent-instance-${item.id}`}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={myInstances?.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refetchingMy} onRefresh={refetchMy} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-blank"
              title="No Enrolled Lessons"
              description="Your children are not enrolled in any lessons yet"
            />
          }
        />
      ) : (
        <FlatList
          data={allInstances}
          renderItem={({ item }: { item: LessonInstanceWithJoins }) => (
            <BrowseLessonCard
              instance={item}
              onPress={async () => {
                if (item._isVirtual) {
                  setMaterializing(true);
                  try {
                    const real = await materialize.mutateAsync(item);
                    setSelectedInstance({ ...item, id: real.id, _isVirtual: false });
                  } catch {
                    // Failed to materialize, ignore
                  } finally {
                    setMaterializing(false);
                  }
                  return;
                }
                setSelectedInstance(item);
              }}
              testID={`parent-instance-${item.id}`}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={allInstances?.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refetchingAll} onRefresh={refetchAll} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-blank"
              title="No Available Lessons"
              description="No lessons available at this time"
            />
          }
        />
      )}

      {selectedInstance && (
        <EnrollChildDialog
          visible={!!selectedInstance}
          lessonInstanceId={selectedInstance.id}
          maxStudents={selectedInstance.max_students}
          enrollmentCount={selectedInstance.enrollment_count}
          priceCents={selectedInstance.price_cents}
          onDismiss={() => setSelectedInstance(null)}
          testID="parent-enroll-dialog"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabToggle: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  list: {
    padding: SPACING.md,
    paddingTop: SPACING.xs,
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
  cardName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardDetail: {
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  cardEnrollment: {
    fontWeight: '600',
  },
  childChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  childChip: {
    backgroundColor: '#E3F2FD',
    height: 28,
  },
  childChipText: {
    fontSize: 11,
    color: COLORS.info,
  },
  virtualCard: {
    opacity: 0.7,
    borderStyle: 'dashed' as const,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateChip: {
    backgroundColor: '#E3F2FD',
    height: 26,
  },
  templateChipText: {
    fontSize: 11,
    color: COLORS.info,
  },
});
