import { create } from 'zustand';
import { supabase, handleSupabaseError, safeSupabaseOperation } from '../lib/supabase';
import type { AuthState, UserProfile } from '../types/user';

// Email branding for authentication emails
const EMAIL_BRANDING = `

---
Celebrity Brands by Rob Gabel
https://celebritybrands.netlify.app/

For bugs, questions and suggestions please email me at rob@gabel.ai
`;

interface AuthStore extends AuthState {
  initialize: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string; company?: string }) => Promise<void>;
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

  login: async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: rememberMe
        }
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
        data: {
          email_branding: EMAIL_BRANDING
        }
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
  },

  signUp: async (email: string, password: string, metadata?: { firstName?: string; lastName?: string; company?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            first_name: metadata?.firstName || '',
            last_name: metadata?.lastName || '',
            company: metadata?.company || '',
            email_branding: EMAIL_BRANDING
          }
        }
      });

      if (error) {
        handleSupabaseError(error, 'sign up');
      }

      if (data.user) {
        // Check if user profile already exists and handle potential conflicts
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_id', data.user.id)
          .maybeSingle();

        if (profileCheckError) {
          console.error('Error checking existing profile:', profileCheckError);
          // Continue anyway, the insert will handle conflicts
        }

        // Only create profile if it doesn't exist
        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              auth_id: data.user.id,
              email: data.user.email,
              first_name: metadata?.firstName || null,
              last_name: metadata?.lastName || null,
              company: metadata?.company || null,
              is_admin: false
            }, {
              onConflict: 'auth_id',
              ignoreDuplicates: false
            });

          if (profileError) {
            console.error('Error creating/updating user profile:', profileError);
            // Only throw if it's not a duplicate key error
            if (!profileError.message.includes('duplicate key') && !profileError.code === '23505') {
              throw new Error('Failed to create user profile: ' + profileError.message);
            }
          }
        }

        // If user is confirmed immediately, set auth state
        if (data.user.email_confirmed_at) {
          const profile = await safeSupabaseOperation(
            () => supabase
              .from('user_profiles')
              .select('*')
              .eq('auth_id', data.user.id)
              .maybeSingle(),
            'fetch user profile after signup'
          );

          set({
            isAuthenticated: true,
            isAdmin: profile?.is_admin || false,
            profile: profile || null
          });
        } else {
          // User needs to verify email, don't set as authenticated
          set({ isAuthenticated: false, isAdmin: false, profile: null });
        }
      }
    } catch (error) {
      throw error;
    }
  }
}));