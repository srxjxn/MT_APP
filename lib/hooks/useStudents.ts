import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Student, StudentInsert, StudentUpdate, UserProfile } from '../types';

export const studentKeys = {
  all: ['students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: (orgId: string) => [...studentKeys.lists(), orgId] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
  parentStudents: (parentId: string) => [...studentKeys.all, 'parent', parentId] as const,
};

export const userKeys = {
  parents: (orgId: string) => ['users', 'parents', orgId] as const,
  coaches: (orgId: string) => ['users', 'coaches', orgId] as const,
};

export function useStudents() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: studentKeys.list(orgId ?? ''),
    queryFn: async (): Promise<(Student & { parent?: Pick<UserProfile, 'first_name' | 'last_name' | 'email'> })[]> => {
      const { data, error } = await supabase
        .from('students')
        .select('*, parent:users!students_parent_id_fkey(first_name, last_name, email)')
        .eq('org_id', orgId!)
        .order('first_name');

      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });
}

export function useParentStudents() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: studentKeys.parentStudents(userProfile?.id ?? ''),
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('parent_id', userProfile!.id)
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.id,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: async (): Promise<Student & { parent?: Pick<UserProfile, 'first_name' | 'last_name' | 'email'> }> => {
      const { data, error } = await supabase
        .from('students')
        .select('*, parent:users!students_parent_id_fkey(first_name, last_name, email)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (student: Omit<StudentInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('students')
        .insert({ ...student, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: StudentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.setQueryData(studentKeys.detail(data.id), data);
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}

export function useParentUsers() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: userKeys.parents(orgId ?? ''),
    queryFn: async (): Promise<Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'>[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('org_id', orgId!)
        .eq('role', 'parent')
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCoachUsers() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: userKeys.coaches(orgId ?? ''),
    queryFn: async (): Promise<Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'>[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('org_id', orgId!)
        .eq('role', 'coach')
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
