import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Enrollment, EnrollmentInsert, Student } from '../types';
import { instanceKeys } from './useLessonInstances';

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

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({ lessonInstanceId, studentId }: { lessonInstanceId: string; studentId: string }) => {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          org_id: orgId!,
          lesson_instance_id: lessonInstanceId,
          student_id: studentId,
          status: 'enrolled',
        })
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
            date, start_time,
            template:lesson_templates!lesson_instances_template_id_fkey(name)
          )
        `)
        .eq('student_id', studentId)
        .in('status', ['enrolled', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const records: AttendanceRecord[] = (data as any[]).map((e) => ({
        id: e.id,
        date: e.lesson_instance?.date ?? '',
        lessonName: e.lesson_instance?.template?.name ?? 'Lesson',
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

export function useEnrollOrWaitlist() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async ({ lessonInstanceId, studentId }: { lessonInstanceId: string; studentId: string }) => {
      // Check current enrollment count vs max_students
      const { data: instance, error: instanceError } = await supabase
        .from('lesson_instances')
        .select(`
          id,
          template:lesson_templates!lesson_instances_template_id_fkey(max_students)
        `)
        .eq('id', lessonInstanceId)
        .single();

      if (instanceError) throw instanceError;

      const { count, error: countError } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_instance_id', lessonInstanceId)
        .eq('status', 'enrolled');

      if (countError) throw countError;

      const maxStudents = (instance as any)?.template?.max_students;
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
