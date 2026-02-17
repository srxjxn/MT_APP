import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LessonTemplateForm } from '@/components/lessons/LessonTemplateForm';
import { useCreateLessonTemplate } from '@/lib/hooks/useLessonTemplates';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { useCourts } from '@/lib/hooks/useCourts';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS } from '@/constants/theme';
import { LessonTemplateFormData } from '@/lib/validation/lessonTemplate';

export default function CreateLessonTemplateScreen() {
  const createTemplate = useCreateLessonTemplate();
  const { data: coaches } = useCoachUsers();
  const { data: courts } = useCourts();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleSubmit = async (dataArray: LessonTemplateFormData[]) => {
    try {
      for (const data of dataArray) {
        await createTemplate.mutateAsync({
          ...data,
          court_id: data.court_id || null,
        });
      }
      showSnackbar(`Created ${dataArray.length} lesson template(s)`, 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create template', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <LessonTemplateForm
        coaches={coaches}
        courts={courts}
        onSubmit={handleSubmit}
        loading={createTemplate.isPending}
        submitLabel="Create Template"
        testID="create-template-form"
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
