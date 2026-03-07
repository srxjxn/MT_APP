import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { MembershipPlan, MembershipPlanInsert, MembershipPlanUpdate } from '../types';

export const membershipPlanKeys = {
  all: ['membership_plans'] as const,
  lists: () => [...membershipPlanKeys.all, 'list'] as const,
  list: (orgId: string) => [...membershipPlanKeys.lists(), orgId] as const,
  active: (orgId: string) => [...membershipPlanKeys.all, 'active', orgId] as const,
  detail: (id: string) => [...membershipPlanKeys.all, 'detail', id] as const,
};

/** Fetch active plans for the org (parent-facing) */
export function useMembershipPlans() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: membershipPlanKeys.active(orgId ?? ''),
    queryFn: async (): Promise<MembershipPlan[]> => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('org_id', orgId!)
        .eq('is_active', true)
        .order('price_cents', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

/** Fetch all plans including inactive (admin-facing) */
export function useAllMembershipPlans() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: membershipPlanKeys.list(orgId ?? ''),
    queryFn: async (): Promise<MembershipPlan[]> => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

/** Admin creates a plan */
export function useCreateMembershipPlan() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (plan: Omit<MembershipPlanInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('membership_plans')
        .insert({ ...plan, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipPlanKeys.all });
    },
  });
}

/** Admin edits a plan */
export function useUpdateMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MembershipPlanUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('membership_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipPlanKeys.all });
    },
  });
}

/** Admin deletes a plan */
export function useDeleteMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipPlanKeys.all });
    },
  });
}
