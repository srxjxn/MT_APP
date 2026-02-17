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
    setSession,
    setUserProfile,
    setIsLoading,
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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
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
      metadata: { firstName: string; lastName: string; phone?: string }
    ) => {
      setIsLoading(true);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setIsLoading(false);
        throw authError;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('users').insert({
          auth_id: authData.user.id,
          org_id: DEFAULT_ORG_ID,
          role: 'parent' as const,
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          email,
          phone: metadata.phone ?? null,
        });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          setIsLoading(false);
          throw profileError;
        }
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
      const redirectUrl = makeRedirectUri({ scheme: 'tennis-crm' });
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

  return {
    session,
    userProfile,
    isLoading,
    isAuthenticated,
    userRole,
    signInWithEmail,
    signUpWithEmail,
    signInWithApple,
    signInWithGoogle,
    signOut,
  };
}
