import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { UserProfile } from '../types';

const privateLessonStatsKeys = {
  stats: (studentId: string) => ['private_lesson_stats', studentId] as const,
  primaryCoach: (studentId: string) => ['primary_coach', studentId] as const,
};

export function useStudentPrivateLessonStats(studentId: string) {
  return useQuery({
    queryKey: privateLessonStatsKeys.stats(studentId),
    queryFn: async (): Promise<{ upcoming: number; completed: number }> => {
      const today = new Date().toISOString().split('T')[0];

      // Get enrollments joined to lesson_instances + templates where lesson_type is private/semi_private
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('id, attended, lesson_instance:lesson_instances!enrollments_lesson_instance_id_fkey(id, date, status, template_id, template:lesson_templates!lesson_instances_template_id_fkey(lesson_type))')
        .eq('student_id', studentId);

      if (error) throw error;

      let upcoming = 0;
      let completed = 0;

      (enrollments ?? []).forEach((e: any) => {
        const instance = e.lesson_instance;
        if (!instance?.template) return;
        const lessonType = instance.template.lesson_type;
        if (lessonType !== 'private' && lessonType !== 'semi_private') return;

        if (instance.status === 'scheduled' && instance.date >= today) {
          upcoming++;
        }
        if (e.attended === true || instance.status === 'completed') {
          completed++;
        }
      });

      return { upcoming, completed };
    },
    enabled: !!studentId,
  });
}

export function useStudentPrimaryCoach(studentId: string) {
  return useQuery({
    queryKey: privateLessonStatsKeys.primaryCoach(studentId),
    queryFn: async (): Promise<Pick<UserProfile, 'id' | 'first_name' | 'last_name'> | null> => {
      // Get all enrollments for private/semi_private lessons, group by coach
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('lesson_instance:lesson_instances!enrollments_lesson_instance_id_fkey(coach_id, template:lesson_templates!lesson_instances_template_id_fkey(lesson_type))')
        .eq('student_id', studentId);

      if (error) throw error;

      // Count by coach_id for private/semi_private lessons
      const coachCounts = new Map<string, number>();
      (enrollments ?? []).forEach((e: any) => {
        const instance = e.lesson_instance;
        if (!instance?.template) return;
        const lessonType = instance.template.lesson_type;
        if (lessonType !== 'private' && lessonType !== 'semi_private') return;

        const count = coachCounts.get(instance.coach_id) ?? 0;
        coachCounts.set(instance.coach_id, count + 1);
      });

      if (coachCounts.size === 0) return null;

      // Find coach with max count
      let maxCoachId = '';
      let maxCount = 0;
      coachCounts.forEach((count, coachId) => {
        if (count > maxCount) {
          maxCount = count;
          maxCoachId = coachId;
        }
      });

      // Fetch coach name
      const { data: coach, error: coachErr } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', maxCoachId)
        .single();

      if (coachErr) throw coachErr;
      return coach;
    },
    enabled: !!studentId,
  });
}
