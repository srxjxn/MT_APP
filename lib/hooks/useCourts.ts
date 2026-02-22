import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Court, CourtInsert, CourtUpdate } from '../types';

export interface CourtWithNextPrivate extends Court {
  nextPrivateLesson?: {
    date: string;
    start_time: string;
    coachName: string;
  } | null;
}

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

export function useCourtsWithPrivateLessons() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: [...courtKeys.list(orgId ?? ''), 'with_private'],
    queryFn: async (): Promise<CourtWithNextPrivate[]> => {
      const today = new Date().toISOString().split('T')[0];

      // Fetch courts
      const { data: courts, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .eq('org_id', orgId!)
        .order('name');

      if (courtsError) throw courtsError;

      // Fetch upcoming private lessons on each court
      const { data: instances, error: instError } = await supabase
        .from('lesson_instances')
        .select(`
          court_id, date, start_time,
          template:lesson_templates!lesson_instances_template_id_fkey(lesson_type),
          coach:users!lesson_instances_coach_id_fkey(first_name, last_name)
        `)
        .eq('org_id', orgId!)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (instError) throw instError;

      // Build map: court_id -> first private instance
      const courtNextPrivate = new Map<string, { date: string; start_time: string; coachName: string }>();
      for (const inst of (instances as any[]) ?? []) {
        if (inst.template?.lesson_type !== 'private' && inst.template?.lesson_type !== 'semi_private') continue;
        if (!inst.court_id || courtNextPrivate.has(inst.court_id)) continue;
        courtNextPrivate.set(inst.court_id, {
          date: inst.date,
          start_time: inst.start_time,
          coachName: inst.coach ? `${inst.coach.first_name} ${inst.coach.last_name}` : '',
        });
      }

      return (courts ?? []).map((court) => ({
        ...court,
        nextPrivateLesson: courtNextPrivate.get(court.id) ?? null,
      }));
    },
    enabled: !!orgId,
  });
}
