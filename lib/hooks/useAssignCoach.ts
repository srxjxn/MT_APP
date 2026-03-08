import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { coachPricingKeys } from './useCoachPricing';
import { userKeys } from './useStudents';

export function useAssignCoach() {
  const queryClient = useQueryClient();
  const currentUserProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async ({ parentId, coachId }: { parentId: string; coachId: string | null }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ assigned_coach_id: coachId })
        .eq('id', parentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users', 'parents'] });

      // If the current user is the parent being updated, sync Zustand store
      if (currentUserProfile && data.id === currentUserProfile.id) {
        useAuthStore.getState().setUserProfile(data);
      }
    },
  });
}
