import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { CourtForm } from '@/components/courts/CourtForm';
import { useCreateCourt } from '@/lib/hooks/useCourts';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS } from '@/constants/theme';
import { CourtFormData } from '@/lib/validation/court';

export default function CreateCourtScreen() {
  const createCourt = useCreateCourt();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleSubmit = async (data: CourtFormData) => {
    try {
      await createCourt.mutateAsync(data);
      showSnackbar('Court created successfully', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create court', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <CourtForm
        onSubmit={handleSubmit}
        loading={createCourt.isPending}
        submitLabel="Create Court"
        testID="create-court-form"
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
