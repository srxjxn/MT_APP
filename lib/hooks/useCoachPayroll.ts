import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { CoachPayout, CoachPayoutInsert, PayoutStatus } from '../types';

export const payrollKeys = {
  all: ['coach_payouts'] as const,
  lists: () => [...payrollKeys.all, 'list'] as const,
  list: (orgId: string) => [...payrollKeys.lists(), orgId] as const,
  detail: (id: string) => [...payrollKeys.all, 'detail', id] as const,
  workLog: (coachId: string, start: string, end: string) => [...payrollKeys.all, 'worklog', coachId, start, end] as const,
};

export type CoachPayoutWithJoins = CoachPayout & {
  coach: { first_name: string; last_name: string; drop_in_rate_cents: number | null; group_rate_cents: number | null };
};

export function useCoachPayouts() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: payrollKeys.list(orgId ?? ''),
    queryFn: async (): Promise<CoachPayoutWithJoins[]> => {
      const { data, error } = await supabase
        .from('coach_payouts')
        .select('*, coach:users!coach_payouts_coach_id_fkey(first_name, last_name, drop_in_rate_cents, group_rate_cents)')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });
}

export function useCoachPayout(id: string) {
  return useQuery({
    queryKey: payrollKeys.detail(id),
    queryFn: async (): Promise<CoachPayoutWithJoins> => {
      const { data, error } = await supabase
        .from('coach_payouts')
        .select('*, coach:users!coach_payouts_coach_id_fkey(first_name, last_name, drop_in_rate_cents, group_rate_cents)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export interface WorkLogInstance {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  lessonType: string;
  templateName: string;
  durationMinutes: number;
}

export interface WorkLogResult {
  groupHours: number;
  privateHours: number;
  instances: WorkLogInstance[];
}

export function useCoachWorkLog(coachId: string, start: string, end: string) {
  return useQuery({
    queryKey: payrollKeys.workLog(coachId, start, end),
    queryFn: async (): Promise<WorkLogResult> => {
      const { data, error } = await supabase
        .from('lesson_instances')
        .select(`
          id, date, start_time, end_time,
          template:lesson_templates!lesson_instances_template_id_fkey(name, lesson_type, duration_minutes)
        `)
        .eq('coach_id', coachId)
        .eq('status', 'completed')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      let groupMinutes = 0;
      let privateMinutes = 0;
      const instances: WorkLogInstance[] = [];

      for (const item of (data as any[]) ?? []) {
        const template = item.template;
        const lessonType = template?.lesson_type ?? 'group';
        const duration = template?.duration_minutes ?? 60;

        if (lessonType === 'group') {
          groupMinutes += duration;
        } else {
          privateMinutes += duration;
        }

        instances.push({
          id: item.id,
          date: item.date,
          start_time: item.start_time,
          end_time: item.end_time,
          lessonType,
          templateName: template?.name ?? 'Unknown',
          durationMinutes: duration,
        });
      }

      return {
        groupHours: Math.round((groupMinutes / 60) * 100) / 100,
        privateHours: Math.round((privateMinutes / 60) * 100) / 100,
        instances,
      };
    },
    enabled: !!coachId && !!start && !!end,
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (payout: Omit<CoachPayoutInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('coach_payouts')
        .insert({ ...payout, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
    },
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, paid_at }: { id: string; status: PayoutStatus; paid_at?: string }) => {
      const updates: any = { status };
      if (paid_at) updates.paid_at = paid_at;

      const { data, error } = await supabase
        .from('coach_payouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.detail(data.id) });
    },
  });
}

export function useDeletePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coach_payouts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
    },
  });
}
