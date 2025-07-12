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
  const [loading, setLoading] = useState(true);
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
    setSearchInput('');
    setSortBy('az');
    setCategoryFilter('All Categories');
    setFounderFilter('All Founder Types');
    setTypeFilter('All Types');
    resetPagination();
  }, [resetPagination]);

  const checkAuth = useCallback(async () => {
    setLoading(false);
    
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
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: semanticQuery })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to search: ${response.status}`);
        }

        const matches = await response.json();
        setBrands(matches.results || matches);
        setTotalItems((matches.results || matches).length);
        checkAuth();
        return;
      } catch (err: any) {
        console.error('Semantic search error:', err);
        setError(err.message);
        setLoading(false);
        return;
      }
    }
  }, [semanticQuery, checkAuth]);

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('brands')
        .select('*', { count: 'exact' });
      
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
        .throwOnError();

      if (error) {
        throw error;
      }

      setBrands(data || []);
      setTotalItems(count || 0);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
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
    if (semanticQuery) {
      handleSemanticSearch();
    } else {
      checkAuth();
    }
  }, [semanticQuery, handleSemanticSearch, checkAuth]);

  useEffect(() => {
    Promise.all([fetchBrands(), fetchFounderTypes(), fetchProductCategories()]);
  }, [fetchBrands, fetchFounderTypes, fetchProductCategories]);

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