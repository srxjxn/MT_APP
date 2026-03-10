import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { studentKeys } from './useStudents';
import { coachPricingKeys } from './useCoachPricing';
import { useAuthStore } from '../stores/authStore';

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
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.all });

      // If the logged-in user is this student's parent, patch Zustand for immediate UI reactivity
      // (the DB trigger handles the persistent update, but the in-memory store needs a nudge)
      const userProfile = useAuthStore.getState().userProfile;
      if (userProfile && userProfile.id === data.parent_id) {
        useAuthStore.getState().setUserProfile({
          ...userProfile,
          assigned_coach_id: data.assigned_coach_id,
        });
      }
    },
  });
}
