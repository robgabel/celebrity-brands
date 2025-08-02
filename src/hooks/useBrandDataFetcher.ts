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

  // Add debug state to track what's happening
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  // Add a ref to track if we're already fetching to prevent multiple simultaneous calls
  const isFetchingRef = useRef(false);

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
  }, [semanticQuery]);

  const fetchBrands = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('🔄 FETCH BRANDS: Already fetching, skipping...');
      return;
    }

    console.log('🔍 FETCH BRANDS: Starting with parameters:', {
      debouncedSearchQuery,
      categoryFilter,
      founderFilter,
      typeFilter,
      sortBy,
      showFavoritesOnly,
      favoriteIds: favoriteIds.length,
      currentPage,
      itemsPerPage,
      isAdmin
    });
    
    isFetchingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🗄️ FETCH BRANDS: Creating base query...');
      let query = supabase
        .from('brands')
        .select('id, name, creators, product_category, description, year_founded, brand_collab, logo_url, created_at, approval_status, type_of_influencer', { count: 'exact' });
      
      console.log('🗄️ FETCH BRANDS: Base query created successfully');
      
      if (!isAdmin) {
        query = query.eq('approval_status', 'approved');
        console.log('🔒 FETCH BRANDS: Added approval_status filter (not admin)');
      } else {
        console.log('🔓 FETCH BRANDS: Admin access - no approval filter');
      }

      if (debouncedSearchQuery) {
        const searchPattern = `%${debouncedSearchQuery.toLowerCase()}%`;
        query = query.or(
          `name.ilike.${searchPattern},` +
          `creators.ilike.${searchPattern}`
        );
        console.log('🔍 FETCH BRANDS: Added search filter:', searchPattern);
      }

      if (categoryFilter !== 'All Categories') {
        query = query.eq('product_category', categoryFilter);
        console.log('📂 FETCH BRANDS: Added category filter:', categoryFilter);
      }

      if (founderFilter !== 'All Founder Types') {
        query = query.eq('type_of_influencer', founderFilter);
        console.log('👤 FETCH BRANDS: Added founder filter:', founderFilter);
      }

      if (typeFilter !== 'All Types') {
        query = query.eq('brand_collab', typeFilter === 'Collab');
        console.log('🏷️ FETCH BRANDS: Added type filter:', typeFilter, '-> brand_collab:', typeFilter === 'Collab');
      }

      if (showFavoritesOnly && favoriteIds.length > 0) {
        query = query.in('id', favoriteIds);
        console.log('❤️ FETCH BRANDS: Added favorites filter:', favoriteIds);
      } else if (showFavoritesOnly && favoriteIds.length === 0) {
        console.log('⚠️ FETCH BRANDS: Favorites filter enabled but no favorite IDs available');
        setBrands([]);
        setTotalItems(0);
        return;
      }

      const sortOptions = [
        { value: 'az', field: 'name', ascending: true },
        { value: 'newest', field: 'year_founded', ascending: false },
        { value: 'oldest', field: 'year_founded', ascending: true }
      ];

      const selectedSort = sortOptions.find(option => option.value === sortBy) || sortOptions[0];
      query = query.order(selectedSort.field, { ascending: selectedSort.ascending });
      console.log('📊 FETCH BRANDS: Added sort:', selectedSort);

      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;
      console.log('📄 FETCH BRANDS: Pagination range:', { start, end, currentPage, itemsPerPage });
      
      console.log('🚀 FETCH BRANDS: Executing Supabase query...');
      const queryStartTime = Date.now();
      const { data, error, count } = await query.range(start, end);
      const queryEndTime = Date.now();
      const queryDuration = queryEndTime - queryStartTime;

      console.log('📊 FETCH BRANDS: Supabase query results:', {
        data: data ? `${data.length} brands` : 'null',
        error: error ? error.message : 'none',
        count: count,
        queryDuration: `${queryDuration}ms`,
        firstBrand: data?.[0] ? {
          id: data[0].id,
          name: data[0].name,
          approval_status: data[0].approval_status
        } : 'none'
      });

      if (error) {
        console.error('❌ FETCH BRANDS: Supabase query error:', error);
        throw error;
      }

      setBrands(data || []);
      setTotalItems(count || 0);
      
      console.log('✅ FETCH BRANDS: State updated successfully:', {
        brandsCount: (data || []).length,
        totalItems: count || 0
      });
      
      
    } catch (error: any) {
      console.error('💥 FETCH BRANDS: Error in fetchBrands:', error);
      
      // Enhanced error handling for network issues
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.name === 'TypeError')) {
        console.error('🌐 NETWORK ERROR: Connection to Supabase failed');
        
        setError('Unable to connect to the database. Please check your internet connection and try refreshing the page.');
      } else {
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
      
      if (error?.code === 'PGRST103' || error?.message?.includes('Requested range not satisfiable')) {
        console.log('🔄 FETCH BRANDS: Handling pagination range error...');
        setCurrentPage(1);
        return;
      }
    } finally {
      setLoading(false);
      console.log('🏁 FETCH BRANDS: Loading completed, setting loading to false');
      isFetchingRef.current = false;
    }
  }, [
    debouncedSearchQuery,
    categoryFilter,
    founderFilter,
    typeFilter,
    sortBy,
    showFavoritesOnly,
    favoriteIds,
    currentPage,
    itemsPerPage,
    isAdmin
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
    console.log('🔄 USE EFFECT: Triggered with semanticQuery:', semanticQuery);

    if (semanticQuery) {
      console.log('🔄 USE EFFECT: Calling handleSemanticSearch');
      handleSemanticSearch();
    } else {
      console.log('🔄 USE EFFECT: Calling fetchBrands');
      fetchBrands();
    }
  }
  )
  return {
    brands,
    totalItems,
    loading,
    error,
    semanticResults,
    handleApprove
  };
}