import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AuthState, UserProfile } from '../types/user';

interface AuthStore extends AuthState {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  isAdmin: false,
  profile: null,

  initialize: async () => {    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_id', user.id)
          .single();

        set({
          isAuthenticated: true,
          isAdmin: profile?.is_admin || false,
          profile: profile || null
        });

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const { data: updatedProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('auth_id', session.user.id)
              .single();

            set({
              isAuthenticated: true,
              isAdmin: updatedProfile?.is_admin || false,
              profile: updatedProfile || null
            });
          } else if (event === 'SIGNED_OUT') {
            set({ isAuthenticated: false, isAdmin: false, profile: null });
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      }
    } catch (error) {
      console.error('Error initializing auth store:', error);
      set({ isAuthenticated: false, isAdmin: false, profile: null });
    }
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_id', data.user.id)
        .single();

      set({
        isAuthenticated: true,
        isAdmin: profile?.is_admin || false,
        profile: profile || null
      });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ isAuthenticated: false, isAdmin: false, profile: null });
  },

  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      ...state,
      profile: { ...state.profile, ...profile }
    }));
  }
}));