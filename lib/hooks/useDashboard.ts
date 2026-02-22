import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';

interface DashboardStats {
  totalStudents: number;
  revenueThisMonth: number;
  groupClassesThisMonth: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
}

export interface DashboardCoach {
  id: string;
  first_name: string;
  last_name: string;
}

export function useDashboardStats() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: ['dashboard', 'stats', orgId],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date().toISOString().split('T')[0];
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const [studentsRes, revenueRes, subsRes, expiringRes, groupClassesRes] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .eq('is_active', true),
        supabase
          .from('payments')
          .select('amount_cents')
          .eq('org_id', orgId!)
          .eq('payment_status', 'completed')
          .gte('paid_at', monthStartStr)
          .lte('paid_at', today),
        supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .eq('status', 'active'),
        supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .eq('status', 'active')
          .gte('ends_at', today)
          .lte('ends_at', weekEndStr),
        supabase
          .from('lesson_instances')
          .select('id, template:lesson_templates!lesson_instances_template_id_fkey(lesson_type)')
          .eq('org_id', orgId!)
          .eq('status', 'completed')
          .gte('date', monthStartStr)
          .lte('date', today),
      ]);

      const totalRevenue = (revenueRes.data ?? []).reduce(
        (sum: number, p: { amount_cents: number }) => sum + p.amount_cents,
        0
      );

      const groupClasses = (groupClassesRes.data ?? []).filter(
        (item: any) => item.template?.lesson_type === 'group'
      ).length;

      return {
        totalStudents: studentsRes.count ?? 0,
        revenueThisMonth: totalRevenue,
        groupClassesThisMonth: groupClasses,
        activeSubscriptions: subsRes.count ?? 0,
        expiringSubscriptions: expiringRes.count ?? 0,
      };
    },
    enabled: !!orgId,
  });
}

export function useDashboardCoaches() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: ['dashboard', 'coaches', orgId],
    queryFn: async (): Promise<DashboardCoach[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('org_id', orgId!)
        .eq('role', 'coach')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
