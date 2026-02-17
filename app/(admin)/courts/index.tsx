import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { useCourts } from '@/lib/hooks/useCourts';
import { LoadingScreen, EmptyState, StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { Court } from '@/lib/types';

export default function CourtsListScreen() {
  const { data: courts, isLoading, refetch, isRefetching } = useCourts();

  if (isLoading) {
    return <LoadingScreen message="Loading courts..." testID="courts-loading" />;
  }

  const renderCourt = ({ item }: { item: Court }) => (
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
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});
