import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { LessonRequest, LessonRequestInsert, LessonRequestUpdate, LessonRequestStatus } from '../types';

export const lessonRequestKeys = {
  all: ['lesson_requests'] as const,
  lists: () => [...lessonRequestKeys.all, 'list'] as const,
  parentRequests: (parentId: string) => [...lessonRequestKeys.all, 'parent', parentId] as const,
  allOrgRequests: (orgId: string, status?: string) => [...lessonRequestKeys.all, 'org', orgId, status ?? 'all'] as const,
};

export type LessonRequestWithJoins = LessonRequest & {
  student: { first_name: string; last_name: string };
  coach: { first_name: string; last_name: string };
  requested_by_user: { first_name: string; last_name: string };
};

export function useParentLessonRequests() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: lessonRequestKeys.parentRequests(userProfile?.id ?? ''),
    queryFn: async (): Promise<LessonRequestWithJoins[]> => {
      const { data, error } = await supabase
        .from('lesson_requests')
        .select('*, student:students!lesson_requests_student_id_fkey(first_name, last_name), coach:users!lesson_requests_coach_id_fkey(first_name, last_name), requested_by_user:users!lesson_requests_requested_by_fkey(first_name, last_name)')
        .eq('requested_by', userProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!userProfile?.id,
  });
}

export function useAllLessonRequests(statusFilter?: LessonRequestStatus) {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: lessonRequestKeys.allOrgRequests(orgId ?? '', statusFilter),
    queryFn: async (): Promise<LessonRequestWithJoins[]> => {
      let query = supabase
        .from('lesson_requests')
        .select('*, student:students!lesson_requests_student_id_fkey(first_name, last_name), coach:users!lesson_requests_coach_id_fkey(first_name, last_name), requested_by_user:users!lesson_requests_requested_by_fkey(first_name, last_name)')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });
}

export function useCreateLessonRequest() {
  const queryClient = useQueryClient();
  const userProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async (request: Omit<LessonRequestInsert, 'org_id' | 'requested_by'>) => {
      const { data, error } = await supabase
        .from('lesson_requests')
        .insert({
          ...request,
          org_id: userProfile!.org_id,
          requested_by: userProfile!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lessonRequestKeys.all });
    },
  });
}

export function useUpdateLessonRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LessonRequestUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('lesson_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lessonRequestKeys.all });
    },
  });
}

export function useApproveAndSchedule() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({
      requestId,
      coachId,
      courtId,
      date,
      startTime,
      endTime,
      studentId,
    }: {
      requestId: string;
      coachId: string;
      courtId?: string;
      date: string;
      startTime: string;
      endTime: string;
      studentId: string;
    }) => {
      // 1. Create lesson instance
      const { data: instance, error: instErr } = await supabase
        .from('lesson_instances')
        .insert({
          org_id: orgId!,
          coach_id: coachId,
          court_id: courtId ?? null,
          date,
          start_time: startTime,
          end_time: endTime,
          status: 'scheduled',
        })
        .select()
        .single();

      if (instErr) throw instErr;

      // 2. Create enrollment
      const { error: enrollErr } = await supabase
        .from('enrollments')
        .insert({
          org_id: orgId!,
          lesson_instance_id: instance.id,
          student_id: studentId,
          status: 'enrolled',
        });

      if (enrollErr) throw enrollErr;

      // 3. Update request status
      const { data: updatedRequest, error: reqErr } = await supabase
        .from('lesson_requests')
        .update({
          status: 'approved' as LessonRequestStatus,
          lesson_instance_id: instance.id,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (reqErr) throw reqErr;

      return updatedRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lessonRequestKeys.all });
    },
  });
}
