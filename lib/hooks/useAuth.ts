import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { queryClient } from '../queryClient';

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
    needsOnboarding,
    setSession,
    setUserProfile,
    setIsLoading,
    setNeedsRoleSelection,
    setNeedsOnboarding,
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
      const previousUserId = useAuthStore.getState().session?.user?.id;
      setSession(session);
      if (session) {
        if (previousUserId && previousUserId !== session.user.id) {
          queryClient.clear();
        }
        fetchUserProfile(session.user.id);
      } else {
        queryClient.clear();
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

  const checkParentNeedsOnboarding = async (profileId: string) => {
    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('parent_id', profileId)
      .limit(1);
    if (!data || data.length === 0) {
      setNeedsOnboarding(true);
    }
  };

  const createSocialProfile = useCallback(async (role: 'parent' | 'coach') => {
    useAuthStore.getState().setIsCreatingProfile(true);
    try {
      // Refresh session to ensure valid JWT for RLS
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh failed, continuing with current session:', refreshError.message);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const isActive = role === 'coach' ? false : true;

      // Use SECURITY DEFINER RPC to bypass RLS — PostgREST translates .insert()
      // into an UPSERT which requires UPDATE RLS policies that new users can't pass
      const { data: newProfile, error } = await supabase
        .rpc('create_user_profile', {
          p_auth_id: user.id,
          p_org_id: DEFAULT_ORG_ID,
          p_role: role,
          p_first_name: extractFirstName(user),
          p_last_name: extractLastName(user),
          p_email: user.email!,
          p_is_active: isActive,
        })
        .maybeSingle();

      if (error) throw error;
      if (!newProfile) throw new Error('Failed to create profile');

      setNeedsRoleSelection(false);
      setUserProfile(newProfile);

      if (role === 'parent') {
        setNeedsOnboarding(true);
      }
    } finally {
      useAuthStore.getState().setIsCreatingProfile(false);
    }
  }, []);

  let fetchInFlight = false;

  const fetchUserProfile = async (userId: string) => {
    if (fetchInFlight) return;
    fetchInFlight = true;
    try {
      // Skip if createSocialProfile is in progress (prevents race condition
      // where this overwrites state with null before the insert completes)
      if (useAuthStore.getState().isCreatingProfile) return;

      // Skip if profile already loaded (prevents race with createSocialProfile)
      const currentProfile = useAuthStore.getState().userProfile;
      if (currentProfile?.auth_id === userId) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .maybeSingle();

      if (!data && !error) {
        // No profile row — auto-create from auth user metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUserProfile(null);
          return;
        }

        // Check for pending invite first
        const invite = await checkPendingInvite(user.email!);

        if (invite) {
          // Invite exists — auto-create with invite role via RPC (bypasses RLS)
          const { data: newProfile, error: insertError } = await supabase
            .rpc('create_user_profile', {
              p_auth_id: userId,
              p_org_id: invite.org_id,
              p_role: invite.role,
              p_first_name: extractFirstName(user),
              p_last_name: extractLastName(user),
              p_email: user.email!,
              p_is_active: true,
            })
            .maybeSingle();
          if (!insertError && newProfile) {
            await acceptInvite(invite.id);
            if (newProfile.role === 'parent') {
              const { data: students } = await supabase
                .from('students')
                .select('id')
                .eq('parent_id', newProfile.id)
                .limit(1);
              if (!students || students.length === 0) {
                setNeedsOnboarding(true);
              }
            }
            setUserProfile(newProfile);
            return;
          }
          console.error('Error auto-creating user profile:', insertError);
        } else if (user.user_metadata?.role) {
          // Email registration — role set in metadata, use RPC (bypasses RLS)
          const selfRole = user.user_metadata.role as 'parent' | 'coach';
          const isActive = selfRole === 'coach' ? false : true;

          const { data: newProfile, error: insertError } = await supabase
            .rpc('create_user_profile', {
              p_auth_id: userId,
              p_org_id: DEFAULT_ORG_ID,
              p_role: selfRole,
              p_first_name: extractFirstName(user),
              p_last_name: extractLastName(user),
              p_email: user.email!,
              p_is_active: isActive,
            })
            .maybeSingle();
          if (!insertError && newProfile) {
            setUserProfile(newProfile);
            if (newProfile.role === 'parent') {
              setNeedsOnboarding(true);
            }
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
      if (data?.role === 'parent') {
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('parent_id', data.id)
          .limit(1);
        if (!students || students.length === 0) {
          setNeedsOnboarding(true);
        }
      }
      setUserProfile(data ?? null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      fetchInFlight = false;
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
      useAuthStore.getState().setIsCreatingProfile(true);
      try {
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
          throw authError;
        }

        if (authData.user && authData.session) {
          // Session exists (email confirmation off) — create profile immediately
          // isCreatingProfile already set above (before signUp) to prevent race

          // Check for pending invite
          const invite = await checkPendingInvite(email);
          const selfRole = metadata.role ?? 'parent';
          const role = invite ? invite.role : selfRole;
          const orgId = invite ? invite.org_id : DEFAULT_ORG_ID;
          const isActive = role === 'coach' && !invite ? false : true;

          // Use RPC to bypass RLS (raw .insert() triggers UPSERT which needs UPDATE policies)
          const { data: newProfile, error: profileError } = await supabase
            .rpc('create_user_profile', {
              p_auth_id: authData.user.id,
              p_org_id: orgId,
              p_role: role,
              p_first_name: metadata.firstName,
              p_last_name: metadata.lastName,
              p_email: email,
              p_is_active: isActive,
            })
            .maybeSingle();

          if (profileError) {
            console.error('Error creating user profile:', profileError);
            throw profileError;
          }

          if (invite) await acceptInvite(invite.id);

          if (newProfile) setUserProfile(newProfile);

          if (role === 'parent') {
            setNeedsOnboarding(true);
          }

          setIsLoading(false);
          return { hasSession: true };
        }
        // If no session (email confirmation on), fetchUserProfile will
        // auto-create the profile from auth metadata after confirmation.
        return { hasSession: false };
      } finally {
        useAuthStore.getState().setIsCreatingProfile(false);
      }
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

        // Apple only provides the name on the very first sign-in
        if (credential.fullName?.givenName || credential.fullName?.familyName) {
          await supabase.auth.updateUser({
            data: {
              first_name: credential.fullName.givenName ?? '',
              last_name: credential.fullName.familyName ?? '',
            },
          });
        }
      }
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        throw err;
      }
    } finally {
      setIsLoading(false);
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
    queryClient.clear();
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
    queryClient.clear();
    reset();
  }, [userProfile?.id]);

  return {
    session,
    userProfile,
    isLoading,
    isAuthenticated,
    userRole,
    needsRoleSelection,
    needsOnboarding,
    setNeedsOnboarding,
    signInWithEmail,
    signUpWithEmail,
    signInWithApple,
    signInWithGoogle,
    signOut,
    deleteAccount,
    createSocialProfile,
  };
}
