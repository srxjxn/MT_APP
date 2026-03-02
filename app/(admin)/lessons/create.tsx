import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { LessonTemplateForm } from '@/components/lessons/LessonTemplateForm';
import { useCreateLessonTemplate } from '@/lib/hooks/useLessonTemplates';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { useCourts } from '@/lib/hooks/useCourts';
import { instanceKeys } from '@/lib/hooks/useLessonInstances';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { supabase } from '@/lib/supabase';
import { generateInstancesForTemplates } from '@/lib/helpers/generateInstances';
import { COLORS } from '@/constants/theme';
import { LessonTemplateFormData } from '@/lib/validation/lessonTemplate';
import { LessonTemplate } from '@/lib/types';

export default function CreateLessonTemplateScreen() {
  const createTemplate = useCreateLessonTemplate();
  const { data: coaches } = useCoachUsers();
  const { data: courts } = useCourts();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (dataArray: LessonTemplateFormData[]) => {
    setIsSubmitting(true);
    try {
      // Phase 1: Create all templates
      const createdTemplates: LessonTemplate[] = [];
      for (const data of dataArray) {
        const result = await createTemplate.mutateAsync({
          ...data,
          court_id: data.court_id || null,
        });
        createdTemplates.push(result);
      }

      // Phase 2: Auto-generate instances for next 4 weeks
      const today = new Date();
      const dateFrom = today.toISOString().split('T')[0];
      const fourWeeksLater = new Date(today);
      fourWeeksLater.setDate(fourWeeksLater.getDate() + 27);
      const dateTo = fourWeeksLater.toISOString().split('T')[0];

      let scheduledCount = 0;
      let skippedCount = 0;

      try {
        const result = await generateInstancesForTemplates(
          supabase,
          createdTemplates,
          dateFrom,
          dateTo,
          orgId!
        );
        scheduledCount = result.created.length;
        skippedCount = result.skipped.length;
        queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      } catch {
        // Generation failed but templates were created — still navigate back
      }

      // Build descriptive snackbar message
      let message = `Created ${dataArray.length} template(s)`;
      if (scheduledCount > 0) {
        message += ` and scheduled ${scheduledCount} lesson(s)`;
      }
      if (skippedCount > 0) {
        message += ` (${skippedCount} skipped due to conflicts)`;
      }

      showSnackbar(message, 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create template', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <LessonTemplateForm
        coaches={coaches}
        courts={courts}
        onSubmit={handleSubmit}
        loading={isSubmitting}
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
