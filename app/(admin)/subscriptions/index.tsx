import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { FAB, Button, SegmentedButtons, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useSubscriptions, SubscriptionWithUser } from '@/lib/hooks/useSubscriptions';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

function isExpiringSoon(endsAt: string | null): boolean {
  if (!endsAt) return false;
  const now = new Date();
  const end = new Date(endsAt);
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

export default function SubscriptionsListScreen() {
  const { data: subscriptions, isLoading, refetch, isRefetching } = useSubscriptions();
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = subscriptions?.filter(
    (s) => statusFilter === 'all' || s.status === statusFilter
  );

  if (isLoading) {
    return <LoadingScreen message="Loading subscriptions..." testID="subscriptions-loading" />;
  }

  return (
    <View style={styles.container} testID="subscriptions-list">
      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={STATUS_FILTERS}
        style={styles.filters}
      />

      <View style={styles.linkButtons}>
        <Button
          mode="text"
          icon="cash-multiple"
          onPress={() => router.push('/(admin)/subscriptions/payments')}
          testID="view-payments-button"
        >
          View Payments
        </Button>
        <Button
          mode="text"
          icon="package-variant"
          onPress={() => router.push('/(admin)/subscriptions/packages')}
          testID="view-packages-button"
        >
          View Packages
        </Button>
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }: { item: SubscriptionWithUser }) => {
          const expiring = item.status === 'active' && isExpiringSoon(item.ends_at);
          return (
            <View>
              <SubscriptionCard
                subscription={item}
                onPress={() => router.push(`/(admin)/subscriptions/${item.id}`)}
              />
              {expiring && (
                <View style={styles.expiringBanner}>
                  <MaterialCommunityIcons name="alert" size={16} color={COLORS.warning} />
                  <Text variant="bodySmall" style={styles.expiringText}>Expiring soon</Text>
                </View>
              )}
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="credit-card-off"
            title="No Subscriptions"
            description="Create a subscription to get started"
            actionLabel="New Subscription"
            onAction={() => router.push('/(admin)/subscriptions/create')}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(admin)/subscriptions/create')}
        testID="create-subscription-fab"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filters: {
    margin: SPACING.md,
    marginBottom: 0,
  },
  linkButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  list: {
    padding: SPACING.md,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  expiringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  expiringText: {
    color: COLORS.warning,
    fontWeight: '600',
  },
});
