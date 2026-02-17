import React from 'react';
import { View, FlatList, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useUserSubscriptions } from '@/lib/hooks/useSubscriptions';
import { useUserPayments } from '@/lib/hooks/usePayments';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

export default function ParentBilling() {
  const { data: subscriptions, isLoading: subsLoading, refetch: refetchSubs, isRefetching: subsRefetching } = useUserSubscriptions();
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, isRefetching: paymentsRefetching } = useUserPayments();

  const isLoading = subsLoading || paymentsLoading;
  const isRefetching = subsRefetching || paymentsRefetching;

  const refetch = () => {
    refetchSubs();
    refetchPayments();
  };

  if (isLoading) {
    return <LoadingScreen message="Loading billing..." testID="billing-loading" />;
  }

  const activeSub = subscriptions?.find((s) => s.status === 'active');

  return (
    <ScrollView
      style={styles.container}
      testID="parent-billing"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
      }
    >
      <Text variant="titleMedium" style={styles.sectionTitle}>My Subscription</Text>
      {activeSub ? (
        <View style={styles.section}>
          <SubscriptionCard subscription={activeSub} />
        </View>
      ) : (
        <Text variant="bodyMedium" style={styles.emptyText}>No active subscription</Text>
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>Payment History</Text>
      {payments && payments.length > 0 ? (
        <View style={styles.section}>
          {payments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </View>
      ) : (
        <Text variant="bodyMedium" style={styles.emptyText}>No payments yet</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.lg,
  },
});
