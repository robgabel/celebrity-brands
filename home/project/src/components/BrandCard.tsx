import { useState } from 'react';
import { Heart, MessageSquare, Flag, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

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
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{brand.name}</h3>
            <p className="text-gray-600">{brand.creators}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isFavorited ? 'text-red-500 hover:bg-red-50' : 'text-gray-400 hover:bg-gray-50'
              }`}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setIsCommenting(!isCommenting)}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-50 transition-colors duration-200"
              aria-label="Comment"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={handleReport}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-50 transition-colors duration-200"
              aria-label="Report"
            >
              <Flag className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-500">{brand.product_category}</p>
          <p className="text-gray-700">{brand.description}</p>
          <p className="text-sm text-gray-500">Founded: {brand.year_founded}</p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {isCommenting && (
          <div className="mt-4 space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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