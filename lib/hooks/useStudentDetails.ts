import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { DAYS_OF_WEEK } from '../validation/lessonTemplate';

export interface StudentGroupClass {
  id: string;
  name: string;
  day: string;
  startTime: string;
  coachName: string;
}

export interface StudentPrivateCoach {
  coachName: string;
  hoursPurchased: number;
  hoursRemaining: number;
}

export function useStudentGroupClasses(studentId: string) {
  return useQuery({
    queryKey: ['students', 'group_classes', studentId],
    queryFn: async (): Promise<StudentGroupClass[]> => {
      // Get enrollments for this student in scheduled instances that are group type
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          lesson_instance_id,
          lesson_instance:lesson_instances!enrollments_lesson_instance_id_fkey(
            template_id,
            template:lesson_templates!lesson_instances_template_id_fkey(
              id, name, lesson_type, day_of_week, start_time,
              coach:users!lesson_templates_coach_id_fkey(first_name, last_name)
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'enrolled');

      if (error) throw error;

      // Dedupe by template_id
      const seen = new Set<string>();
      const results: StudentGroupClass[] = [];

      for (const enrollment of (enrollments as any[]) ?? []) {
        const template = enrollment.lesson_instance?.template;
        if (!template || template.lesson_type !== 'group') continue;
        if (seen.has(template.id)) continue;
        seen.add(template.id);

        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === template.day_of_week)?.label ?? '';

        results.push({
          id: template.id,
          name: template.name,
          day: dayLabel,
          startTime: template.start_time,
          coachName: template.coach
            ? `${template.coach.first_name} ${template.coach.last_name}`
            : 'No coach',
        });
      }

      return results;
    },
    enabled: !!studentId,
  });
}

export function useStudentPrivateCoach(studentId: string) {
  return useQuery({
    queryKey: ['students', 'private_coach', studentId],
    queryFn: async (): Promise<StudentPrivateCoach | null> => {
      const { data, error } = await supabase
        .from('student_packages')
        .select(`
          hours_purchased, hours_used,
          coach_package:coach_packages!student_packages_coach_package_id_fkey(
            coach:users!coach_packages_coach_id_fkey(first_name, last_name)
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data?.length) return null;

      const pkg = data[0] as any;
      const coach = pkg.coach_package?.coach;

      return {
        coachName: coach ? `${coach.first_name} ${coach.last_name}` : 'Unknown',
        hoursPurchased: pkg.hours_purchased,
        hoursRemaining: pkg.hours_purchased - pkg.hours_used,
      };
    },
    enabled: !!studentId,
  });
}
