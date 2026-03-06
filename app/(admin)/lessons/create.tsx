import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { LessonTemplateForm } from '@/components/lessons/LessonTemplateForm';
import { LessonInstanceForm, LessonInstanceFormData } from '@/components/lessons/LessonInstanceForm';
import { useCreateLessonTemplate } from '@/lib/hooks/useLessonTemplates';
import { useCreateLessonInstance, instanceKeys } from '@/lib/hooks/useLessonInstances';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { useCourts } from '@/lib/hooks/useCourts';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { supabase } from '@/lib/supabase';
import { generateInstancesForTemplates } from '@/lib/helpers/generateInstances';
import { COLORS, SPACING } from '@/constants/theme';
import { LessonTemplateFormData } from '@/lib/validation/lessonTemplate';
import { LessonTemplate } from '@/lib/types';

type CreateMode = 'recurring' | 'single';

export default function CreateLessonScreen() {
  const createTemplate = useCreateLessonTemplate();
  const createInstance = useCreateLessonInstance();
  const { data: coaches } = useCoachUsers();
  const { data: courts } = useCourts();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<CreateMode>('recurring');

  const handleTemplateSubmit = async (dataArray: LessonTemplateFormData[]) => {
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

  const handleInstanceSubmit = async (data: LessonInstanceFormData) => {
    setIsSubmitting(true);
    try {
      // Compute end_time from start_time + duration_minutes
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + data.duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      await createInstance.mutateAsync({
        template_id: null,
        coach_id: data.coach_id,
        court_id: data.court_id || null,
        date: data.date,
        start_time: data.start_time,
        end_time: endTime,
        name: data.name,
        lesson_type: data.lesson_type as any,
        duration_minutes: data.duration_minutes,
        max_students: data.max_students,
        price_cents: data.price_cents,
        description: data.description,
        notes: data.notes,
        status: 'scheduled',
      });

      showSnackbar('Lesson created', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create lesson', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <SegmentedButtons
        value={mode}
        onValueChange={(v) => setMode(v as CreateMode)}
        buttons={[
          { value: 'recurring', label: 'Recurring' },
          { value: 'single', label: 'Single Lesson' },
        ]}
        style={styles.modeToggle}
      />
      {mode === 'recurring' ? (
        <LessonTemplateForm
          coaches={coaches}
          courts={courts}
          onSubmit={handleTemplateSubmit}
          loading={isSubmitting}
          submitLabel="Create Template"
          testID="create-template-form"
        />
      ) : (
        <LessonInstanceForm
          coaches={coaches}
          courts={courts}
          onSubmit={handleInstanceSubmit}
          loading={isSubmitting}
          submitLabel="Create Lesson"
          testID="create-instance-form"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modeToggle: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
});
