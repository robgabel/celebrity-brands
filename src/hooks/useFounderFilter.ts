import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { SearchParams, searchParamsSchema, buildFilterQuery } from '../lib/filters';
import { Brand } from '../lib/schema';
import { supabase } from '../lib/supabase';

export function useFounderFilter(initialParams: Partial<SearchParams> = {}) {
  const [params, setParams] = useState<SearchParams>(() => {
    const validated = searchParamsSchema.safeParse({
      ...searchParamsSchema.parse({}),
      ...initialParams
    });
    return validated.success ? validated.data : searchParamsSchema.parse({});
  });

  const [results, setResults] = useState<Brand[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const debouncedSearch = useDebounce(params.search, 300);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('auth_id', user.id)
            .single();
          
          setIsAdmin(!!profile?.is_admin);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('brands')
        .select('*', { count: 'exact' });

      // Non-admin users can only see approved brands
      query = query.eq('approval_status', isAdmin ? 'pending' : 'approved');

      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,creators.ilike.%${params.search}%`);
      }

      if (params.category) {
        query = query.eq('founder_category', params.category);
      }

      if (params.platform) {
        query = query.eq('primary_platform', params.platform);
      }

      if (params.reach) {
        query = query.eq('influencer_reach', params.reach);
      }

      if (params.yearStart) {
        query = query.gte('year_founded', params.yearStart);
      }

      if (params.yearEnd) {
        query = query.lte('year_founded', params.yearEnd);
      }

      query = query.order(params.sortBy, {
        ascending: params.sortOrder === 'asc'
      });

      const { data, error, count } = await query
        .range((params.page - 1) * params.limit, params.page * params.limit - 1);

      if (error) throw error;

      setResults(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [params, debouncedSearch, isAdmin]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const updateParams = useCallback((newParams: Partial<SearchParams>) => {
    setParams(prev => {
      const validated = searchParamsSchema.safeParse({
        ...prev,
        ...newParams
      });
      return validated.success ? validated.data : prev;
    });
  }, []);

  const totalPages = Math.ceil(totalCount / params.limit);

  return {
    results,
    totalCount,
    isLoading,
    error,
    params,
    updateParams,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPrevPage: params.page > 1,
    isAdmin
  };
}