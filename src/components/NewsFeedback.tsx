import { useState } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';

interface NewsFeedbackProps {
  brandId: number;
  articleUrl: string;
  onFeedbackSubmit?: () => void;
}

export function NewsFeedback({ brandId, articleUrl, onFeedbackSubmit }: NewsFeedbackProps) {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [isAccurate, setIsAccurate] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  });

  const handleFeedback = async (accurate: boolean) => {
    if (!isAuthenticated) {
      setError('Please log in to provide feedback');
      return;
    }
    setIsAccurate(accurate);
    setShowFeedbackDialog(true);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: submitError } = await supabase
        .from('news_feedback')
        .insert({
          user_id: user.id,
          brand_id: brandId,
          news_article_url: articleUrl,
          is_accurate: isAccurate,
          feedback_text: feedbackText.trim() || null
        });

      if (submitError) throw submitError;

      setShowFeedbackDialog(false);
      setFeedbackText('');
      onFeedbackSubmit?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleFeedback(true)}
          className="p-1 text-gray-400 hover:text-green-400 transition-colors cursor-pointer"
          title="Accurate article"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFeedback(true);
          }}
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFeedback(false)}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
          title="Inaccurate article"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFeedback(false);
          }}
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="absolute top-8 left-0 z-10 bg-red-900/90 text-red-200 text-sm py-1 px-2 rounded border border-red-700">
          {error}
        </div>
      )}

      {showFeedbackDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative border border-gray-700">
            <button
              onClick={() => setShowFeedbackDialog(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              {isAccurate ? 'Article is Accurate' : 'Article is Inaccurate'}
            </h3>

            <p className="text-gray-300 mb-4">
              Would you like to provide additional feedback about this article?
            </p>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Optional feedback..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
              rows={4}
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowFeedbackDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}