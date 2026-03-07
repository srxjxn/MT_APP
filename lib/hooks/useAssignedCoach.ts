import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { CoachWithPricing, coachPricingKeys } from './useCoachPricing';
import { CoachPackage } from '../types';

export function useAssignedCoachWithPackages() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const coachId = userProfile?.assigned_coach_id;

  return useQuery({
    queryKey: [...coachPricingKeys.all, 'assigned', coachId ?? ''],
    queryFn: async (): Promise<CoachWithPricing | null> => {
      // Fetch the coach
      const { data: coach, error: coachError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, drop_in_rate_cents')
        .eq('id', coachId!)
        .eq('role', 'coach')
        .eq('is_active', true)
        .single();

      if (coachError) throw coachError;
      if (!coach) return null;

      // Fetch active packages for this coach
      const { data: packages, error: pkgError } = await supabase
        .from('coach_packages')
        .select('*')
        .eq('coach_id', coachId!)
        .eq('is_active', true)
        .order('num_hours');

      if (pkgError) throw pkgError;

      return {
        ...coach,
        packages: (packages ?? []) as CoachPackage[],
      };
    },
    enabled: !!coachId,
  });
}
