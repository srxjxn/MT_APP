import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { StudentPackage, StudentPackageInsert, StudentPackageUpdate, CoachPackage } from '../types';

export const studentPackageKeys = {
  all: ['student_packages'] as const,
  lists: () => [...studentPackageKeys.all, 'list'] as const,
  byStudent: (studentId: string) => [...studentPackageKeys.all, 'student', studentId] as const,
  parentAll: (parentId: string) => [...studentPackageKeys.all, 'parent', parentId] as const,
};

export type StudentPackageWithDetails = StudentPackage & {
  coach_package: CoachPackage & {
    coach: { first_name: string; last_name: string };
  };
};

export function useStudentPackages(studentId: string) {
  return useQuery({
    queryKey: studentPackageKeys.byStudent(studentId),
    queryFn: async (): Promise<StudentPackageWithDetails[]> => {
      const { data, error } = await supabase
        .from('student_packages')
        .select('*, coach_package:coach_packages!student_packages_coach_package_id_fkey(*, coach:users!coach_packages_coach_id_fkey(first_name, last_name))')
        .eq('student_id', studentId)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!studentId,
  });
}

export function useParentAllStudentPackages() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: studentPackageKeys.parentAll(userProfile?.id ?? ''),
    queryFn: async (): Promise<StudentPackageWithDetails[]> => {
      // First get parent's students
      const { data: students, error: studErr } = await supabase
        .from('students')
        .select('id')
        .eq('parent_id', userProfile!.id);

      if (studErr) throw studErr;
      if (!students?.length) return [];

      const studentIds = students.map((s) => s.id);

      const { data, error } = await supabase
        .from('student_packages')
        .select('*, coach_package:coach_packages!student_packages_coach_package_id_fkey(*, coach:users!coach_packages_coach_id_fkey(first_name, last_name))')
        .in('student_id', studentIds)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!userProfile?.id,
  });
}

export function useCreateStudentPackage() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (pkg: Omit<StudentPackageInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('student_packages')
        .insert({ ...pkg, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPackageKeys.all });
    },
  });
}

export function useUpdateStudentPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: StudentPackageUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('student_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPackageKeys.all });
    },
  });
}
