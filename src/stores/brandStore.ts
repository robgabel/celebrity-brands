import { create } from 'zustand';
import type { Brand, BrandFilters, BrandPagination } from '../types/brand';
import { brandService } from '../services/brandService';
import { APP_CONFIG } from '../config/constants';

interface BrandStore {
  brands: Brand[];
  filters: BrandFilters;
  pagination: BrandPagination;
  isLoading: boolean;
  error: string | null;
  
  setFilters: (filters: Partial<BrandFilters>) => void;
  setPagination: (pagination: Partial<BrandPagination>) => void;
  fetchBrands: (isAdmin: boolean) => Promise<void>;
  approveBrand: (id: number) => Promise<void>;
}

export const useBrandStore = create<BrandStore>((set, get) => ({
  brands: [],
  filters: {
    search: '',
    category: 'All Categories',
    founderType: 'All Founder Types',
    brandType: 'All Types',
    sortBy: 'name',
    showFavoritesOnly: false
  },
  pagination: {
    page: 1,
    limit: APP_CONFIG.ITEMS_PER_PAGE,
    total: 0
  },
  isLoading: false,
  error: null,

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 } // Reset to first page on filter change
    }));
  },

  setPagination: (pagination) => {
    set((state) => ({
      pagination: { ...state.pagination, ...pagination }
    }));
  },

  fetchBrands: async (isAdmin) => {
    const { filters, pagination } = get();
    
    set({ isLoading: true, error: null });
    
    try {
      const { brands, total } = await brandService.fetchBrands(
        filters,
        { page: pagination.page, limit: pagination.limit },
        isAdmin
      );

      set({
        brands,
        pagination: { ...pagination, total },
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching brands:', error);
      set({
        error: 'Failed to fetch brands. Please try again.',
        isLoading: false
      });
    }
  },

  approveBrand: async (id) => {
    try {
      await brandService.approveBrand(id);
      
      // Refresh the brands list
      const { fetchBrands } = get();
      await fetchBrands(true);
    } catch (error) {
      console.error('Error approving brand:', error);
      throw error;
    }
  }
}));