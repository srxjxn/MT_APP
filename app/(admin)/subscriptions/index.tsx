import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { FAB, SegmentedButtons, Text, Portal, Modal, Menu, Button, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscriptions, useCreateSubscription, SubscriptionWithUser } from '@/lib/hooks/useSubscriptions';
import { useMembershipPlans } from '@/lib/hooks/useMembershipPlans';
import { useParentUsers, useStudents } from '@/lib/hooks/useStudents';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { LoadingScreen, EmptyState, DatePickerField } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { MembershipPlan, UserProfile, Student } from '@/lib/types';

type ParentUser = Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'>;

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

const NAV_ITEMS = [
  { icon: 'cash-multiple', label: 'Payments', route: '/(admin)/subscriptions/payments', testID: 'view-payments-button' },
  { icon: 'package-variant', label: 'Packages', route: '/(admin)/subscriptions/packages', testID: 'view-packages-button' },
  { icon: 'tag-multiple', label: 'Plans', route: '/(admin)/subscriptions/plans', testID: 'manage-plans-button' },
] as const;

function isExpiringSoon(endsAt: string | null): boolean {
  if (!endsAt) return false;
  const now = new Date();
  const end = new Date(endsAt);
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function GrantSubscriptionModal({
  visible,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: {
    name: string;
    price_cents: number;
    lessons_per_month: number | null;
    user_id: string;
    student_id: string | null;
    starts_at: string;
    status: 'active';
  }) => void;
}) {
  const { data: plans } = useMembershipPlans();
  const { data: parents } = useParentUsers();
  const { data: students } = useStudents();

  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [selectedParent, setSelectedParent] = useState<ParentUser | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<(Student & { parent?: any }) | null>(null);
  const [startDate, setStartDate] = useState(toDateStr(new Date()));

  const [planMenuVisible, setPlanMenuVisible] = useState(false);
  const [parentMenuVisible, setParentMenuVisible] = useState(false);
  const [studentMenuVisible, setStudentMenuVisible] = useState(false);

  const filteredStudents = selectedParent
    ? (students ?? []).filter((s) => s.parent_id === selectedParent.id)
    : [];

  const resetForm = () => {
    setSelectedPlan(null);
    setSelectedParent(null);
    setSelectedStudent(null);
    setStartDate(toDateStr(new Date()));
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  const handleParentSelect = (parent: ParentUser) => {
    setSelectedParent(parent);
    setSelectedStudent(null);
    setParentMenuVisible(false);
  };

  const canSubmit = selectedPlan && selectedParent && startDate;

  const handleSubmit = () => {
    if (!selectedPlan || !selectedParent) return;
    onSubmit({
      name: selectedPlan.name,
      price_cents: selectedPlan.price_cents,
      lessons_per_month: selectedPlan.lessons_per_month,
      user_id: selectedParent.id,
      student_id: selectedStudent?.id ?? null,
      starts_at: new Date(startDate + 'T00:00:00').toISOString(),
      status: 'active',
    });
    resetForm();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.modalTitle}>Grant Subscription</Text>

        {/* Membership Plan Picker */}
        <Menu
          visible={planMenuVisible}
          onDismiss={() => setPlanMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setPlanMenuVisible(true)}
              style={styles.menuButton}
              icon="tag-multiple"
              contentStyle={styles.menuButtonContent}
            >
              {selectedPlan
                ? `${selectedPlan.name} — $${(selectedPlan.price_cents / 100).toFixed(0)}/mo`
                : 'Select Plan'}
            </Button>
          }
        >
          <ScrollView style={{ maxHeight: 300 }}>
            {(plans ?? []).map((p) => (
              <Menu.Item
                key={p.id}
                title={`${p.name} — $${(p.price_cents / 100).toFixed(0)}/mo`}
                onPress={() => {
                  setSelectedPlan(p);
                  setPlanMenuVisible(false);
                }}
              />
            ))}
          </ScrollView>
        </Menu>

        {/* Parent Picker */}
        <Menu
          visible={parentMenuVisible}
          onDismiss={() => setParentMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setParentMenuVisible(true)}
              style={styles.menuButton}
              icon="account"
              contentStyle={styles.menuButtonContent}
            >
              {selectedParent
                ? `${selectedParent.first_name} ${selectedParent.last_name}`
                : 'Select Parent'}
            </Button>
          }
        >
          <ScrollView style={{ maxHeight: 300 }}>
            {(parents ?? []).map((p) => (
              <Menu.Item
                key={p.id}
                title={`${p.first_name} ${p.last_name}`}
                onPress={() => handleParentSelect(p)}
              />
            ))}
          </ScrollView>
        </Menu>

        {/* Student Picker */}
        <Menu
          visible={studentMenuVisible}
          onDismiss={() => setStudentMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setStudentMenuVisible(true)}
              style={styles.menuButton}
              icon="account-child"
              contentStyle={styles.menuButtonContent}
              disabled={!selectedParent}
            >
              {selectedStudent
                ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                : 'Select Student (optional)'}
            </Button>
          }
        >
          <ScrollView style={{ maxHeight: 300 }}>
            {filteredStudents.map((s) => (
              <Menu.Item
                key={s.id}
                title={`${s.first_name} ${s.last_name}`}
                onPress={() => {
                  setSelectedStudent(s);
                  setStudentMenuVisible(false);
                }}
              />
            ))}
          </ScrollView>
        </Menu>

        {/* Start Date */}
        <DatePickerField
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
        />

        <View style={styles.modalActions}>
          <Button onPress={handleDismiss}>Cancel</Button>
          <Button mode="contained" onPress={handleSubmit} disabled={!canSubmit}>
            Grant Subscription
          </Button>
        </View>

        <Button
          mode="text"
          onPress={() => {
            handleDismiss();
            router.push('/(admin)/subscriptions/create');
          }}
          style={styles.fullFormButton}
        >
          Full Form (Stripe)
        </Button>
      </Modal>
    </Portal>
  );
}

export default function SubscriptionsListScreen() {
  const { data: subscriptions, isLoading, refetch, isRefetching } = useSubscriptions();
  const createSubscription = useCreateSubscription();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [statusFilter, setStatusFilter] = useState('all');
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = subscriptions?.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const parentName = `${s.user?.first_name ?? ''} ${s.user?.last_name ?? ''}`.toLowerCase();
      const studentName = `${s.student?.first_name ?? ''} ${s.student?.last_name ?? ''}`.toLowerCase();
      const planName = (s.name ?? '').toLowerCase();
      if (!parentName.includes(q) && !studentName.includes(q) && !planName.includes(q)) return false;
    }
    return true;
  });

  const handleGrantSubscription = async (data: {
    name: string;
    price_cents: number;
    lessons_per_month: number | null;
    user_id: string;
    student_id: string | null;
    starts_at: string;
    status: 'active';
  }) => {
    try {
      await createSubscription.mutateAsync(data);
      showSnackbar('Subscription granted successfully', 'success');
      setGrantModalVisible(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to grant subscription', 'error');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading subscriptions..." testID="subscriptions-loading" />;
  }

  return (
    <View style={styles.container} testID="subscriptions-list">
      <Searchbar
        placeholder="Search subscriptions..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchbar}
      />
      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={STATUS_FILTERS}
        style={styles.filters}
      />

      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => router.push(item.route as any)}
            testID={item.testID}
          >
            <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.primary} />
            <Text variant="labelSmall" style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
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
            onAction={() => setGrantModalVisible(true)}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setGrantModalVisible(true)}
        testID="create-subscription-fab"
      />

      <GrantSubscriptionModal
        visible={grantModalVisible}
        onDismiss={() => setGrantModalVisible(false)}
        onSubmit={handleGrantSubscription}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchbar: {
    margin: SPACING.md,
    marginBottom: SPACING.xs,
  },
  filters: {
    marginHorizontal: SPACING.md,
    marginBottom: 0,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    color: COLORS.textSecondary,
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
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  menuButton: {
    marginBottom: SPACING.sm,
  },
  menuButtonContent: {
    justifyContent: 'flex-start',
  },
  fullFormButton: {
    marginTop: SPACING.xs,
  },
});
