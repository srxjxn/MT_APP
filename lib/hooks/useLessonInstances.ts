import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { LessonInstance, LessonInstanceInsert, LessonInstanceUpdate, LessonTemplate, UserProfile, Court, LessonStatus } from '../types';
import { generateInstancesForTemplates, GenerateResult } from '../helpers/generateInstances';

export const instanceKeys = {
  all: ['lesson_instances'] as const,
  lists: () => [...instanceKeys.all, 'list'] as const,
  list: (orgId: string) => [...instanceKeys.lists(), orgId] as const,
  details: () => [...instanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...instanceKeys.details(), id] as const,
  coach: (coachId: string) => [...instanceKeys.all, 'coach', coachId] as const,
  parent: (parentId: string) => [...instanceKeys.all, 'parent', parentId] as const,
};

export type LessonInstanceWithJoins = LessonInstance & {
  template?: Pick<LessonTemplate, 'name' | 'lesson_type' | 'max_students' | 'price_cents' | 'description'> | null;
  coach?: Pick<UserProfile, 'first_name' | 'last_name'>;
  court?: Pick<Court, 'name'> | null;
  enrollment_count?: number;
};

interface InstanceFilters {
  dateFrom?: string;
  dateTo?: string;
  coachId?: string;
  status?: LessonStatus;
  lessonType?: string;
}

export function useLessonInstances(filters?: InstanceFilters) {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: [...instanceKeys.list(orgId ?? ''), filters],
    queryFn: async (): Promise<LessonInstanceWithJoins[]> => {
      let query = supabase
        .from('lesson_instances')
        .select(`
          *,
          template:lesson_templates!lesson_instances_template_id_fkey(name, lesson_type, max_students, price_cents, description),
          coach:users!lesson_instances_coach_id_fkey(first_name, last_name),
          court:courts!lesson_instances_court_id_fkey(name),
          enrollments(count)
        `)
        .eq('org_id', orgId!)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('date', filters.dateTo);
      if (filters?.coachId) query = query.eq('coach_id', filters.coachId);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;

      let results = (data as any[]).map((item) => ({
        ...item,
        enrollment_count: item.enrollments?.[0]?.count ?? 0,
        enrollments: undefined,
      }));

      if (filters?.lessonType === 'group') {
        results = results.filter((r) => r.template?.lesson_type === 'group');
      } else if (filters?.lessonType === 'private') {
        results = results.filter((r) => r.template?.lesson_type === 'private' || r.template?.lesson_type === 'semi_private');
      }

      return results;
    },
    enabled: !!orgId,
  });
}

export function useLessonInstance(id: string) {
  return useQuery({
    queryKey: instanceKeys.detail(id),
    queryFn: async (): Promise<LessonInstanceWithJoins & { enrollments_list?: any[] }> => {
      const { data, error } = await supabase
        .from('lesson_instances')
        .select(`
          *,
          template:lesson_templates!lesson_instances_template_id_fkey(name, lesson_type, max_students, price_cents, description),
          coach:users!lesson_instances_coach_id_fkey(first_name, last_name),
          court:courts!lesson_instances_court_id_fkey(name),
          enrollments_list:enrollments(*, student:students!enrollments_student_id_fkey(first_name, last_name, skill_level, parent_id))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreateLessonInstance() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (instance: Omit<LessonInstanceInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('lesson_instances')
        .insert({ ...instance, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });
}

export function useUpdateLessonInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LessonInstanceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('lesson_instances')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: instanceKeys.detail(data.id) });
    },
  });
}

export type { GenerateResult };

export function useGenerateInstances() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }): Promise<GenerateResult> => {
      // Fetch active templates
      const { data: templates, error: templateError } = await supabase
        .from('lesson_templates')
        .select('*')
        .eq('org_id', orgId!)
        .eq('is_active', true);

      if (templateError) throw templateError;
      if (!templates?.length) throw new Error('No active templates found');

      const result = await generateInstancesForTemplates(supabase, templates, dateFrom, dateTo, orgId!);

      if (result.created.length === 0 && result.skipped.length > 0) {
        throw new Error(`All ${result.skipped.length} instances skipped due to coach conflicts`);
      }

      if (result.created.length === 0 && result.skipped.length === 0) {
        throw new Error('No instances to generate for the selected date range');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });
}

export function useCoachLessonInstances(lessonType?: string) {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: [...instanceKeys.coach(userProfile?.id ?? ''), lessonType],
    queryFn: async (): Promise<LessonInstanceWithJoins[]> => {
      const { data, error } = await supabase
        .from('lesson_instances')
        .select(`
          *,
          template:lesson_templates!lesson_instances_template_id_fkey(name, lesson_type, max_students, price_cents, description),
          coach:users!lesson_instances_coach_id_fkey(first_name, last_name),
          court:courts!lesson_instances_court_id_fkey(name),
          enrollments(count)
        `)
        .eq('coach_id', userProfile!.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      let results = (data as any[]).map((item) => ({
        ...item,
        enrollment_count: item.enrollments?.[0]?.count ?? 0,
        enrollments: undefined,
      }));

      if (lessonType === 'group') {
        results = results.filter((r) => r.template?.lesson_type === 'group');
      } else if (lessonType === 'private') {
        results = results.filter((r) => r.template?.lesson_type === 'private' || r.template?.lesson_type === 'semi_private');
      }

      return results;
    },
    enabled: !!userProfile?.id,
  });
}

export type ParentLessonInstance = LessonInstanceWithJoins & {
  enrolledChildren?: { first_name: string; last_name: string }[];
};

export function useParentLessonInstances() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: instanceKeys.parent(userProfile?.id ?? ''),
    queryFn: async (): Promise<ParentLessonInstance[]> => {
      // First get parent's students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('parent_id', userProfile!.id);

      if (studentsError) throw studentsError;
      if (!students?.length) return [];

      const studentIds = students.map((s) => s.id);

      // Get enrollments for those students with student_id
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('lesson_instance_id, student_id')
        .in('student_id', studentIds)
        .eq('status', 'enrolled');

      if (enrollError) throw enrollError;
      if (!enrollments?.length) return [];

      const instanceIds = [...new Set(enrollments.map((e) => e.lesson_instance_id))];

      // Build a map of instance_id -> enrolled children
      const studentMap = new Map(students.map((s) => [s.id, s]));
      const instanceChildrenMap = new Map<string, { first_name: string; last_name: string }[]>();
      for (const e of enrollments) {
        const student = studentMap.get(e.student_id);
        if (student) {
          const existing = instanceChildrenMap.get(e.lesson_instance_id) ?? [];
          existing.push({ first_name: student.first_name, last_name: student.last_name });
          instanceChildrenMap.set(e.lesson_instance_id, existing);
        }
      }

      // Get the actual instances
      const { data, error } = await supabase
        .from('lesson_instances')
        .select(`
          *,
          template:lesson_templates!lesson_instances_template_id_fkey(name, lesson_type, max_students, price_cents, description),
          coach:users!lesson_instances_coach_id_fkey(first_name, last_name),
          court:courts!lesson_instances_court_id_fkey(name),
          enrollments(count)
        `)
        .in('id', instanceIds)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return (data as any[]).map((item) => ({
        ...item,
        enrollment_count: item.enrollments?.[0]?.count ?? 0,
        enrollments: undefined,
        enrolledChildren: instanceChildrenMap.get(item.id) ?? [],
      }));
    },
    enabled: !!userProfile?.id,
  });
}

export function useParentUpcomingLessons() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: [...instanceKeys.all, 'parent_upcoming', userProfile?.id ?? ''],
    queryFn: async (): Promise<{ studentName: string; instances: LessonInstanceWithJoins[] }[]> => {
      const today = new Date().toISOString().split('T')[0];

      // Get parent's students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('parent_id', userProfile!.id);

      if (studentsError) throw studentsError;
      if (!students?.length) return [];

      const result: { studentName: string; instances: LessonInstanceWithJoins[] }[] = [];

      for (const student of students) {
        // Get enrolled lesson instance IDs for this student
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('lesson_instance_id')
          .eq('student_id', student.id)
          .eq('status', 'enrolled');

        if (enrollError) throw enrollError;
        if (!enrollments?.length) continue;

        const instanceIds = enrollments.map((e) => e.lesson_instance_id);

        const { data: instances, error: instanceError } = await supabase
          .from('lesson_instances')
          .select(`
            *,
            template:lesson_templates!lesson_instances_template_id_fkey(name, lesson_type, max_students, price_cents, description),
            coach:users!lesson_instances_coach_id_fkey(first_name, last_name),
            court:courts!lesson_instances_court_id_fkey(name),
            enrollments(count)
          `)
          .in('id', instanceIds)
          .gte('date', today)
          .eq('status', 'scheduled')
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (instanceError) throw instanceError;
        if (!instances?.length) continue;

        result.push({
          studentName: `${student.first_name} ${student.last_name}`,
          instances: (instances as any[]).map((item) => ({
            ...item,
            enrollment_count: item.enrollments?.[0]?.count ?? 0,
            enrollments: undefined,
          })),
        });
      }

      return result;
    },
    enabled: !!userProfile?.id,
  });
}

export function useCheckCoachConflict() {
  return useMutation({
    mutationFn: async ({
      coachId,
      date,
      startTime,
      endTime,
      excludeInstanceId,
    }: {
      coachId: string;
      date: string;
      startTime: string;
      endTime: string;
      excludeInstanceId?: string;
    }) => {
      let query = supabase
        .from('lesson_instances')
        .select('id, date, start_time, end_time, template_id')
        .eq('coach_id', coachId)
        .eq('date', date)
        .in('status', ['scheduled', 'in_progress'])
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (excludeInstanceId) {
        query = query.neq('id', excludeInstanceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}
