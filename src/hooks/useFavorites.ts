import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseFavoritesReturn {
  favoriteIds: number[];
  handleFavoriteChange: (brandId: number, isFavorited: boolean) => void;
  refreshFavorites: () => Promise<void>;
}

export function useFavorites(userId: string | null): UseFavoritesReturn {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavoriteIds([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_brands')
        .select('brand_id')
        .eq('user_id', userId);

      if (error) throw error;

      setFavoriteIds(data.map(fav => fav.brand_id));
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }, [userId]);

  const handleFavoriteChange = useCallback((brandId: number, isFavorited: boolean) => {
    setFavoriteIds(prev => 
      isFavorited 
        ? [...prev, brandId]
        : prev.filter(id => id !== brandId)
    );
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favoriteIds,
    handleFavoriteChange,
    refreshFavorites: fetchFavorites
  };
}