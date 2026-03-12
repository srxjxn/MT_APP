import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { FAB, Card, Text, Button, Portal, Dialog, Switch } from 'react-native-paper';
import {
  useAllMembershipPlans,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
  useDeleteMembershipPlan,
} from '@/lib/hooks/useMembershipPlans';
import { MembershipPlanForm } from '@/components/subscriptions/MembershipPlanForm';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { MembershipPlan } from '@/lib/types';

export default function MembershipPlansScreen() {
  const { data: plans, isLoading, refetch, isRefetching } = useAllMembershipPlans();
  const createPlan = useCreateMembershipPlan();
  const updatePlan = useUpdateMembershipPlan();
  const deletePlan = useDeleteMembershipPlan();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingScreen message="Loading plans..." testID="plans-loading" />;
  }

  const handleCreate = async (data: any) => {
    try {
      await createPlan.mutateAsync(data);
      showSnackbar('Plan created', 'success');
      setShowCreateForm(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create plan', 'error');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingPlan) return;
    try {
      await updatePlan.mutateAsync({ id: editingPlan.id, ...data });
      showSnackbar('Plan updated', 'success');
      setEditingPlan(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update plan', 'error');
    }
  };

  const handleToggleActive = async (plan: MembershipPlan) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, is_active: !plan.is_active });
      showSnackbar(`Plan ${plan.is_active ? 'deactivated' : 'activated'}`, 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update plan', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingPlanId) return;
    try {
      await deletePlan.mutateAsync(deletingPlanId);
      showSnackbar('Plan deleted', 'success');
      setDeletingPlanId(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete plan', 'error');
    }
  };

  const renderPlanCard = ({ item }: { item: MembershipPlan }) => (
    <Card
      style={[styles.card, !item.is_active && styles.inactiveCard]}
      onPress={() => setEditingPlan(item)}
      testID={`plan-card-${item.id}`}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.cardName}>{item.name}</Text>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleActive(item)}
            color={COLORS.primary}
            testID={`plan-toggle-${item.id}`}
          />
        </View>
        {item.description && (
          <Text variant="bodySmall" style={styles.cardDescription}>{item.description}</Text>
        )}
        <Text variant="titleLarge" style={styles.cardPrice}>
          ${(item.price_cents / 100).toFixed(2)}/4 weeks
        </Text>
        {item.lessons_per_month && (
          <Text variant="bodySmall" style={styles.cardLessons}>
            {item.lessons_per_month} lessons per cycle
          </Text>
        )}
        <View style={styles.cardActions}>
          <Button
            mode="text"
            onPress={() => setEditingPlan(item)}
            testID={`plan-edit-${item.id}`}
          >
            Edit
          </Button>
          <Button
            mode="text"
            textColor={COLORS.error}
            onPress={() => setDeletingPlanId(item.id)}
            testID={`plan-delete-${item.id}`}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container} testID="membership-plans-screen">
      <FlatList
        data={plans}
        renderItem={renderPlanCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={plans?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="tag-off"
            title="No Membership Plans"
            description="Create a plan for parents to subscribe to"
            actionLabel="New Plan"
            onAction={() => setShowCreateForm(true)}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowCreateForm(true)}
        testID="create-plan-fab"
      />

      {/* Create Plan Dialog */}
      <Portal>
        <Dialog
          visible={showCreateForm}
          onDismiss={() => setShowCreateForm(false)}
          style={styles.dialog}
        >
          <Dialog.Title>New Membership Plan</Dialog.Title>
          <Dialog.ScrollArea>
            <MembershipPlanForm
              onSubmit={handleCreate}
              loading={createPlan.isPending}
              submitLabel="Create Plan"
              testID="create-plan-form"
            />
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>

      {/* Edit Plan Dialog */}
      <Portal>
        <Dialog
          visible={!!editingPlan}
          onDismiss={() => setEditingPlan(null)}
          style={styles.dialog}
        >
          <Dialog.Title>Edit Membership Plan</Dialog.Title>
          <Dialog.ScrollArea>
            {editingPlan && (
              <MembershipPlanForm
                initialValues={editingPlan}
                onSubmit={handleUpdate}
                loading={updatePlan.isPending}
                submitLabel="Update Plan"
                testID="edit-plan-form"
              />
            )}
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={!!deletingPlanId} onDismiss={() => setDeletingPlanId(null)}>
          <Dialog.Title>Delete Plan</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to delete this membership plan?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeletingPlanId(null)}>Cancel</Button>
            <Button
              onPress={handleDelete}
              loading={deletePlan.isPending}
              textColor={COLORS.error}
              testID="confirm-delete-plan"
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  cardDescription: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  cardPrice: {
    color: COLORS.primary,
    fontWeight: '700',
    marginVertical: SPACING.sm,
  },
  cardLessons: {
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  dialog: {
    maxHeight: '80%',
  },
});
