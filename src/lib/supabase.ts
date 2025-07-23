import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging to verify environment variables are loaded correctly
console.log('Supabase Environment Variables:', { 
  supabaseUrl, 
  supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
});

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
    throw new Error('Unable to connect to the database. Please check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.');
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

// Connection retry utility
export const retrySupabaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on authentication errors or permission errors
      if (lastError.message.includes('session has expired') || 
          lastError.message.includes('permission')) {
        throw lastError;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
};

// Initialize auth state management
let authInitialized = false;

export const initializeAuth = async () => {
  if (authInitialized) return;
  
  try {
    // Add connection test before attempting to get session
    console.log('Testing Supabase connection...');
    
    // Get the current session with retry logic
    const session = await retrySupabaseOperation(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error.message || error);
        
        // Provide more specific error handling for connection issues
        if (error.message === 'Failed to fetch') {
          console.error('Network connection failed. Please check:');
          console.error('1. Internet connection');
          console.error('2. Supabase project status');
          console.error('3. Environment variables are correct');
          console.error('4. No firewall/VPN blocking the connection');
        }
        
        throw new Error(error.message || 'Failed to get session');
      }
      
      return session;
    }, 2, 2000);

    console.log('Supabase connection successful');
    authInitialized = true;
    return session;
  } catch (error) {
    console.error('Error initializing auth:', error instanceof Error ? error.message : error);
    
    // Additional debugging for network errors
    if (error instanceof Error && error.message === 'Failed to fetch') {
      console.error('Connection test failed. Supabase URL:', supabaseUrl);
      console.error('Please verify your Supabase project is active and accessible');
    }
    
    return null;
  }
};

// Auto-initialize auth when module loads
initializeAuth().catch(console.error);