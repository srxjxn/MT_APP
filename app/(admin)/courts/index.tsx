import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { useCourtsWithPrivateLessons, CourtWithNextPrivate } from '@/lib/hooks/useCourts';
import { LoadingScreen, EmptyState, StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function CourtsListScreen() {
  const { data: courts, isLoading, refetch, isRefetching } = useCourtsWithPrivateLessons();

  if (isLoading) {
    return <LoadingScreen message="Loading courts..." testID="courts-loading" />;
  }

  const renderCourt = ({ item }: { item: CourtWithNextPrivate }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/(admin)/courts/${item.id}`)}
      testID={`court-card-${item.id}`}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.courtName}>{item.name}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text variant="bodyMedium" style={styles.courtDetail}>
          {item.surface_type} {item.is_indoor ? '• Indoor' : '• Outdoor'}
        </Text>
        {item.nextPrivateLesson && (
          <Text variant="bodySmall" style={styles.nextPrivate}>
            Next: {formatDate(item.nextPrivateLesson.date)} {formatTime(item.nextPrivateLesson.start_time)}
            {item.nextPrivateLesson.coachName ? ` - ${item.nextPrivateLesson.coachName}` : ''}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container} testID="courts-list">
      <FlatList
        data={courts}
        renderItem={renderCourt}
        keyExtractor={(item) => item.id}
        contentContainerStyle={courts?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="tennis"
            title="No Courts Yet"
            description="Add your first court to get started"
            actionLabel="Add Court"
            onAction={() => router.push('/(admin)/courts/create')}
          />
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(admin)/courts/create')}
        testID="courts-add-fab"
      />
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
  courtName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  courtDetail: {
    color: COLORS.textSecondary,
  },
  nextPrivate: {
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});
