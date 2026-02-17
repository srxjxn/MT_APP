import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { StudentNote, StudentNoteInsert, StudentNoteUpdate, UserProfile, LessonInstance } from '../types';

export const noteKeys = {
  all: ['student_notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (studentId: string) => [...noteKeys.lists(), studentId] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

export type StudentNoteWithJoins = StudentNote & {
  author?: Pick<UserProfile, 'first_name' | 'last_name'>;
  lesson_instance?: Pick<LessonInstance, 'date' | 'start_time'> | null;
};

export function useStudentNotes(studentId: string) {
  return useQuery({
    queryKey: noteKeys.list(studentId),
    queryFn: async (): Promise<StudentNoteWithJoins[]> => {
      const { data, error } = await supabase
        .from('student_notes')
        .select(`
          *,
          author:users!student_notes_author_id_fkey(first_name, last_name),
          lesson_instance:lesson_instances!student_notes_lesson_instance_id_fkey(date, start_time)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!studentId,
  });
}

export function useCreateStudentNote() {
  const queryClient = useQueryClient();
  const userProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async (note: Omit<StudentNoteInsert, 'org_id' | 'author_id'>) => {
      const { data, error } = await supabase
        .from('student_notes')
        .insert({
          ...note,
          org_id: userProfile!.org_id,
          author_id: userProfile!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useUpdateStudentNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: StudentNoteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('student_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useDeleteStudentNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}
