import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Subscription, SubscriptionInsert, SubscriptionUpdate, UserProfile, SubscriptionStatus } from '../types';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (orgId: string) => [...subscriptionKeys.lists(), orgId] as const,
  userSubs: (userId: string) => [...subscriptionKeys.all, 'user', userId] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
};

export type SubscriptionWithUser = Subscription & {
  user?: Pick<UserProfile, 'first_name' | 'last_name' | 'email'>;
  student?: { first_name: string; last_name: string } | null;
};

export function useSubscriptions() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: subscriptionKeys.list(orgId ?? ''),
    queryFn: async (): Promise<SubscriptionWithUser[]> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, user:users!subscriptions_user_id_fkey(first_name, last_name, email), student:students!subscriptions_student_id_fkey(first_name, last_name)')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });
}

export function useUserSubscriptions() {
  const userProfile = useAuthStore((s) => s.userProfile);

  return useQuery({
    queryKey: subscriptionKeys.userSubs(userProfile?.id ?? ''),
    queryFn: async (): Promise<Subscription[]> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userProfile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.id,
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: async (): Promise<SubscriptionWithUser> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, user:users!subscriptions_user_id_fkey(first_name, last_name, email), student:students!subscriptions_student_id_fkey(first_name, last_name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useMutation({
    mutationFn: async (sub: Omit<SubscriptionInsert, 'org_id'>) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({ ...sub, org_id: orgId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      queryClient.setQueryData(subscriptionKeys.detail(data.id), data);
    },
  });
}

export function useUpdateSubscriptionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubscriptionStatus }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(data.id) });
    },
  });
}

export function useExpiringSubscriptions() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: [...subscriptionKeys.all, 'expiring', orgId ?? ''],
    queryFn: async (): Promise<SubscriptionWithUser[]> => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      const sevenDaysStr = sevenDays.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, user:users!subscriptions_user_id_fkey(first_name, last_name, email), student:students!subscriptions_student_id_fkey(first_name, last_name)')
        .eq('org_id', orgId!)
        .eq('status', 'active')
        .gte('ends_at', today)
        .lte('ends_at', sevenDaysStr)
        .order('ends_at', { ascending: true });

      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}
