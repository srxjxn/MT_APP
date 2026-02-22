import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';

export interface CoachStudentPackage {
  id: string;
  studentName: string;
  hoursPurchased: number;
  hoursUsed: number;
  hoursRemaining: number;
  status: string;
}

export function useCoachStudentPackages() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: ['coach_student_packages', userProfile?.id],
    queryFn: async (): Promise<CoachStudentPackage[]> => {
      // Get coach packages for this coach
      const { data: coachPkgs, error: cpErr } = await supabase
        .from('coach_packages')
        .select('id')
        .eq('coach_id', userProfile!.id);

      if (cpErr) throw cpErr;
      if (!coachPkgs?.length) return [];

      const coachPackageIds = coachPkgs.map((cp) => cp.id);

      // Get student packages linked to these coach packages
      const { data: studentPkgs, error: spErr } = await supabase
        .from('student_packages')
        .select('id, hours_purchased, hours_used, status, student:students!student_packages_student_id_fkey(first_name, last_name)')
        .in('coach_package_id', coachPackageIds)
        .in('status', ['active', 'exhausted']);

      if (spErr) throw spErr;

      return (studentPkgs as any[]).map((sp) => ({
        id: sp.id,
        studentName: `${sp.student?.first_name ?? ''} ${sp.student?.last_name ?? ''}`.trim(),
        hoursPurchased: sp.hours_purchased,
        hoursUsed: sp.hours_used,
        hoursRemaining: sp.hours_purchased - sp.hours_used,
        status: sp.status,
      }));
    },
    enabled: !!userProfile?.id,
  });
}
