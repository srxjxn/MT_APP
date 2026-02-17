import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { CoachAvailability, CoachAvailabilityInsert, CoachAvailabilityUpdate } from '../types';

export const availabilityKeys = {
  all: ['coach_availability'] as const,
  lists: () => [...availabilityKeys.all, 'list'] as const,
  list: (coachId: string) => [...availabilityKeys.lists(), coachId] as const,
};

export function useCoachAvailability(coachId?: string) {
  const userProfile = useAuthStore((s) => s.userProfile);
  const id = coachId ?? userProfile?.id ?? '';

  return useQuery({
    queryKey: availabilityKeys.list(id),
    queryFn: async (): Promise<CoachAvailability[]> => {
      const { data, error } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();
  const userProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async (availability: Omit<CoachAvailabilityInsert, 'org_id' | 'coach_id'>) => {
      const { data, error } = await supabase
        .from('coach_availability')
        .insert({
          ...availability,
          org_id: userProfile!.org_id,
          coach_id: userProfile!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CoachAvailabilityUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('coach_availability')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
    },
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coach_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
    },
  });
}
