import { supabase } from '../lib/supabase';
import type { Brand, BrandFilters, BrandPagination } from '../types/brand';
import { APP_CONFIG } from '../config/constants';

export const brandService = {
  async fetchBrands(
    filters: BrandFilters,
    pagination: Omit<BrandPagination, 'total'>,
    isAdmin: boolean
  ) {
    let query = supabase
      .from('brands')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,creators.ilike.%${filters.search}%`);
    }

    if (filters.category && filters.category !== 'All Categories') {
      query = query.eq('product_category', filters.category);
    }

    if (filters.founderType && filters.founderType !== 'All Founder Types') {
      query = query.eq('type_of_influencer', filters.founderType);
    }

    if (filters.brandType && filters.brandType !== 'All Types') {
      query = query.eq('brand_collab', filters.brandType === 'Collab');
    }

    // Only show approved brands to non-admin users
    if (!isAdmin) {
      query = query.eq('approval_status', 'approved');
    }

    // Apply sorting
    query = query.order(filters.sortBy || 'name', { ascending: true });

    // Apply pagination
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit - 1;

    const { data, error, count } = await query.range(start, end);

    if (error) throw error;

    return {
      brands: data as Brand[],
      total: count || 0
    };
  },

  async fetchBrandById(id: number, isAdmin: boolean) {
    let query = supabase
      .from('brands')
      .select('*')
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('approval_status', 'approved');
    }

    const { data, error } = await query.single();

    if (error) throw error;
    return data as Brand;
  },

  async approveBrand(id: number) {
    const { error } = await supabase
      .from('brands')
      .update({ approval_status: 'approved' })
      .eq('id', id);

    if (error) throw error;
  }
};