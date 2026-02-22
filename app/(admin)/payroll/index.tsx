import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { FAB, SegmentedButtons, Text, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { useCoachPayouts, CoachPayoutWithJoins } from '@/lib/hooks/useCoachPayroll';
import { useDashboardCoaches } from '@/lib/hooks/useDashboard';
import { PayoutCard } from '@/components/payroll/PayoutCard';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

export default function PayrollIndexScreen() {
  const { data: payouts, isLoading, refetch, isRefetching } = useCoachPayouts();
  const { data: coaches } = useDashboardCoaches();
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = payouts?.filter(
    (p) => statusFilter === 'all' || p.status === statusFilter
  );

  if (isLoading) {
    return <LoadingScreen message="Loading payroll..." testID="payroll-loading" />;
  }

  return (
    <View style={styles.container} testID="payroll-list">
      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={STATUS_FILTERS}
        style={styles.filters}
      />

      {coaches && coaches.length > 0 && (
        <Card style={styles.coachesCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.coachesTitle}>Coach Rates</Text>
            {coaches.map((c) => (
              <Text key={c.id} variant="bodySmall" style={styles.coachRate}>
                {c.first_name} {c.last_name}
              </Text>
            ))}
          </Card.Content>
        </Card>
      )}

      <FlatList
        data={filtered}
        renderItem={({ item }: { item: CoachPayoutWithJoins }) => (
          <PayoutCard
            payout={item}
            onPress={() => router.push(`/(admin)/payroll/${item.id}`)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cash-register"
            title="No Payouts"
            description="Generate a payroll to get started"
            actionLabel="Generate Payroll"
            onAction={() => router.push('/(admin)/payroll/generate')}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(admin)/payroll/generate')}
        testID="generate-payroll-fab"
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
  coachesCard: {
    margin: SPACING.md,
    marginBottom: 0,
    backgroundColor: COLORS.surface,
  },
  coachesTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  coachRate: {
    color: COLORS.textSecondary,
    marginBottom: 2,
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
});
