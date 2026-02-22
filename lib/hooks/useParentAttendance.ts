import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';

export interface ChildGroupAttendance {
  studentId: string;
  studentName: string;
  groupClassesAttended: number;
}

export function useParentMonthlyGroupAttendance() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: ['parent_monthly_attendance', userProfile?.id],
    queryFn: async (): Promise<ChildGroupAttendance[]> => {
      // Get parent's students
      const { data: students, error: studErr } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('parent_id', userProfile!.id);

      if (studErr) throw studErr;
      if (!students?.length) return [];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      const results: ChildGroupAttendance[] = [];

      for (const student of students) {
        // Get enrollments where attended = true, instance in current month, template is group
        const { data: enrollments, error: enrollErr } = await supabase
          .from('enrollments')
          .select(`
            id,
            lesson_instance:lesson_instances!enrollments_lesson_instance_id_fkey(
              date,
              status,
              template:lesson_templates!lesson_instances_template_id_fkey(lesson_type)
            )
          `)
          .eq('student_id', student.id)
          .eq('attended', true);

        if (enrollErr) throw enrollErr;

        const groupCount = (enrollments as any[] ?? []).filter((e) => {
          const inst = e.lesson_instance;
          if (!inst) return false;
          const isGroup = inst.template?.lesson_type === 'group';
          const inMonth = inst.date >= monthStartStr && inst.date <= todayStr;
          return isGroup && inMonth;
        }).length;

        results.push({
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          groupClassesAttended: groupCount,
        });
      }

      return results;
    },
    enabled: !!userProfile?.id,
  });
}
