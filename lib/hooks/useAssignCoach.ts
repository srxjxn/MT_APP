import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { studentKeys } from './useStudents';

export function useAssignCoach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, coachId }: { studentId: string; coachId: string | null }) => {
      const { data, error } = await supabase
        .from('students')
        .update({ assigned_coach_id: coachId })
        .eq('id', studentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}
