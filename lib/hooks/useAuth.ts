import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export function useAuth() {
  const {
    session,
    userProfile,
    isLoading,
    isAuthenticated,
    userRole,
    needsRoleSelection,
    setSession,
    setUserProfile,
    setIsLoading,
    setNeedsRoleSelection,
    reset,
  } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('Error getting session:', err);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPendingInvite = async (email: string) => {
    const { data } = await supabase
      .from('invites')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();
    return data;
  };

  const acceptInvite = async (inviteId: string) => {
    await supabase
      .from('invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', inviteId);
  };

  const extractFirstName = (user: { user_metadata?: Record<string, any> }): string => {
    const meta = user.user_metadata ?? {};
    if (meta.first_name) return meta.first_name;
    if (meta.given_name) return meta.given_name;
    const fullName = meta.full_name || meta.name || '';
    if (fullName) return fullName.split(' ')[0];
    return '';
  };

  const extractLastName = (user: { user_metadata?: Record<string, any> }): string => {
    const meta = user.user_metadata ?? {};
    if (meta.last_name) return meta.last_name;
    if (meta.family_name) return meta.family_name;
    const fullName = meta.full_name || meta.name || '';
    if (fullName) {
      const parts = fullName.split(' ');
      return parts.length > 1 ? parts.slice(1).join(' ') : '';
    }
    return '';
  };

  const createSocialProfile = useCallback(async (role: 'parent' | 'coach') => {
    // Refresh session to ensure valid JWT for RLS
    await supabase.auth.refreshSession();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const isActive = role === 'coach' ? false : true;

    // Insert without .select() to avoid SELECT policy issues
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        auth_id: user.id,
        org_id: DEFAULT_ORG_ID,
        role,
        first_name: extractFirstName(user),
        last_name: extractLastName(user),
        email: user.email!,
        phone: null,
        is_active: isActive,
      });

    if (insertError) throw insertError;

    // Fetch the profile separately
    const { data: newProfile, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    setNeedsRoleSelection(false);
    setUserProfile(newProfile);
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No profile row — auto-create from auth user metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUserProfile(null);
          return;
        }

        // Check for pending invite first
        const invite = await checkPendingInvite(user.email!);

        if (invite) {
          // Invite exists — auto-create with invite role
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: userId,
              org_id: invite.org_id,
              role: invite.role,
              first_name: extractFirstName(user),
              last_name: extractLastName(user),
              email: user.email!,
              phone: user.user_metadata?.phone ?? null,
              is_active: true,
            });
          if (!insertError) {
            await acceptInvite(invite.id);
            const { data: newProfile } = await supabase
              .from('users').select('*').eq('auth_id', userId).single();
            setUserProfile(newProfile);
            return;
          }
          console.error('Error auto-creating user profile:', insertError);
        } else if (user.user_metadata?.role) {
          // Email registration — role set in metadata
          const selfRole = user.user_metadata.role as 'parent' | 'coach';
          const isActive = selfRole === 'coach' ? false : true;

          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: userId,
              org_id: DEFAULT_ORG_ID,
              role: selfRole,
              first_name: extractFirstName(user),
              last_name: extractLastName(user),
              email: user.email!,
              phone: user.user_metadata?.phone ?? null,
              is_active: isActive,
            });
          if (!insertError) {
            const { data: newProfile } = await supabase
              .from('users').select('*').eq('auth_id', userId).single();
            setUserProfile(newProfile);
            return;
          }
          console.error('Error auto-creating user profile:', insertError);
        } else {
          // Social sign-in, no invite, no role metadata — need role selection
          setNeedsRoleSelection(true);
          setUserProfile(null);
          return;
        }

        setUserProfile(null);
        return;
      }

      if (error) {
        console.error('Error fetching user profile:', error);
      }
      setUserProfile(data ?? null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      metadata: { firstName: string; lastName: string; phone?: string; role?: 'parent' | 'coach' }
    ) => {
      setIsLoading(true);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: metadata.firstName,
            last_name: metadata.lastName,
            phone: metadata.phone,
            role: metadata.role ?? 'parent',
          },
        },
      });

      if (authError) {
        setIsLoading(false);
        throw authError;
      }

      if (authData.user && authData.session) {
        // Session exists (email confirmation off) — create profile immediately
        // Check for pending invite
        const invite = await checkPendingInvite(email);
        const selfRole = metadata.role ?? 'parent';
        const role = invite ? invite.role : selfRole;
        const orgId = invite ? invite.org_id : DEFAULT_ORG_ID;
        const isActive = role === 'coach' && !invite ? false : true;

        const { error: profileError } = await supabase.from('users').insert({
          auth_id: authData.user.id,
          org_id: orgId,
          role,
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          email,
          phone: metadata.phone ?? null,
          is_active: isActive,
        });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          setIsLoading(false);
          throw profileError;
        }

        if (invite) await acceptInvite(invite.id);
      }
      // If no session (email confirmation on), fetchUserProfile will
      // auto-create the profile from auth metadata after confirmation.
    },
    []
  );

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') return;

    try {
      setIsLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const error = err as { code?: string };
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        throw err;
      }
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      const redirectUrl = makeRedirectUri({ scheme: 'modern-tennis' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );
        if (result.type === 'success') {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    reset();
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!userProfile?.id) throw new Error('No user profile found');

    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userProfile.id);

    if (error) throw error;

    await supabase.auth.signOut();
    reset();
  }, [userProfile?.id]);

  return {
    session,
    userProfile,
    isLoading,
    isAuthenticated,
    userRole,
    needsRoleSelection,
    signInWithEmail,
    signUpWithEmail,
    signInWithApple,
    signInWithGoogle,
    signOut,
    deleteAccount,
    createSocialProfile,
  };
}
