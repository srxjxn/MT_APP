import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { LessonTemplate, LessonTemplateInsert, LessonTemplateUpdate, UserProfile, Court } from '../types';
import { instanceKeys } from './useLessonInstances';
import { enrollStudentsByUTR } from '../helpers/enrollByUTR';

export const templateKeys = {
  all: ['lesson_templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (orgId: string) => [...templateKeys.lists(), orgId] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

export type LessonTemplateWithJoins = LessonTemplate & {
  coach?: Pick<UserProfile, 'first_name' | 'last_name'>;
  court?: Pick<Court, 'name'> | null;
};

export function useLessonTemplates() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: templateKeys.list(orgId ?? ''),
    queryFn: async (): Promise<LessonTemplateWithJoins[]> => {
      const { data, error } = await supabase
        .from('lesson_templates')
        .select('*, coach:users!lesson_templates_coach_id_fkey(first_name, last_name), court:courts!lesson_templates_court_id_fkey(name)')
        .eq('org_id', orgId!)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });
}

export function useLessonTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: async (): Promise<LessonTemplateWithJoins> => {
      const { data, error } = await supabase
        .from('lesson_templates')
        .select('*, coach:users!lesson_templates_coach_id_fkey(first_name, last_name), court:courts!lesson_templates_court_id_fkey(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreateLessonTemplate() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (template: Omit<LessonTemplateInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('lesson_templates')
        .insert({ ...template, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}

export function useUpdateLessonTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LessonTemplateUpdate & { id: string }) => {
      // Fetch previous skill_level so we can detect changes for auto-enrollment
      const { data: previous, error: prevError } = await supabase
        .from('lesson_templates')
        .select('skill_level, org_id')
        .eq('id', id)
        .single();
      if (prevError) throw prevError;

      const { data, error } = await supabase
        .from('lesson_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Cascade denormalized fields to future scheduled instances
      const today = new Date().toISOString().split('T')[0];
      const instanceUpdate: Record<string, unknown> = {};
      if (updates.name !== undefined) instanceUpdate.name = updates.name;
      if (updates.lesson_type !== undefined) instanceUpdate.lesson_type = updates.lesson_type;
      if (updates.duration_minutes !== undefined) instanceUpdate.duration_minutes = updates.duration_minutes;
      if (updates.max_students !== undefined) instanceUpdate.max_students = updates.max_students;
      if (updates.price_cents !== undefined) instanceUpdate.price_cents = updates.price_cents;
      if (updates.description !== undefined) instanceUpdate.description = updates.description;
      if ((updates as any).skill_level !== undefined) instanceUpdate.skill_level = (updates as any).skill_level;
      if (updates.coach_id !== undefined) instanceUpdate.coach_id = updates.coach_id;
      if (updates.court_id !== undefined) instanceUpdate.court_id = updates.court_id;

      if (updates.start_time !== undefined || updates.duration_minutes !== undefined) {
        const st = (updates.start_time ?? (data as any).start_time) as string;
        const dur = (updates.duration_minutes ?? (data as any).duration_minutes) as number;
        const [h, m] = st.split(':').map(Number);
        const endMin = h * 60 + m + dur;
        const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
        instanceUpdate.start_time = st;
        instanceUpdate.end_time = endTime;
      }

      let cascadedInstanceIds: string[] = [];
      if (Object.keys(instanceUpdate).length > 0) {
        const { data: cascaded, error: cascadeError } = await supabase
          .from('lesson_instances')
          .update(instanceUpdate)
          .eq('template_id', id)
          .eq('status', 'scheduled')
          .gte('date', today)
          .select('id');
        if (cascadeError) throw cascadeError;
        cascadedInstanceIds = (cascaded ?? []).map((r) => r.id);
      }

      // Auto-enroll by UTR if skill_level changed to a non-null value
      const newSkillLevel = (updates as any).skill_level;
      if (
        newSkillLevel !== undefined &&
        newSkillLevel !== null &&
        newSkillLevel !== previous?.skill_level &&
        cascadedInstanceIds.length > 0 &&
        previous?.org_id
      ) {
        await enrollStudentsByUTR(supabase, cascadedInstanceIds, newSkillLevel, previous.org_id);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useDeleteLessonTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lesson_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}
