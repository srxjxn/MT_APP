import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { FAB, Portal, Modal, Text, SegmentedButtons, Menu, Button } from 'react-native-paper';
import { usePayments, useCreatePayment, PaymentWithJoins } from '@/lib/hooks/usePayments';
import { useParentUsers } from '@/lib/hooks/useStudents';
import { useSubscriptions } from '@/lib/hooks/useSubscriptions';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { LoadingScreen, EmptyState, DatePickerField } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { PaymentFormData, PAYMENT_TYPES } from '@/lib/validation/payment';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
];

const TYPE_LABELS: Record<string, string> = {
  lesson: 'Lesson',
  subscription: 'Subscription',
  drop_in: 'Drop In',
  other: 'Other',
};

export default function PaymentsScreen() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  const filters: Record<string, string | undefined> = {};
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (typeFilter) filters.type = typeFilter;
  if (userFilter) filters.userId = userFilter;
  if (dateFromFilter) filters.dateFrom = dateFromFilter;
  if (dateToFilter) filters.dateTo = dateToFilter;

  const hasExtraFilters = typeFilter || userFilter || dateFromFilter || dateToFilter;
  const activeFilters = Object.keys(filters).length > 0 ? filters : undefined;

  const { data: payments, isLoading, refetch, isRefetching } = usePayments(activeFilters);
  const { data: parentUsers } = useParentUsers();
  const { data: subscriptions } = useSubscriptions();
  const createPayment = useCreatePayment();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showForm, setShowForm] = useState(false);

  const selectedParent = parentUsers?.find((u) => u.id === userFilter);

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('');
    setUserFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

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
      <View style={styles.filterSection}>
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={STATUS_FILTERS}
          style={styles.statusFilter}
        />

        <View style={styles.filterRow}>
          <Menu
            visible={typeMenuVisible}
            onDismiss={() => setTypeMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setTypeMenuVisible(true)}
                compact
                style={styles.filterButton}
              >
                {typeFilter ? TYPE_LABELS[typeFilter] : 'All Types'}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setTypeFilter(''); setTypeMenuVisible(false); }} title="All Types" />
            {PAYMENT_TYPES.map((t) => (
              <Menu.Item key={t} onPress={() => { setTypeFilter(t); setTypeMenuVisible(false); }} title={TYPE_LABELS[t] ?? t} />
            ))}
          </Menu>

          <Menu
            visible={userMenuVisible}
            onDismiss={() => setUserMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setUserMenuVisible(true)}
                compact
                style={styles.filterButton}
              >
                {selectedParent ? `${selectedParent.first_name} ${selectedParent.last_name}` : 'All Parents'}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setUserFilter(''); setUserMenuVisible(false); }} title="All Parents" />
            {parentUsers?.map((u) => (
              <Menu.Item
                key={u.id}
                onPress={() => { setUserFilter(u.id); setUserMenuVisible(false); }}
                title={`${u.first_name} ${u.last_name}`}
              />
            ))}
          </Menu>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <DatePickerField
              value={dateFromFilter}
              onChange={setDateFromFilter}
              label="From"
              testID="payment-filter-date-from"
            />
          </View>
          <View style={styles.filterField}>
            <DatePickerField
              value={dateToFilter}
              onChange={setDateToFilter}
              label="To"
              testID="payment-filter-date-to"
            />
          </View>
        </View>

        {hasExtraFilters && (
          <Button mode="text" onPress={clearFilters} compact style={styles.clearButton}>
            Clear All Filters
          </Button>
        )}
      </View>

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
  filterSection: {
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  statusFilter: {
    marginBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  filterButton: {
    flex: 1,
  },
  filterField: {
    flex: 1,
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
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
