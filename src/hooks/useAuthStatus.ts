import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseAuthStatusReturn {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId: string | null;
}

export function useAuthStatus(): UseAuthStatusReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserId(user?.id || null);

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('auth_id', user.id)
          .single();
        
        setIsAdmin(!!profile?.is_admin);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserId(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    isAdmin,
    userId
  };
}