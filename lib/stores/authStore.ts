import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';

interface AuthStore {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  needsRoleSelection: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setIsLoading: (loading: boolean) => void;
  setNeedsRoleSelection: (v: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
  needsRoleSelection: false,
  userRole: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
    }),
  setUser: (user) => set({ user }),
  setUserProfile: (profile) =>
    set({
      userProfile: profile,
      userRole: profile?.role ?? null,
    }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setNeedsRoleSelection: (needsRoleSelection) => set({ needsRoleSelection }),
  reset: () =>
    set({
      session: null,
      user: null,
      userProfile: null,
      isLoading: false,
      isAuthenticated: false,
      userRole: null,
      needsRoleSelection: false,
    }),
}));
