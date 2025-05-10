import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';

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
  const [error, setError] = useState('');

  const handleCardClick = (e: MouseEvent) => {
    // Don't navigate if clicking buttons or links
    if (!(e.target as HTMLElement).closest('button')) {
      window.scrollTo(0, 0);
      navigate(`/brands/${brand.id}`);
    }
  };

  const handleFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to favorite brands');
        return;
      }

      if (isFavorited) {
        await supabase
          .from('favorite_brands')
          .delete()
          .eq('brand_id', brand.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('favorite_brands')
          .insert([{ brand_id: brand.id, user_id: user.id }]);
      }

      onFavoriteToggle();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to comment');
        return;
      }

      const { error: commentError } = await supabase
        .from('brand_comments')
        .insert([{
          brand_id: brand.id,
          user_id: user.id,
          content: comment.trim()
        }]);

      if (commentError) throw commentError;

      setComment('');
      setIsCommenting(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to report brands');
        return;
      }

      const { error: reportError } = await supabase
        .from('brand_reports')
        .insert([{
          brand_id: brand.id,
          user_id: user.id,
          issue_type: 'inappropriate',
          description: 'Content reported by user'
        }]);

      if (reportError) throw reportError;

      alert('Thank you for your report. We will review it shortly.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div 
      className="bg-gray-900 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden border border-gray-800 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">{brand.name}</h3>
            <p className="text-gray-400">{brand.creators}</p>
          </div>
          <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleFavorite}
                  ? 'text-teal-400 hover:bg-gray-800' 
                  : 'text-gray-500 hover:bg-gray-800'
              }`}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setIsCommenting(!isCommenting)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-800 transition-colors duration-200"
              aria-label="Comment"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={handleReport}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-800 transition-colors duration-200"
              aria-label="Report"
            >
              <Flag className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-400">{brand.product_category}</p>
          <p className="text-gray-300">{brand.description}</p>
          <p className="text-sm text-gray-400">Founded: {brand.year_founded}</p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/50 text-red-100 rounded-md text-sm border border-red-800">
            {error}
          </div>
        )}

        {isCommenting && (
          <div className="mt-4 space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-200 placeholder-gray-500"
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => setIsCommenting(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleComment}>
                Post Comment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}