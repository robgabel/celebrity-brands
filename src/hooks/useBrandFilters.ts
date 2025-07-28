import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';

interface UseBrandFiltersReturn {
  searchInput: string;
  setSearchInput: (input: string) => void;
  debouncedSearchQuery: string;
  sortBy: string;
  setSortBy: (sort: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  founderFilter: string;
  setFounderFilter: (founder: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;
  clearFilters: () => void;
}

export function useBrandFilters(resetPagination: () => void): UseBrandFiltersReturn {
  const [searchParams] = useSearchParams();
  const semanticQuery = searchParams.get('semantic');
  const searchQuery = searchParams.get('search');
  
  const [searchInput, setSearchInput] = useState(searchQuery || '');
  const [debouncedSearchQuery] = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<string>('az');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'All Categories');
  const [founderFilter, setFounderFilter] = useState(searchParams.get('founderType') || 'All Founder Types');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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

  return {
    searchInput,
    setSearchInput,
    debouncedSearchQuery,
    sortBy,
    setSortBy,
    categoryFilter,
    setCategoryFilter,
    founderFilter,
    setFounderFilter,
    typeFilter,
    setTypeFilter,
    showFavoritesOnly,
    setShowFavoritesOnly,
    clearFilters
  };
}