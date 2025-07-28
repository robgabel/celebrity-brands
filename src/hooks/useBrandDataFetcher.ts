import { useState, useEffect, useCallback } from 'react';
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

    try {
      setError(null);
      setLoading(true);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }
      
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

      if (!response.ok) {
        const error = await response.json();
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
  }, [semanticQuery]);

  const fetchBrands = useCallback(async () => {
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
        console.error('Supabase query error:', error);
        throw error;
      }

      setBrands(data || []);
      setTotalItems(count || 0);
    } catch (error: any) {
      console.error('Error in fetchBrands:', error);
      
      if (error?.code === 'PGRST103' || error?.message?.includes('Requested range not satisfiable')) {
        // Handle pagination range error
        let countQuery = supabase
          .from('brands')
          .select('id', { count: 'exact', head: true });
        
        if (!isAdmin) {
          countQuery = countQuery.eq('approval_status', 'approved');
        }

        if (debouncedSearchQuery) {
          const searchPattern = `%${debouncedSearchQuery.toLowerCase()}%`;
          countQuery = countQuery.or(
            `name.ilike.${searchPattern},` +
            `creators.ilike.${searchPattern}`
          );
        }

        if (categoryFilter !== 'All Categories') {
          countQuery = countQuery.eq('product_category', categoryFilter);
        }

        if (founderFilter !== 'All Founder Types') {
          countQuery = countQuery.eq('type_of_influencer', founderFilter);
        }

        if (typeFilter !== 'All Types') {
          countQuery = countQuery.eq('brand_collab', typeFilter === 'Collab');
        }

        if (showFavoritesOnly && favoriteIds.length > 0) {
          countQuery = countQuery.in('id', favoriteIds);
        }

        try {
          const { count } = await countQuery;
          const actualCount = count || 0;
          setTotalItems(actualCount);
          
          const lastValidPage = Math.max(1, Math.ceil(actualCount / itemsPerPage));
          
          if (currentPage > lastValidPage) {
            setCurrentPage(lastValidPage);
            return;
          }
        } catch (countError) {
          console.error('Error getting count:', countError);
          setError('Failed to load brands');
        }
      } else {
        setError(`Failed to load brands: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    showFavoritesOnly,
    debouncedSearchQuery,
    categoryFilter,
    founderFilter,
    typeFilter,
    sortBy,
    isAdmin,
    favoriteIds,
    setCurrentPage
  ]);

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
  }, [semanticQuery, handleSemanticSearch, fetchBrands]);

  return {
    brands,
    totalItems,
    loading,
    error,
    semanticResults,
    handleApprove
  };
}