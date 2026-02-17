import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { UserProfile, CoachPackage, CoachPackageInsert, CoachPackageUpdate } from '../types';

export const coachPricingKeys = {
  all: ['coach_pricing'] as const,
  directory: (orgId: string) => [...coachPricingKeys.all, 'directory', orgId] as const,
};

export type CoachWithPricing = Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'> & {
  drop_in_rate_cents: number | null;
  packages: CoachPackage[];
};

export function useCoachDirectory() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: coachPricingKeys.directory(orgId ?? ''),
    queryFn: async (): Promise<CoachWithPricing[]> => {
      // Fetch coaches
      const { data: coaches, error: coachError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, drop_in_rate_cents')
        .eq('org_id', orgId!)
        .eq('role', 'coach')
        .eq('is_active', true)
        .order('first_name');

      if (coachError) throw coachError;

      // Fetch all active packages for this org
      const { data: packages, error: pkgError } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('org_id', orgId!)
        .eq('is_active', true)
        .order('num_hours');

      if (pkgError) throw pkgError;

      // Group packages by coach
      const pkgByCoach = new Map<string, CoachPackage[]>();
      (packages ?? []).forEach((pkg) => {
        const existing = pkgByCoach.get(pkg.coach_id) ?? [];
        existing.push(pkg);
        pkgByCoach.set(pkg.coach_id, existing);
      });

      return (coaches ?? []).map((c) => ({
        ...c,
        packages: pkgByCoach.get(c.id) ?? [],
      }));
    },
    enabled: !!orgId,
  });
}

export function useUpdateCoachDropInRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ coachId, dropInRateCents }: { coachId: string; dropInRateCents: number | null }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ drop_in_rate_cents: dropInRateCents })
        .eq('id', coachId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.all });
    },
  });
}

export function useCreateCoachPackage() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (pkg: Omit<CoachPackageInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('coach_packages')
        .insert({ ...pkg, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.all });
    },
  });
}

export function useUpdateCoachPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CoachPackageUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('coach_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.all });
    },
  });
}

export function useDeleteCoachPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coach_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.all });
    },
  });
}
