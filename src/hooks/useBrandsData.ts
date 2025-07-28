import { usePagination } from './usePagination';
import { useBrandFilters } from './useBrandFilters';
import { useAuthStatus } from './useAuthStatus';
import { useBrandMetadata } from './useBrandMetadata';
import { useFavorites } from './useFavorites';
import { useBrandDataFetcher } from './useBrandDataFetcher';

export function useBrandsData() {
  const { 
    currentPage, 
    itemsPerPage, 
    setCurrentPage, 
    setItemsPerPage,
    resetPagination 
  } = usePagination(25);

  const {
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
  } = useBrandFilters(resetPagination);

  const { isAuthenticated, isAdmin, userId } = useAuthStatus();
  
  const { productCategories, founderTypes } = useBrandMetadata();
  
  const { favoriteIds, handleFavoriteChange } = useFavorites(userId);

  const {
    brands,
    totalItems,
    loading,
    error,
    semanticResults,
    handleApprove
  } = useBrandDataFetcher({
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
  });

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