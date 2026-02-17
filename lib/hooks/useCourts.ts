import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Court, CourtInsert, CourtUpdate } from '../types';

export const courtKeys = {
  all: ['courts'] as const,
  lists: () => [...courtKeys.all, 'list'] as const,
  list: (orgId: string) => [...courtKeys.lists(), orgId] as const,
  details: () => [...courtKeys.all, 'detail'] as const,
  detail: (id: string) => [...courtKeys.details(), id] as const,
};

export function useCourts() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: courtKeys.list(orgId ?? ''),
    queryFn: async (): Promise<Court[]> => {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('org_id', orgId!)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCourt(id: string) {
  return useQuery({
    queryKey: courtKeys.detail(id),
    queryFn: async (): Promise<Court> => {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (court: Omit<CourtInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('courts')
        .insert({ ...court, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courtKeys.lists() });
    },
  });
}

export function useUpdateCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CourtUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('courts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: courtKeys.lists() });
      queryClient.setQueryData(courtKeys.detail(data.id), data);
    },
  });
}

export function useDeleteCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('courts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courtKeys.lists() });
    },
  });
}
