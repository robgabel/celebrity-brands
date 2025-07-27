import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePagination } from './usePagination';
import { useDebounce } from 'use-debounce';
import type { Brand } from '../types/brand';

interface UseBrandsDataReturn {
  brands: Brand[];
  totalItems: number;
  loading: boolean;
  error: string | null;
  productCategories: string[];
  founderTypes: string[];
  isAdmin: boolean;
  isAuthenticated: boolean;
  favoriteIds: number[];
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;
  searchInput: string;
  setSearchInput: (input: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  founderFilter: string;
  setFounderFilter: (founder: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  resetPagination: () => void;
  clearFilters: () => void;
  handleFavoriteChange: (brandId: number, isFavorited: boolean) => void;
  handleApprove: (brandId: number) => Promise<void>;
  semanticResults: Brand[];
}

export function useBrandsData(): UseBrandsDataReturn {
  const [searchParams] = useSearchParams();
  const semanticQuery = searchParams.get('semantic');
  const searchQuery = searchParams.get('search');
  
  const [semanticResults, setSemanticResults] = useState<Brand[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [searchInput, setSearchInput] = useState(searchQuery || '');
  const [debouncedSearchQuery] = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<string>('az');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'All Categories');
  const [founderFilter, setFounderFilter] = useState(searchParams.get('founderType') || 'All Founder Types');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [founderTypes, setFounderTypes] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const { 
    currentPage, 
    itemsPerPage, 
    setCurrentPage, 
    setItemsPerPage,
    resetPagination 
  } = usePagination(25);

  const clearFilters = useCallback(() => {
    // Don't clear filters if we're in semantic search mode
    if (semanticQuery) return;
    
    setSearchInput('');
    setSortBy('az');
    setCategoryFilter('All Categories');
    setFounderFilter('All Founder Types');
    setTypeFilter('All Types');
    resetPagination();
  }, [resetPagination, semanticQuery]);

  const checkAuth = useCallback(async () => {
    // Don't set loading to false here - let the data fetching functions handle it
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('auth_id', user.id)
          .single();
        
        setIsAdmin(!!profile?.is_admin);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  }, []);

  const fetchProductCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('product_category')
        .eq('approval_status', 'approved')
        .not('product_category', 'is', null)
        .order('product_category');

      if (error) throw error;

      const uniqueCategories = Array.from(new Set(data.map(item => item.product_category)))
        .filter(Boolean)
        .sort();

      setProductCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching product categories:', err);
    }
  }, []);

  const fetchFounderTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('type_of_influencer')
        .eq('approval_status', 'approved')
        .not('type_of_influencer', 'is', null)
        .order('type_of_influencer');

      if (error) throw error;

      const uniqueTypes = Array.from(new Set(data.map(item => item.type_of_influencer)))
        .filter(Boolean)
        .sort();

      setFounderTypes(uniqueTypes);
    } catch (err) {
      console.error('Error fetching founder types:', err);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('favorite_brands')
        .select('brand_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavoriteIds(data.map(fav => fav.brand_id));
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }, []);

  const handleSemanticSearch = useCallback(async () => {
    if (semanticQuery) {
      try {
        setError(null);
        setLoading(true);
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration is missing. Please check your environment variables.');
        }
        
        let response;
        try {
          response = await fetch(
            `${supabaseUrl}/functions/v1/semantic-search`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query: semanticQuery }),
              signal: AbortSignal.timeout(30000) // 30 second timeout
            }
          );
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
          }
          if (fetchError.message === 'Failed to fetch') {
            throw new Error('Unable to connect to search service. Please check your internet connection and try again.');
          }
          // Handle cases where fetchError.message might be undefined
          const errorMessage = fetchError?.message || fetchError?.toString() || 'Unknown network error';
          throw new Error(`Network error: ${errorMessage}`);
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to search: ${response.status}`);
        }

        const matches = await response.json();
        setBrands(matches.results || matches);
        setTotalItems((matches.results || matches).length);
        setSemanticResults(matches.results || matches);
        await checkAuth();
        console.log('✅ Semantic search completed, setting loading to false');
        setLoading(false);
        return;
      } catch (err: any) {
        console.error('Semantic search error:', err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
        return;
      }
    }
  }, [semanticQuery, checkAuth]);

  const fetchBrands = useCallback(async () => {
    try {
      console.log('🔄 Starting fetchBrands, setting loading to true');
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
      
      const { data, error, count } = await query
        .range(start, end)
        ;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      setBrands(data || []);
      setTotalItems(count || 0);
      console.log('Brands fetched successfully:', { count: data?.length, total: count });
    } catch (error) {
      console.error('Error in fetchBrands:', error);
      // Handle pagination range error
      if (error?.code === 'PGRST103' || error?.message?.includes('Requested range not satisfiable')) {
        // Get the actual count for current filters
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
          
          // Calculate the last valid page
          const lastValidPage = Math.max(1, Math.ceil(actualCount / itemsPerPage));
          
          // If current page is out of bounds, reset to last valid page
          if (currentPage > lastValidPage) {
            setCurrentPage(lastValidPage);
            return; // This will trigger a re-fetch with the corrected page
          }
        } catch (countError) {
          console.error('Error getting count:', countError);
          setError('Failed to load brands');
        }
      } else {
        console.error('Error fetching brands:', error);
        setError(`Failed to load brands: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      console.log('✅ fetchBrands completed, setting loading to false');
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, showFavoritesOnly, debouncedSearchQuery, categoryFilter, founderFilter, typeFilter, sortBy, isAdmin, favoriteIds]);

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

  const handleFavoriteChange = useCallback((brandId: number, isFavorited: boolean) => {
    setFavoriteIds(prev => 
      isFavorited 
        ? [...prev, brandId]
        : prev.filter(id => id !== brandId)
    );
  }, []);

  useEffect(() => {
    // This block ensures only one type of search runs

    if (semanticQuery) {
      // If there's a semantic query in the URL, run only the semantic search
      handleSemanticSearch();
    } else {
      // Otherwise, run the regular keyword/filtered search
      fetchBrands();
    }


  }, [
    semanticQuery,
    handleSemanticSearch,
    fetchBrands,
  ]);

  useEffect(() => {
    // These can run regardless of the search type
    checkAuth();
    fetchFounderTypes();
    fetchProductCategories();
  }, [checkAuth, fetchFounderTypes, fetchProductCategories]);
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated, fetchFavorites]);

  return {
    brands,
    totalItems,
    loading,
    error,
    productCategories,
    founderTypes,
    isAdmin,
    isAuthenticated,
    favoriteIds,
    showFavoritesOnly,
    setShowFavoritesOnly,
    searchInput,
    setSearchInput,
    sortBy,
    setSortBy,
    categoryFilter,
    setCategoryFilter,
    founderFilter,
    setFounderFilter,
    typeFilter,
    setTypeFilter,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    resetPagination,
    clearFilters,
    handleFavoriteChange,
    handleApprove,
    semanticResults
  };
}