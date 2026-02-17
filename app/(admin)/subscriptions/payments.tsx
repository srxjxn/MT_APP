import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { FAB, Portal, Modal, Text, SegmentedButtons } from 'react-native-paper';
import { usePayments, useCreatePayment, PaymentWithJoins } from '@/lib/hooks/usePayments';
import { useParentUsers } from '@/lib/hooks/useStudents';
import { useSubscriptions } from '@/lib/hooks/useSubscriptions';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { PaymentFormData } from '@/lib/validation/payment';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
];

export default function PaymentsScreen() {
  const [statusFilter, setStatusFilter] = useState('all');
  const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
  const { data: payments, isLoading, refetch, isRefetching } = usePayments(filters);
  const { data: parentUsers } = useParentUsers();
  const { data: subscriptions } = useSubscriptions();
  const createPayment = useCreatePayment();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showForm, setShowForm] = useState(false);

  const handleRecordPayment = async (data: PaymentFormData) => {
    try {
      await createPayment.mutateAsync(data);
      showSnackbar('Payment recorded', 'success');
      setShowForm(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to record payment', 'error');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading payments..." testID="payments-loading" />;
  }

  return (
    <View style={styles.container} testID="payments-list">
      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={STATUS_FILTERS}
        style={styles.filters}
      />

      <FlatList
        data={payments}
        renderItem={({ item }: { item: PaymentWithJoins }) => (
          <PaymentCard payment={item} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={payments?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cash-remove"
            title="No Payments"
            description="Record a payment to get started"
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowForm(true)}
        testID="record-payment-fab"
      />

      <Portal>
        <Modal
          visible={showForm}
          onDismiss={() => setShowForm(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="titleLarge" style={styles.modalTitle}>Record Payment</Text>
            <PaymentForm
              parentUsers={parentUsers}
              subscriptions={subscriptions?.map((s) => ({ id: s.id, name: s.name }))}
              onSubmit={handleRecordPayment}
              loading={createPayment.isPending}
              testID="record-payment-form"
            />
          </ScrollView>
        </Modal>
      </Portal>
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
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    maxHeight: '85%',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    padding: SPACING.md,
    paddingBottom: 0,
  },
});
