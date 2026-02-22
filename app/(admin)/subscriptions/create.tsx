import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { useCreateSubscription } from '@/lib/hooks/useSubscriptions';
import { useParentUsers } from '@/lib/hooks/useStudents';
import { useStudents } from '@/lib/hooks/useStudents';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS } from '@/constants/theme';
import { SubscriptionFormData } from '@/lib/validation/subscription';

export default function CreateSubscriptionScreen() {
  const { data: parentUsers } = useParentUsers();
  const { data: allStudents } = useStudents();
  const createSubscription = useCreateSubscription();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const students = allStudents?.map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    parent_id: s.parent_id,
  }));

  const handleSubmit = async (data: SubscriptionFormData) => {
    try {
      await createSubscription.mutateAsync(data);
      showSnackbar('Subscription created', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create subscription', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <SubscriptionForm
        parentUsers={parentUsers}
        students={students}
        onSubmit={handleSubmit}
        loading={createSubscription.isPending}
        submitLabel="Create Subscription"
        testID="create-subscription-form"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
