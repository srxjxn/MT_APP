import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, FAB, Portal, Modal, IconButton } from 'react-native-paper';
import { useCoachAvailability, useCreateAvailability, useDeleteAvailability } from '@/lib/hooks/useCoachAvailability';
import { AvailabilityForm } from '@/components/coach/AvailabilityForm';
import { LoadingScreen, EmptyState, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { CoachAvailability as AvailabilityType } from '@/lib/types';
import { AvailabilityFormData } from '@/lib/validation/availability';
import { DAYS_OF_WEEK } from '@/lib/validation/lessonTemplate';

export default function CoachAvailabilityScreen() {
  const { data: slots, isLoading, refetch, isRefetching } = useCoachAvailability();
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = async (data: AvailabilityFormData) => {
    try {
      await createAvailability.mutateAsync({
        ...data,
        specific_date: data.specific_date || null,
      });
      showSnackbar('Availability added', 'success');
      setShowAddForm(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add availability', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAvailability.mutateAsync(deleteId);
      showSnackbar('Availability deleted', 'success');
      setDeleteId(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete', 'error');
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading availability..." testID="availability-loading" />;
  }

  const renderSlot = ({ item }: { item: AvailabilityType }) => {
    const dayLabel = DAYS_OF_WEEK.find((d) => d.value === item.day_of_week)?.label ?? `Day ${item.day_of_week}`;
    return (
      <Card style={styles.card} testID={`availability-${item.id}`}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.slotInfo}>
            <Text variant="titleMedium" style={styles.dayLabel}>{dayLabel}</Text>
            <Text variant="bodyMedium" style={styles.timeLabel}>
              {item.start_time} - {item.end_time}
            </Text>
            <Text variant="bodySmall" style={styles.typeLabel}>
              {item.is_recurring ? 'Recurring' : `Date: ${item.specific_date}`}
            </Text>
          </View>
          <IconButton
            icon="delete-outline"
            size={20}
            onPress={() => setDeleteId(item.id)}
            testID={`delete-availability-${item.id}`}
          />
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container} testID="coach-availability">
      <FlatList
        data={slots}
        renderItem={renderSlot}
        keyExtractor={(item) => item.id}
        contentContainerStyle={slots?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="clock-outline"
            title="No Availability Set"
            description="Add your available time slots"
            actionLabel="Add Availability"
            onAction={() => setShowAddForm(true)}
          />
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddForm(true)}
        testID="availability-add-fab"
      />

      <Portal>
        <Modal
          visible={showAddForm}
          onDismiss={() => setShowAddForm(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add Availability</Text>
          <AvailabilityForm
            onSubmit={handleAdd}
            loading={createAvailability.isPending}
            submitLabel="Add Slot"
            testID="add-availability-form"
          />
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Availability"
        message="Are you sure you want to remove this availability slot?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        testID="delete-availability-dialog"
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotInfo: {
    flex: 1,
  },
  dayLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  timeLabel: {
    color: COLORS.textSecondary,
  },
  typeLabel: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    padding: SPACING.md,
    paddingBottom: 0,
  },
});
