import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseBrandMetadataReturn {
  productCategories: string[];
  founderTypes: string[];
  loading: boolean;
  error: string | null;
}

export function useBrandMetadata(): UseBrandMetadataReturn {
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [founderTypes, setFounderTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to load categories');
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
      setError('Failed to load founder types');
    }
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchProductCategories(),
          fetchFounderTypes()
        ]);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load metadata');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [fetchProductCategories, fetchFounderTypes]);

  return {
    productCategories,
    founderTypes,
    loading,
    error
  };
}