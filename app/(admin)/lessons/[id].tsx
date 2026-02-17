import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Switch, Text } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { LessonTemplateForm } from '@/components/lessons/LessonTemplateForm';
import { useLessonTemplate, useUpdateLessonTemplate, useDeleteLessonTemplate } from '@/lib/hooks/useLessonTemplates';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { useCourts } from '@/lib/hooks/useCourts';
import { LoadingScreen, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { LessonTemplateFormData } from '@/lib/validation/lessonTemplate';

export default function EditLessonTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: template, isLoading } = useLessonTemplate(id!);
  const { data: coaches } = useCoachUsers();
  const { data: courts } = useCourts();
  const updateTemplate = useUpdateLessonTemplate();
  const deleteTemplate = useDeleteLessonTemplate();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading || !template) {
    return <LoadingScreen message="Loading template..." />;
  }

  const handleSubmit = async (dataArray: LessonTemplateFormData[]) => {
    try {
      const data = dataArray[0];
      await updateTemplate.mutateAsync({
        id: template.id,
        ...data,
        court_id: data.court_id || null,
      });
      showSnackbar('Template updated successfully', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update template', 'error');
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateTemplate.mutateAsync({ id: template.id, is_active: !template.is_active });
      showSnackbar(template.is_active ? 'Template deactivated' : 'Template activated', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update template', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate.mutateAsync(template.id);
      showSnackbar('Template deleted', 'success');
      setShowDeleteDialog(false);
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete template', 'error');
      setShowDeleteDialog(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.toggleRow}>
        <Text variant="titleSmall" style={styles.toggleLabel}>Active</Text>
        <Switch
          value={template.is_active}
          onValueChange={handleToggleActive}
          color={COLORS.primary}
          testID="template-active-toggle"
        />
      </View>

      <LessonTemplateForm
        initialValues={{
          name: template.name,
          lesson_type: template.lesson_type,
          coach_id: template.coach_id,
          court_id: template.court_id ?? undefined,
          day_of_week: template.day_of_week,
          start_time: template.start_time,
          duration_minutes: template.duration_minutes,
          max_students: template.max_students,
          price_cents: template.price_cents,
          description: template.description ?? undefined,
        }}
        coaches={coaches}
        courts={courts}
        onSubmit={handleSubmit}
        loading={updateTemplate.isPending}
        submitLabel="Update Template"
        testID="edit-template-form"
      />

      <View style={styles.deleteSection}>
        <Button
          mode="outlined"
          onPress={() => setShowDeleteDialog(true)}
          textColor={COLORS.error}
          style={styles.deleteButton}
          contentStyle={styles.deleteContent}
          loading={deleteTemplate.isPending}
          testID="template-delete-button"
        >
          Delete Template
        </Button>
      </View>

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Template"
        message={`Are you sure you want to delete "${template.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        testID="template-delete-dialog"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingBottom: 0,
    minHeight: 48,
  },
  toggleLabel: {
    color: COLORS.textPrimary,
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
