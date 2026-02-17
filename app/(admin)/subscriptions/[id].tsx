import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { useSubscription, useUpdateSubscription, useDeleteSubscription } from '@/lib/hooks/useSubscriptions';
import { useParentUsers } from '@/lib/hooks/useStudents';
import { LoadingScreen, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { SubscriptionFormData } from '@/lib/validation/subscription';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: subscription, isLoading } = useSubscription(id!);
  const { data: parentUsers } = useParentUsers();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading || !subscription) {
    return <LoadingScreen message="Loading subscription..." />;
  }

  const handleSubmit = async (data: SubscriptionFormData) => {
    try {
      await updateSubscription.mutateAsync({ id: subscription.id, ...data });
      showSnackbar('Subscription updated', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update subscription', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubscription.mutateAsync(subscription.id);
      showSnackbar('Subscription deleted', 'success');
      setShowDeleteDialog(false);
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete subscription', 'error');
      setShowDeleteDialog(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <SubscriptionForm
        initialValues={{
          name: subscription.name,
          description: subscription.description ?? undefined,
          price_cents: subscription.price_cents,
          lessons_per_month: subscription.lessons_per_month ?? undefined,
          user_id: subscription.user_id,
          starts_at: subscription.starts_at,
          ends_at: subscription.ends_at ?? undefined,
          status: subscription.status,
        }}
        parentUsers={parentUsers}
        onSubmit={handleSubmit}
        loading={updateSubscription.isPending}
        submitLabel="Update Subscription"
        testID="edit-subscription-form"
      />

      <View style={styles.deleteSection}>
        <Button
          mode="outlined"
          onPress={() => setShowDeleteDialog(true)}
          textColor={COLORS.error}
          style={styles.deleteButton}
          contentStyle={styles.deleteContent}
          loading={deleteSubscription.isPending}
          testID="subscription-delete-button"
        >
          Delete Subscription
        </Button>
      </View>

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Subscription"
        message={`Are you sure you want to delete "${subscription.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        testID="subscription-delete-dialog"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  deleteSection: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  deleteButton: {
    borderColor: COLORS.error,
  },
  deleteContent: {
    height: LAYOUT.buttonHeight,
  },
});
