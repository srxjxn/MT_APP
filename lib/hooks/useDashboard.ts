import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';

interface DashboardStats {
  totalStudents: number;
  upcomingLessons: number;
  completedLessons: number;
  activeCourts: number;
  revenueThisMonth: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
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

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const [studentsRes, upcomingRes, completedRes, courtsRes, revenueRes, subsRes, expiringRes] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .eq('is_active', true),
        supabase
          .from('lesson_instances')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .eq('status', 'scheduled')
          .gte('date', today)
          .lte('date', weekEndStr),
        supabase
          .from('lesson_instances')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .eq('status', 'completed')
          .gte('date', weekStartStr)
          .lte('date', today),
        supabase
          .from('courts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .eq('status', 'active'),
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
      ]);

      const totalRevenue = (revenueRes.data ?? []).reduce(
        (sum: number, p: { amount_cents: number }) => sum + p.amount_cents,
        0
      );

      return {
        totalStudents: studentsRes.count ?? 0,
        upcomingLessons: upcomingRes.count ?? 0,
        completedLessons: completedRes.count ?? 0,
        activeCourts: courtsRes.count ?? 0,
        revenueThisMonth: totalRevenue,
        activeSubscriptions: subsRes.count ?? 0,
        expiringSubscriptions: expiringRes.count ?? 0,
      };
    },
    enabled: !!orgId,
  });
}
