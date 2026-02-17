import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { LessonTemplate, LessonTemplateInsert, LessonTemplateUpdate, UserProfile, Court } from '../types';

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
      const { data, error } = await supabase
        .from('lesson_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.setQueryData(templateKeys.detail(data.id), data);
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
