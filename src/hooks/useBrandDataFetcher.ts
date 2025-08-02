import { useState, useEffect, useCallback } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Brand } from '../types/brand';

interface UseBrandDataFetcherProps {
  debouncedSearchQuery: string;
  categoryFilter: string;
  founderFilter: string;
  typeFilter: string;
  sortBy: string;
  showFavoritesOnly: boolean;
  favoriteIds: number[];
  currentPage: number;
  itemsPerPage: number;
  isAdmin: boolean;
  setCurrentPage: (page: number) => void;
}

interface UseBrandDataFetcherReturn {
  brands: Brand[];
  totalItems: number;
  loading: boolean;
  error: string | null;
  semanticResults: Brand[];
  handleApprove: (brandId: number) => Promise<void>;
}

export function useBrandDataFetcher({
  debouncedSearchQuery,
  categoryFilter,
  founderFilter,
  typeFilter,
  sortBy,
  showFavoritesOnly,
  favoriteIds,
  currentPage,
  itemsPerPage,
  isAdmin,
  setCurrentPage
}: UseBrandDataFetcherProps): UseBrandDataFetcherReturn {
  const [searchParams] = useSearchParams();
  const semanticQuery = searchParams.get('semantic');
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [semanticResults, setSemanticResults] = useState<Brand[]>([]);

  const handleSemanticSearch = useCallback(async () => {
    if (!semanticQuery) return;

    console.log('🔍 SEMANTIC SEARCH: Starting with query:', semanticQuery);
    try {
      setError(null);
      setLoading(true);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }
      
      console.log('🔍 SEMANTIC SEARCH: Making API call to:', `${supabaseUrl}/functions/v1/semantic-search`);
      const response = await fetch(
        `${supabaseUrl}/functions/v1/semantic-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: semanticQuery }),
          signal: AbortSignal.timeout(30000)
        }
      );

      console.log('🔍 SEMANTIC SEARCH: Response status:', response.status, response.statusText);
      if (!response.ok) {
        const error = await response.json();
        console.error('🔍 SEMANTIC SEARCH: Error response:', error);
        throw new Error(error.error || `Failed to search: ${response.status}`);
      }

      const matches = await response.json();
      
      setBrands(matches.results || matches);
      setTotalItems((matches.results || matches).length);
      setSemanticResults(matches.results || matches);
    } catch (err: any) {
      console.error('Semantic search error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [semanticQuery, setBrands, setTotalItems, setSemanticResults, setError, setLoading]);

  const fetchBrands = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('brands')
        .select('id, name, creators, product_category, description, year_founded, brand_collab, logo_url, created_at, approval_status, type_of_influencer', { count: 'exact' });
      
      if (!isAdmin) {
        query = query.eq('approval_status', 'approved');
      }

      if (debouncedSearchQuery) {
        const searchPattern = `%${debouncedSearchQuery.toLowerCase()}%`;
        query = query.or(
          `name.ilike.${searchPattern},` +
          `creators.ilike.${searchPattern}`
        );
      }

      if (categoryFilter !== 'All Categories') {
        query = query.eq('product_category', categoryFilter);
      }

      if (founderFilter !== 'All Founder Types') {
        query = query.eq('type_of_influencer', founderFilter);
      }

      if (typeFilter !== 'All Types') {
        query = query.eq('brand_collab', typeFilter === 'Collab');
      }

      if (showFavoritesOnly && favoriteIds.length > 0) {
        query = query.in('id', favoriteIds);
      } else if (showFavoritesOnly && favoriteIds.length === 0) {
        setBrands([]);
        setTotalItems(0);
        setLoading(false);
        return;
      }

      const sortOptions = [
        { value: 'az', field: 'name', ascending: true },
        { value: 'newest', field: 'year_founded', ascending: false },
        { value: 'oldest', field: 'year_founded', ascending: true }
      ];

      const selectedSort = sortOptions.find(option => option.value === sortBy) || sortOptions[0];
      query = query.order(selectedSort.field, { ascending: selectedSort.ascending });

      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;
      
      const { data, error, count } = await query.range(start, end);

      if (error) {
        throw error;
      }

      setBrands(data || []);
      setTotalItems(count || 0);
      
    } catch (error: any) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      if (error?.code === 'PGRST103' || error?.message?.includes('Requested range not satisfiable')) {
        setCurrentPage(1);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, categoryFilter, founderFilter, typeFilter, sortBy, showFavoritesOnly, favoriteIds, currentPage, itemsPerPage, isAdmin, setCurrentPage]);

  const handleApprove = useCallback(async (brandId: number) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ approval_status: 'approved' })
        .eq('id', brandId);

      if (error) throw error;

      await fetchBrands();
    } catch (err) {
      console.error('Error approving brand:', err);
    }
  }, [fetchBrands]);

  useEffect(() => {
    if (semanticQuery) {
      handleSemanticSearch();
    } else {
      fetchBrands();
    }
  }, [semanticQuery, fetchBrands, handleSemanticSearch]);

  return {
    brands,
    totalItems,
    loading,
    error,
    semanticResults,
    handleApprove
  };
}