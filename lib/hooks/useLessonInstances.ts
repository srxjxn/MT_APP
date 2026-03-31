import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { LessonInstance, LessonInstanceInsert, LessonInstanceUpdate, LessonTemplate, UserProfile, Court, LessonStatus, LessonInstanceCoach } from '../types';
import { generateInstancesForTemplates, GenerateResult } from '../helpers/generateInstances';
import { expandTemplatesToVirtuals, mergeVirtualAndReal } from '../helpers/expandTemplates';
import { useLessonTemplates } from './useLessonTemplates';
import { findActivePackage, deductPackageHours, studentPackageKeys } from './useStudentPackages';

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
  _isVirtual?: boolean;
  _templateId?: string;
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
        results = results.filter((r) => r.lesson_type === 'group');
      } else if (filters?.lessonType === 'private') {
        results = results.filter((r) => r.lesson_type === 'private' || r.lesson_type === 'semi_private');
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
        results = results.filter((r) => r.lesson_type === 'group');
      } else if (lessonType === 'private') {
        results = results.filter((r) => r.lesson_type === 'private' || r.lesson_type === 'semi_private');
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

export function useUncompletedPastLessonsCount(coachId: string, periodEnd: string) {
  return useQuery({
    queryKey: [...instanceKeys.all, 'uncompleted_count', coachId, periodEnd],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('lesson_instances')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', coachId)
        .eq('status', 'scheduled')
        .lte('date', periodEnd);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!coachId && !!periodEnd,
  });
}

export function useBulkCompletePastLessons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ beforeDate, coachId }: { beforeDate: string; coachId?: string }) => {
      let query = supabase
        .from('lesson_instances')
        .update({ status: 'completed' as const })
        .eq('status', 'scheduled')
        .lte('date', beforeDate);

      if (coachId) {
        query = query.eq('coach_id', coachId);
      }

      const { data, error } = await query.select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function useLessonInstancesWithVirtuals(filters?: InstanceFilters) {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const today = todayString();
  const effectiveFilters = {
    ...filters,
    dateFrom: filters?.dateFrom || today,
    dateTo: filters?.dateTo || addDaysToDate(today, 28),
  };
  const realQuery = useLessonInstances(effectiveFilters);
  const templatesQuery = useLessonTemplates();

  const data = useMemo(() => {
    if (!realQuery.data || !templatesQuery.data || !orgId) return realQuery.data;

    const today = todayString();
    const dateFrom = filters?.dateFrom ?? today;
    const dateTo = filters?.dateTo ?? addDaysToDate(today, 28);

    // Filter templates by filters
    let templates = templatesQuery.data.filter((t) => t.is_active);
    if (filters?.coachId) {
      templates = templates.filter((t) => t.coach_id === filters.coachId);
    }
    if (filters?.lessonType) {
      if (filters.lessonType === 'group') {
        templates = templates.filter((t) => t.lesson_type === 'group');
      } else if (filters.lessonType === 'private') {
        templates = templates.filter((t) => t.lesson_type === 'private' || t.lesson_type === 'semi_private');
      }
    }

    const virtuals = expandTemplatesToVirtuals(templates, dateFrom, dateTo, orgId);
    return mergeVirtualAndReal(realQuery.data, virtuals);
  }, [realQuery.data, templatesQuery.data, orgId, filters?.dateFrom, filters?.dateTo, filters?.coachId, filters?.lessonType]);

  return {
    ...realQuery,
    data,
    isLoading: realQuery.isLoading || templatesQuery.isLoading,
  };
}

export function useCoachLessonInstancesWithVirtuals(lessonType?: string) {
  const userProfile = useAuthStore((s) => s.userProfile);
  const orgId = userProfile?.org_id;
  const realQuery = useCoachLessonInstances(lessonType);
  const templatesQuery = useLessonTemplates();

  const data = useMemo(() => {
    if (!realQuery.data || !templatesQuery.data || !orgId || !userProfile?.id) return realQuery.data;

    const today = todayString();
    const dateTo = addDaysToDate(today, 28);

    let templates = templatesQuery.data.filter(
      (t) => t.is_active && t.coach_id === userProfile.id
    );
    if (lessonType === 'group') {
      templates = templates.filter((t) => t.lesson_type === 'group');
    } else if (lessonType === 'private') {
      templates = templates.filter((t) => t.lesson_type === 'private' || t.lesson_type === 'semi_private');
    }

    const virtuals = expandTemplatesToVirtuals(templates, today, dateTo, orgId);
    // Filter out past instances from real data (no date filter on underlying query)
    const filteredReal = realQuery.data.filter(inst => inst.date >= today);
    return mergeVirtualAndReal(filteredReal, virtuals);
  }, [realQuery.data, templatesQuery.data, orgId, userProfile?.id, lessonType]);

  return {
    ...realQuery,
    data,
    isLoading: realQuery.isLoading || templatesQuery.isLoading,
  };
}

export type CoachLessonHistoryItem = LessonInstanceWithJoins & {
  enrolledStudentNames?: string[];
};

export function useCoachLessonHistory() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const today = todayString();

  return useQuery({
    queryKey: [...instanceKeys.coach(userProfile?.id ?? ''), 'history'],
    queryFn: async (): Promise<CoachLessonHistoryItem[]> => {
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
        .lte('date', today)
        .in('status', ['scheduled', 'completed'])
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      const instances = (data as any[]).map((item) => ({
        ...item,
        enrollment_count: item.enrollments?.[0]?.count ?? 0,
        enrollments: undefined,
      }));

      if (!instances.length) return [];

      // Fetch enrolled student names
      const instanceIds = instances.map((i) => i.id);
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('lesson_instance_id, student:students!enrollments_student_id_fkey(first_name, last_name)')
        .in('lesson_instance_id', instanceIds)
        .eq('status', 'enrolled');

      if (enrollError) throw enrollError;

      const nameMap = new Map<string, string[]>();
      for (const e of (enrollments ?? []) as any[]) {
        const name = e.student ? `${e.student.first_name} ${e.student.last_name}` : 'Unknown';
        const existing = nameMap.get(e.lesson_instance_id) ?? [];
        existing.push(name);
        nameMap.set(e.lesson_instance_id, existing);
      }

      return instances.map((inst) => ({
        ...inst,
        enrolledStudentNames: nameMap.get(inst.id) ?? [],
      }));
    },
    enabled: !!userProfile?.id,
  });
}

export function useCompleteLessonWithNotification() {
  const queryClient = useQueryClient();
  const userProfile = useAuthStore((s) => s.userProfile);
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (instanceId: string) => {
      // 1. Mark as completed
      const { error: updateError } = await supabase
        .from('lesson_instances')
        .update({ status: 'completed' as const })
        .eq('id', instanceId);
      if (updateError) throw updateError;

      // 2. Fetch instance details (include duration + coach for package deduction)
      const { data: instance, error: instError } = await supabase
        .from('lesson_instances')
        .select('name, date, duration_minutes, coach_id')
        .eq('id', instanceId)
        .single();
      if (instError) throw instError;

      // 3. Fetch enrollments with student + parent info
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('student_id, student:students!enrollments_student_id_fkey(first_name, last_name, parent_id)')
        .eq('lesson_instance_id', instanceId)
        .eq('status', 'enrolled');
      if (enrollError) throw enrollError;

      // 4. Create notifications for each unique parent
      const coachName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Your coach';
      const parentNotifications = new Map<string, string[]>();

      for (const e of (enrollments ?? []) as any[]) {
        if (!e.student?.parent_id) continue;
        const parentId = e.student.parent_id;
        const studentName = `${e.student.first_name} ${e.student.last_name}`;
        const existing = parentNotifications.get(parentId) ?? [];
        existing.push(studentName);
        parentNotifications.set(parentId, existing);
      }

      for (const [parentId, studentNames] of parentNotifications) {
        const studentsStr = studentNames.join(', ');
        try {
          await supabase.from('notifications').insert({
            org_id: orgId!,
            user_id: parentId,
            title: 'Lesson Completed',
            body: `Coach ${coachName} completed a lesson with ${studentsStr} on ${instance.date}.`,
          });
        } catch {}
      }

      // 5. Auto-deduct package hours for each enrolled student
      let deductedCount = 0;
      if (instance.coach_id) {
        const hoursToDeduct = (instance.duration_minutes ?? 60) / 60;
        for (const e of (enrollments ?? []) as any[]) {
          const studentId = e.student_id;
          if (!studentId) continue;
          try {
            const pkg = await findActivePackage(studentId, instance.coach_id);
            if (pkg) {
              await deductPackageHours(pkg.id, hoursToDeduct);
              deductedCount++;
            }
          } catch {}
        }
      }

      return { notifiedCount: parentNotifications.size, deductedCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
      queryClient.invalidateQueries({ queryKey: studentPackageKeys.all });
      queryClient.invalidateQueries({ queryKey: ['coach_student_packages'] });
    },
  });
}

export function useMaterializeInstance() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (virtual: LessonInstanceWithJoins) => {
      if (!orgId) throw new Error('No org_id');
      if (!virtual._isVirtual || !virtual._templateId) {
        throw new Error('Not a virtual instance');
      }

      // Race condition guard: check if already materialized
      const { data: existing } = await supabase
        .from('lesson_instances')
        .select('id')
        .eq('template_id', virtual._templateId)
        .eq('date', virtual.date)
        .limit(1);

      if (existing && existing.length > 0) {
        return existing[0];
      }

      const { data, error } = await supabase
        .from('lesson_instances')
        .insert({
          org_id: orgId,
          template_id: virtual._templateId,
          coach_id: virtual.coach_id,
          court_id: virtual.court_id,
          date: virtual.date,
          start_time: virtual.start_time,
          end_time: virtual.end_time,
          status: 'scheduled',
          name: virtual.name,
          lesson_type: virtual.lesson_type,
          duration_minutes: virtual.duration_minutes,
          max_students: virtual.max_students,
          price_cents: virtual.price_cents,
          description: virtual.description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

// --- Additional Coaches hooks ---

export const additionalCoachKeys = {
  all: ['lesson_instance_coaches'] as const,
  list: (instanceId: string) => ['lesson_instance_coaches', instanceId] as const,
};

export type AdditionalCoachWithProfile = LessonInstanceCoach & {
  coach: Pick<UserProfile, 'first_name' | 'last_name'>;
};

export function useAdditionalCoaches(instanceId: string | undefined) {
  return useQuery({
    queryKey: additionalCoachKeys.list(instanceId ?? ''),
    queryFn: async (): Promise<AdditionalCoachWithProfile[]> => {
      const { data, error } = await supabase
        .from('lesson_instance_coaches')
        .select('*, coach:users!lesson_instance_coaches_coach_id_fkey(first_name, last_name)')
        .eq('lesson_instance_id', instanceId!);

      if (error) throw error;
      return data as any;
    },
    enabled: !!instanceId,
  });
}

export function useAddAdditionalCoach() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({ instanceId, coachId }: { instanceId: string; coachId: string }) => {
      const { data, error } = await supabase
        .from('lesson_instance_coaches')
        .insert({ org_id: orgId!, lesson_instance_id: instanceId, coach_id: coachId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: additionalCoachKeys.list(variables.instanceId) });
    },
  });
}

export function useRemoveAdditionalCoach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, instanceId }: { id: string; instanceId: string }) => {
      const { error } = await supabase
        .from('lesson_instance_coaches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: additionalCoachKeys.list(variables.instanceId) });
    },
  });
}
