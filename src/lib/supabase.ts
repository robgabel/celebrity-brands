import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single supabase instance for the entire application
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-v2',
    },
  },
  // Add proper CORS configuration
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  },
});

let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;
let realtimeChannels: Map<string, RealtimeChannel> = new Map();

// Initialize auth state
export const initializeAuth = async () => {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return null;
    }

    // Set up auth state change listener if not already set
    if (!authSubscription) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          // Clear local storage
          localStorage.removeItem('supabase.auth.token');
          cleanupRealtimeSubscriptions();
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        }
      });

      authSubscription = { data: { subscription } };
    }

    return session;
  } catch (error) {
    console.error('Error initializing auth:', error);
    return null;
  }
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): never => {
  console.error('Supabase error:', error);

  if (error.message === 'Failed to fetch') {
    throw new Error('Network error. Please check your internet connection.');
  }

  if (error.code === 'PGRST301') {
    throw new Error('Database connection failed. Please try again.');
  } else if (error.code === 'PGRST204') {
    throw new Error('Invalid database query.');
  } else if (error.code === 'AUTH_INVALID_TOKEN') {
    supabase.auth.refreshSession();
    throw new Error('Your session has expired. Please try again.');
  }

  throw new Error('An unexpected error occurred. Please try again.');
};

// Cleanup function for realtime subscriptions
export const cleanupRealtimeSubscriptions = () => {
  realtimeChannels.forEach(channel => {
    channel.unsubscribe();
  });
  realtimeChannels.clear();

  if (authSubscription?.data?.subscription?.unsubscribe) {
    authSubscription.data.subscription.unsubscribe();
    authSubscription = null;
  }
};

// Initialize auth on module load
initializeAuth().catch(console.error);