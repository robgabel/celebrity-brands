import { create } from 'zustand';
import { supabase, handleSupabaseError, safeSupabaseOperation } from '../lib/supabase';
import type { AuthState, UserProfile } from '../types/user';

interface AuthStore extends AuthState {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  isAdmin: false,
  profile: null,

  initialize: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch user profile with error handling
        const profile = await safeSupabaseOperation(
          () => supabase
            .from('user_profiles')
            .select('*')
            .eq('auth_id', user.id)
            .single(),
          'fetch user profile'
        );

        set({
          isAuthenticated: true,
          isAdmin: profile?.is_admin || false,
          profile: profile || null
        });

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            try {
              const updatedProfile = await safeSupabaseOperation(
                () => supabase
                  .from('user_profiles')
                  .select('*')
                  .eq('auth_id', session.user.id)
                  .single(),
                'fetch updated user profile'
              );

              set({
                isAuthenticated: true,
                isAdmin: updatedProfile?.is_admin || false,
                profile: updatedProfile || null
              });
            } catch (error) {
              console.error('Error fetching profile on auth change:', error);
              // Don't throw here, just log the error
            }
          } else if (event === 'SIGNED_OUT') {
            set({ isAuthenticated: false, isAdmin: false, profile: null });
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('Session token refreshed successfully');
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        set({ isAuthenticated: false, isAdmin: false, profile: null });
      }
    } catch (error) {
      console.error('Error initializing auth store:', error);
      set({ isAuthenticated: false, isAdmin: false, profile: null });
    }
  },

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        handleSupabaseError(error, 'login');
      }

      if (data.user) {
        const profile = await safeSupabaseOperation(
          () => supabase
            .from('user_profiles')
            .select('*')
            .eq('auth_id', data.user.id)
            .single(),
          'fetch user profile after login'
        );

        set({
          isAuthenticated: true,
          isAdmin: profile?.is_admin || false,
          profile: profile || null
        });
      }
    } catch (error) {
      // Re-throw to let the component handle the error display
      throw error;
    }
  },

  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        handleSupabaseError(error, 'logout');
      }
      
      // Clear local storage
      localStorage.removeItem('supabase.auth.token');
      
      set({ isAuthenticated: false, isAdmin: false, profile: null });
    } catch (error) {
      // Even if logout fails, clear local state
      set({ isAuthenticated: false, isAdmin: false, profile: null });
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        handleSupabaseError(error, 'password reset');
      }
    } catch (error) {
      throw error;
    }
  },

  updatePassword: async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        handleSupabaseError(error, 'password update');
      }
    } catch (error) {
      throw error;
    }
  },
  updateProfile: async (updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const profile = await safeSupabaseOperation(
        () => supabase
          .from('user_profiles')
          .update(updates)
          .eq('auth_id', user.id)
          .select()
          .single(),
        'update user profile'
      );

      set((state) => ({
        ...state,
        profile: { ...state.profile, ...profile }
      }));
    } catch (error) {
      throw error;
    }
  },

  refreshProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profile = await safeSupabaseOperation(
        () => supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_id', user.id)
          .single(),
        'refresh user profile'
      );

      set((state) => ({
        ...state,
        profile: profile
      }));
    } catch (error) {
      console.error('Error refreshing profile:', error);
      // Don't throw here, just log the error
    }
  }
}));