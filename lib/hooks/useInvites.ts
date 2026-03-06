import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { Invite, UserProfile } from '../types';

export const inviteKeys = {
  all: ['invites'] as const,
  lists: () => [...inviteKeys.all, 'list'] as const,
  list: (orgId: string) => [...inviteKeys.lists(), orgId] as const,
};

export const coachKeys = {
  all: ['coaches'] as const,
  lists: () => [...coachKeys.all, 'list'] as const,
  list: (orgId: string) => [...coachKeys.lists(), orgId] as const,
};

export const pendingUserKeys = {
  all: ['pendingUsers'] as const,
  lists: () => [...pendingUserKeys.all, 'list'] as const,
  list: (orgId: string) => [...pendingUserKeys.lists(), orgId] as const,
};

export function useInvites() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: inviteKeys.list(orgId ?? ''),
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('org_id', orgId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCoaches() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: coachKeys.list(orgId ?? ''),
    queryFn: async (): Promise<Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email' | 'is_active'>[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, is_active')
        .eq('org_id', orgId!)
        .eq('role', 'coach')
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const userProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase
        .from('invites')
        .insert({
          org_id: userProfile!.org_id,
          email: email.toLowerCase(),
          role: 'coach' as const,
          invited_by: userProfile!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, email) => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.lists() });

      // Fire-and-forget: send invite email via edge function
      const inviterName = userProfile
        ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
        : undefined;

      supabase.functions
        .invoke('send-coach-invite', {
          body: { email, inviterName, orgName: 'Modern Tennis' },
        })
        .then(({ error }) => {
          if (error) console.warn('Failed to send invite email:', error.message);
        });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase
        .from('invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.lists() });
    },
  });
}

export function usePendingUsers() {
  const orgId = useAuthStore((s) => s.userProfile?.org_id);

  return useQuery({
    queryKey: pendingUserKeys.list(orgId ?? ''),
    queryFn: async (): Promise<Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email' | 'created_at'>[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at')
        .eq('org_id', orgId!)
        .eq('role', 'coach')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useConfirmUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingUserKeys.lists() });
      queryClient.invalidateQueries({ queryKey: coachKeys.lists() });
    },
  });
}
