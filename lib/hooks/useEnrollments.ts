import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Enrollment, EnrollmentInsert, Student, SkillLevel } from '../types';
import { instanceKeys } from './useLessonInstances';
import { paymentKeys } from './usePayments';

export const enrollmentKeys = {
  all: ['enrollments'] as const,
  list: (instanceId: string) => [...enrollmentKeys.all, 'instance', instanceId] as const,
  student: (studentId: string) => [...enrollmentKeys.all, 'student', studentId] as const,
};

export type EnrollmentWithStudent = Enrollment & {
  student?: Pick<Student, 'first_name' | 'last_name' | 'skill_level'>;
};

export function useEnrollments(lessonInstanceId: string) {
  return useQuery({
    queryKey: enrollmentKeys.list(lessonInstanceId),
    queryFn: async (): Promise<EnrollmentWithStudent[]> => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, student:students!enrollments_student_id_fkey(first_name, last_name, skill_level)')
        .eq('lesson_instance_id', lessonInstanceId)
        .order('created_at');

      if (error) throw error;
      return data as any;
    },
    enabled: !!lessonInstanceId,
  });
}

export type EnrollStudentResult =
  | { action: 'enrolled'; lesson_instance_id: string }
  | { action: 'revived'; lesson_instance_id: string }
  | { action: 'already_registered'; lesson_instance_id: string; status: 'enrolled' | 'waitlisted' };

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({
      lessonInstanceId,
      studentId,
    }: {
      lessonInstanceId: string;
      studentId: string;
    }): Promise<EnrollStudentResult> => {
      // Look up any existing enrollment row regardless of status (unique constraint
      // is status-agnostic).
      const { data: existing, error: existingError } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('lesson_instance_id', lessonInstanceId)
        .eq('student_id', studentId)
        .maybeSingle();
      if (existingError) throw existingError;

      if (!existing) {
        const { error } = await supabase
          .from('enrollments')
          .insert({
            org_id: orgId!,
            lesson_instance_id: lessonInstanceId,
            student_id: studentId,
            status: 'enrolled',
          });
        if (error) throw error;
        return { action: 'enrolled', lesson_instance_id: lessonInstanceId };
      }

      if (existing.status === 'enrolled' || existing.status === 'waitlisted') {
        return {
          action: 'already_registered',
          lesson_instance_id: lessonInstanceId,
          status: existing.status,
        };
      }

      // dropped or completed → revive
      const { error: updateError } = await supabase
        .from('enrollments')
        .update({ status: 'enrolled', attended: null })
        .eq('id', existing.id);
      if (updateError) throw updateError;
      return { action: 'revived', lesson_instance_id: lessonInstanceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.list(data.lesson_instance_id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useDropStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'dropped' })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.list(data.lesson_instance_id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; attended: boolean }[]) => {
      const promises = updates.map(({ id, attended }) =>
        supabase
          .from('enrollments')
          .update({ attended })
          .eq('id', id)
      );
      const results = await Promise.all(promises);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) throw firstError.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useStudentEnrollments(studentId: string) {
  return useQuery({
    queryKey: enrollmentKeys.student(studentId),
    queryFn: async (): Promise<Enrollment[]> => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

export interface AttendanceRecord {
  id: string;
  date: string;
  lessonName: string;
  attended: boolean | null;
  startTime: string;
}

export interface AttendanceStats {
  total: number;
  attended: number;
  missed: number;
  unmarked: number;
  records: AttendanceRecord[];
}

export function useStudentAttendanceStats(studentId: string) {
  return useQuery({
    queryKey: [...enrollmentKeys.student(studentId), 'attendance'],
    queryFn: async (): Promise<AttendanceStats> => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id, attended, status,
          lesson_instance:lesson_instances!enrollments_lesson_instance_id_fkey(
            date, start_time, name
          )
        `)
        .eq('student_id', studentId)
        .in('status', ['enrolled', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const records: AttendanceRecord[] = (data as any[]).map((e) => ({
        id: e.id,
        date: e.lesson_instance?.date ?? '',
        lessonName: e.lesson_instance?.name ?? 'Lesson',
        attended: e.attended,
        startTime: e.lesson_instance?.start_time ?? '',
      }));

      // Sort by date descending
      records.sort((a, b) => b.date.localeCompare(a.date));

      const total = records.length;
      const attended = records.filter((r) => r.attended === true).length;
      const missed = records.filter((r) => r.attended === false).length;
      const unmarked = records.filter((r) => r.attended === null).length;

      return { total, attended, missed, unmarked, records };
    },
    enabled: !!studentId,
  });
}

/**
 * Checks if a student has an active subscription.
 * Used to determine if group lesson enrollment should be free.
 */
export async function checkStudentSubscription(parentId: string, studentId: string): Promise<boolean> {
  // Check for active subscription: either student-specific or parent-wide (student_id IS NULL)
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', parentId)
    .eq('status', 'active')
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export function useEnrollOrWaitlist() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({ lessonInstanceId, studentId }: { lessonInstanceId: string; studentId: string }) => {
      // Check current enrollment count vs max_students
      const { data: instance, error: instanceError } = await supabase
        .from('lesson_instances')
        .select('id, max_students')
        .eq('id', lessonInstanceId)
        .single();

      if (instanceError) throw instanceError;

      const { count, error: countError } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_instance_id', lessonInstanceId)
        .eq('status', 'enrolled');

      if (countError) throw countError;

      const maxStudents = instance?.max_students;
      const isFull = maxStudents != null && (count ?? 0) >= maxStudents;
      const status = isFull ? 'waitlisted' : 'enrolled';

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          org_id: orgId!,
          lesson_instance_id: lessonInstanceId,
          student_id: studentId,
          status,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, wasWaitlisted: isFull };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.list(data.lesson_instance_id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

/**
 * Enrolls a student with payment recording.
 * Used when a non-subscriber pays for a group lesson.
 */
export function useEnrollWithPayment() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const userId = useAuthStore((s) => s.userProfile?.id);

  return useMutation({
    mutationFn: async ({
      lessonInstanceId,
      studentId,
      paymentId,
    }: {
      lessonInstanceId: string;
      studentId: string;
      paymentId: string;
    }) => {
      // Check capacity
      const { data: instance, error: instanceError } = await supabase
        .from('lesson_instances')
        .select('id, max_students')
        .eq('id', lessonInstanceId)
        .single();

      if (instanceError) throw instanceError;

      const { count, error: countError } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_instance_id', lessonInstanceId)
        .eq('status', 'enrolled');

      if (countError) throw countError;

      const maxStudents = instance?.max_students;
      const isFull = maxStudents != null && (count ?? 0) >= maxStudents;
      const status = isFull ? 'waitlisted' : 'enrolled';

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          org_id: orgId!,
          lesson_instance_id: lessonInstanceId,
          student_id: studentId,
          status,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, wasWaitlisted: isFull };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.list(data.lesson_instance_id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}

export function useBulkEnrollByUTR() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({
      lessonInstanceId,
      skillLevel,
    }: {
      lessonInstanceId: string;
      skillLevel: SkillLevel;
    }) => {
      // 1. Get instance capacity
      const { data: instance, error: instanceError } = await supabase
        .from('lesson_instances')
        .select('id, max_students')
        .eq('id', lessonInstanceId)
        .single();
      if (instanceError) throw instanceError;

      // 2. Get current enrolled count
      const { count: enrolledCount, error: countError } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_instance_id', lessonInstanceId)
        .eq('status', 'enrolled');
      if (countError) throw countError;

      // 3. Get all org students matching skill_level
      const { data: matchingStudents, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('org_id', orgId!)
        .eq('skill_level', skillLevel);
      if (studentsError) throw studentsError;
      if (!matchingStudents?.length) {
        return { enrolledCount: 0, revivedCount: 0, waitlistedCount: 0, skippedCount: 0 };
      }

      // 4. Partition existing rows: active ones get skipped, dropped/completed
      // get revived in place (unique constraint forbids inserting a new row).
      const { data: existingEnrollments, error: existingError } = await supabase
        .from('enrollments')
        .select('id, student_id, status')
        .eq('lesson_instance_id', lessonInstanceId);
      if (existingError) throw existingError;

      const matchingStudentIdSet = new Set(matchingStudents.map((s) => s.id));
      const existingByStudent = new Map<string, { id: string; status: string }>();
      for (const e of existingEnrollments ?? []) {
        existingByStudent.set(e.student_id, { id: e.id, status: e.status });
      }

      const activeIds: string[] = [];
      const revivableIds: { id: string; studentId: string }[] = [];
      const newIds: string[] = [];

      for (const studentId of matchingStudentIdSet) {
        const existing = existingByStudent.get(studentId);
        if (!existing) {
          newIds.push(studentId);
        } else if (existing.status === 'enrolled' || existing.status === 'waitlisted') {
          activeIds.push(studentId);
        } else {
          revivableIds.push({ id: existing.id, studentId });
        }
      }

      const skippedCount = activeIds.length;

      if (revivableIds.length === 0 && newIds.length === 0) {
        return { enrolledCount: 0, revivedCount: 0, waitlistedCount: 0, skippedCount, lessonInstanceId };
      }

      // 5. Capacity: fill from revivable first (already-on-roster history),
      // then new inserts. Overflow becomes waitlisted.
      const maxStudents = instance.max_students;
      const currentEnrolled = enrolledCount ?? 0;
      let spotsLeft =
        maxStudents != null
          ? Math.max(0, maxStudents - currentEnrolled)
          : revivableIds.length + newIds.length;

      const reviveToEnrolled = revivableIds.slice(0, spotsLeft);
      const reviveToWaitlist = revivableIds.slice(reviveToEnrolled.length);
      spotsLeft -= reviveToEnrolled.length;

      const insertEnrolled = newIds.slice(0, spotsLeft);
      const insertWaitlist = newIds.slice(insertEnrolled.length);

      // Revives: per-row updates (different target statuses).
      for (const r of reviveToEnrolled) {
        const { error } = await supabase
          .from('enrollments')
          .update({ status: 'enrolled', attended: null })
          .eq('id', r.id);
        if (error) throw error;
      }
      for (const r of reviveToWaitlist) {
        const { error } = await supabase
          .from('enrollments')
          .update({ status: 'waitlisted', attended: null })
          .eq('id', r.id);
        if (error) throw error;
      }

      const inserts = [
        ...insertEnrolled.map((studentId) => ({
          org_id: orgId!,
          lesson_instance_id: lessonInstanceId,
          student_id: studentId,
          status: 'enrolled' as const,
        })),
        ...insertWaitlist.map((studentId) => ({
          org_id: orgId!,
          lesson_instance_id: lessonInstanceId,
          student_id: studentId,
          status: 'waitlisted' as const,
        })),
      ];

      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('enrollments')
          .insert(inserts);
        if (insertError) throw insertError;
      }

      return {
        enrolledCount: insertEnrolled.length,
        revivedCount: reviveToEnrolled.length,
        waitlistedCount: insertWaitlist.length + reviveToWaitlist.length,
        skippedCount,
        lessonInstanceId,
      };
    },
    onSuccess: (data) => {
      if (data.lessonInstanceId) {
        queryClient.invalidateQueries({ queryKey: enrollmentKeys.list(data.lessonInstanceId) });
      }
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function usePromoteFromWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonInstanceId: string) => {
      // Find oldest waitlisted enrollment
      const { data: waitlisted, error: findError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('lesson_instance_id', lessonInstanceId)
        .eq('status', 'waitlisted')
        .order('created_at', { ascending: true })
        .limit(1);

      if (findError) throw findError;
      if (!waitlisted?.length) return null;

      const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'enrolled' })
        .eq('id', waitlisted[0].id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: enrollmentKeys.list(data.lesson_instance_id) });
        queryClient.invalidateQueries({ queryKey: instanceKeys.all });
      }
    },
  });
}
