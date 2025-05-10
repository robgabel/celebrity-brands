import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { FavoriteButton } from './FavoriteButton';

interface Brand {
  id: number;
  name: string;
  creators: string;
  product_category: string;
  description: string;
  year_founded: number;
  type_of_influencer: string;
  brand_collab: boolean;
  logo_url?: string;
  homepage_url?: string;
}

interface BrandCardProps {
  brand: Brand;
  isFavorited: boolean;
  onFavoriteToggle: () => void;
}

export function BrandCard({ brand, isFavorited, onFavoriteToggle }: BrandCardProps) {
  const navigate = useNavigate();
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState('');

  const handleCardClick = (e: MouseEvent) => {
    // Don't navigate if clicking buttons or links
    if (!(e.target as HTMLElement).closest('button')) {
      window.scrollTo(0, 0);
      navigate(`/brands/${brand.id}`);
    }
  };

  return (
    <div 
      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-700/50 cursor-pointer hover:border-gray-600/50"
      onClick={handleCardClick}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">{brand.name}</h3>
            <p className="text-gray-400">{brand.creators}</p>
          </div>
          <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
            <FavoriteButton
              brandId={brand.id}
              initialFavorited={isFavorited}
              onFavoriteChange={() => onFavoriteToggle()}
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-teal-500/10 text-teal-400 rounded-full border border-teal-500/20">
            {brand.product_category}
          </span>
          <p className="text-gray-300">{brand.description}</p>
          <p className="text-sm text-gray-400">Founded: {brand.year_founded}</p>
        </div>
      </div>
    </div>
  );
}