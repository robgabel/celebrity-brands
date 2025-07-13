import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Lightbulb } from 'lucide-react';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function SuggestBrand() {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    brand_name: '',
    creators: '',
    is_collab: false,
    comments: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.brand_name.trim() || !formData.creators.trim()) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Get user ID if authenticated, otherwise null for anonymous submissions
      const userId = user?.id || null;
      
      const { error: submitError } = await supabase
        .from('brand_suggestions')
        .insert([{
          user_id: userId,
          brand_name: formData.brand_name.trim(),
          creators: formData.creators.trim(),
          is_collab: formData.is_collab,
          comments: formData.comments.trim() || null,
          email: formData.email.trim() || null,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (submitError) {
        throw submitError;
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error submitting brand suggestion:', err);
      setError(err.message || 'Failed to submit suggestion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Helmet>
          <title>Thank You | Celebrity Brands Database</title>
        </Helmet>
        <GlobalNav />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-100 mb-4">
              Thank You!
            </h1>
            <p className="text-gray-300 mb-6">
              Your brand suggestion has been submitted successfully. We'll review it and add it to our database if it meets our criteria.
            </p>
            <Link to="/explore">
              <Button className="inline-flex items-center gap-2">
                Explore Brands
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Helmet>
        <title>Suggest a Brand | Celebrity Brands Database</title>
        <meta name="description" content="Help us discover more celebrity and creator-owned brands by suggesting new brands for our database." />
      </Helmet>
      <GlobalNav />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-8 h-8 text-teal-400" />
            <h1 className="text-3xl font-bold text-gray-100">
              Suggest a Brand
            </h1>
          </div>

          <div className="mb-8">
            <p className="text-gray-300 mb-4">
              Thank you for helping us discover and follow more celebrity or creator owned brands.
            </p>
            <p className="text-gray-300 mb-4">
              We are primarily looking for brands where an influential person is:
            </p>
            <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2 ml-4">
              <li>Involved in the creation of the product, not just promotion</li>
              <li>Owns 5% or more of the company</li>
            </ol>
            <p className="text-gray-400 text-sm">
              (We are also tracking dedicated brand collabs like DudePerfect x BodyArmor)
            </p>
          </div>

          {error && <ErrorMessage message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="brand_name" className="block text-sm font-medium text-gray-300 mb-2">
                Brand Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="brand_name"
                name="brand_name"
                value={formData.brand_name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter the brand name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="creators" className="block text-sm font-medium text-gray-300 mb-2">
                Creator or Celebrity Owner(s) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="creators"
                name="creators"
                value={formData.creators}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter the creator or celebrity name(s)"
                required
                disabled={isSubmitting}
              />
            </div>


            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="is_collab"
                  checked={formData.is_collab}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 focus:ring-2"
                  disabled={isSubmitting}
                />
                <span className="text-gray-300">
                  Is this a collaboration brand? (e.g., DudePerfect x BodyArmor)
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-300 mb-2">
                Comments <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Any additional information about the brand..."
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="your.email@example.com"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="px-8 py-3"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}