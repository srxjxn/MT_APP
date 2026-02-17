import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { CourtForm } from '@/components/courts/CourtForm';
import { useCourt, useUpdateCourt, useDeleteCourt } from '@/lib/hooks/useCourts';
import { LoadingScreen, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { CourtFormData } from '@/lib/validation/court';

export default function EditCourtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: court, isLoading } = useCourt(id!);
  const updateCourt = useUpdateCourt();
  const deleteCourt = useDeleteCourt();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading || !court) {
    return <LoadingScreen message="Loading court..." />;
  }

  const handleSubmit = async (data: CourtFormData) => {
    try {
      await updateCourt.mutateAsync({ id: court.id, ...data });
      showSnackbar('Court updated successfully', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update court', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCourt.mutateAsync(court.id);
      showSnackbar('Court deleted', 'success');
      setShowDeleteDialog(false);
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete court', 'error');
      setShowDeleteDialog(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <CourtForm
        initialValues={{
          name: court.name,
          surface_type: court.surface_type,
          is_indoor: court.is_indoor,
          status: court.status,
          notes: court.notes ?? undefined,
        }}
        onSubmit={handleSubmit}
        loading={updateCourt.isPending}
        submitLabel="Update Court"
        testID="edit-court-form"
      />

      <View style={styles.deleteSection}>
        <Button
          mode="outlined"
          onPress={() => setShowDeleteDialog(true)}
          textColor={COLORS.error}
          style={styles.deleteButton}
          contentStyle={styles.deleteContent}
          loading={deleteCourt.isPending}
          testID="court-delete-button"
        >
          Delete Court
        </Button>
      </View>

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Court"
        message={`Are you sure you want to delete "${court.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        testID="court-delete-dialog"
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
