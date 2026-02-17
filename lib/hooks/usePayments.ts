import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Payment, PaymentInsert, PaymentUpdate, UserProfile, Subscription } from '../types';

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (orgId: string) => [...paymentKeys.lists(), orgId] as const,
  userPayments: (userId: string) => [...paymentKeys.all, 'user', userId] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

export type PaymentWithJoins = Payment & {
  user?: Pick<UserProfile, 'first_name' | 'last_name' | 'email'>;
  subscription?: Pick<Subscription, 'name'> | null;
};

interface PaymentFilters {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function usePayments(filters?: PaymentFilters) {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: [...paymentKeys.list(orgId ?? ''), filters],
    queryFn: async (): Promise<PaymentWithJoins[]> => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          user:users!payments_user_id_fkey(first_name, last_name, email),
          subscription:subscriptions!payments_subscription_id_fkey(name)
        `)
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('payment_status', filters.status as any);
      if (filters?.type) query = query.eq('payment_type', filters.type as any);
      if (filters?.dateFrom) query = query.gte('paid_at', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('paid_at', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });
}

export function useUserPayments() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: paymentKeys.userPayments(userProfile?.id ?? ''),
    queryFn: async (): Promise<PaymentWithJoins[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          subscription:subscriptions!payments_subscription_id_fkey(name)
        `)
        .eq('user_id', userProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!userProfile?.id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (payment: Omit<PaymentInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...payment, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PaymentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}
