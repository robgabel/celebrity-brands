import { createClient } from '@supabase/supabase-js';

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
      'X-Client-Info': 'celebrity-brands-v1',
    },
  },
});

// Enhanced error handling for Supabase operations
export const handleSupabaseError = (error: any, operation: string): never => {
  console.error(`Supabase ${operation} error:`, error);

  // Network errors
  if (error.message === 'Failed to fetch') {
    throw new Error('Network error. Please check your internet connection and try again.');
  }

  // Database connection errors
  if (error.code === 'PGRST301') {
    throw new Error('Database connection failed. Please try again in a moment.');
  }

  // Query errors
  if (error.code === 'PGRST204') {
    throw new Error('Invalid database query. Please contact support if this persists.');
  }

  // Authentication errors
  if (error.code === 'AUTH_INVALID_TOKEN' || error.message?.includes('JWT')) {
    // Try to refresh the session
    supabase.auth.refreshSession().catch(() => {
      // If refresh fails, redirect to login
      window.location.href = '/login';
    });
    throw new Error('Your session has expired. Please sign in again.');
  }

  // RLS policy errors
  if (error.code === '42501' || error.message?.includes('policy')) {
    throw new Error('You do not have permission to perform this action.');
  }

  // Generic error with helpful message
  throw new Error(error.message || `${operation} failed. Please try again.`);
};

// Wrapper function for safe database operations
export const safeSupabaseOperation = async <T>(
  operation: () => Promise<{ data: T; error: any }>,
  operationName: string
): Promise<T> => {
  try {
    const { data, error } = await operation();
    
    if (error) {
      handleSupabaseError(error, operationName);
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    handleSupabaseError(error, operationName);
  }
};

// Initialize auth state management
let authInitialized = false;

export const initializeAuth = async () => {
  if (authInitialized) return;
  
  try {
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    authInitialized = true;
    return session;
  } catch (error) {
    console.error('Error initializing auth:', error);
    return null;
  }
};

// Auto-initialize auth when module loads
initializeAuth().catch(console.error);