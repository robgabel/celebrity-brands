import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FavoriteButtonProps {
  brandId: number;
  initialFavorited?: boolean;
  onFavoriteChange?: (isFavorited: boolean) => void;
  className?: string;
}

export function FavoriteButton({ 
  brandId, 
  initialFavorited = false,
  onFavoriteChange,
  className = ''
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      checkFavoriteStatus();
    }
  }, [brandId, userId]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserId(user?.id || null);
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
      setUserId(null);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('favorite_brands')
        .select('*')
        .eq('user_id', userId)
        .eq('brand_id', brandId)
        .maybeSingle();

      if (error) throw error;

      setIsFavorited(!!data);
      onFavoriteChange?.(!!data);
    } catch (err) {
      console.error('Error checking favorite status:', err);
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated || !userId) {
      setError('Please log in to favorite brands');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorite_brands')
          .delete()
          .eq('brand_id', brandId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorite_brands')
          .insert([{ 
            brand_id: brandId, 
            user_id: userId,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      const newFavoritedState = !isFavorited;
      setIsFavorited(newFavoritedState);
      onFavoriteChange?.(newFavoritedState);
    } catch (err: any) {
      console.error('Error updating favorite:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`relative p-2 rounded-full transition-colors duration-200 ${
        isFavorited 
          ? 'text-teal-400 hover:bg-gray-800' 
          : 'text-gray-500 hover:bg-gray-800'
      } ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`}
        fill={isFavorited ? 'currentColor' : 'none'}
      />
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-red-900/50 text-red-100 text-xs rounded-lg whitespace-nowrap border border-red-800">
          {error}
        </div>
      )}
    </button>
  );
}