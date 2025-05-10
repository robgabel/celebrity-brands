import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';

export function SuggestBrandForm() {
  const [formData, setFormData] = useState({
    brand_name: '',
    creators: '',
    product_category: '',
    description: '',
    year_founded: new Date().getFullYear()
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to suggest brands');

      const { error: submitError } = await supabase
        .from('brand_suggestions')
        .insert([{
          ...formData,
          user_id: user.id
        }]);

      if (submitError) throw submitError;

      setSuccess(true);
      setFormData({
        brand_name: '',
        creators: '',
        product_category: '',
        description: '',
        year_founded: new Date().getFullYear()
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="brand_name" className="block text-sm font-medium text-gray-700">
          Brand Name
        </label>
        <input
          type="text"
          id="brand_name"
          name="brand_name"
          value={formData.brand_name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="creators" className="block text-sm font-medium text-gray-700">
          Creators
        </label>
        <input
          type="text"
          id="creators"
          name="creators"
          value={formData.creators}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="product_category" className="block text-sm font-medium text-gray-700">
          Product Category
        </label>
        <select
          id="product_category"
          name="product_category"
          value={formData.product_category}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select a category</option>
          <option value="Fashion & Apparel">Fashion & Apparel</option>
          <option value="Beauty & Personal Care">Beauty & Personal Care</option>
          <option value="Food & Non-Alcoholic Beverages">Food & Non-Alcoholic Beverages</option>
          <option value="Alcoholic Beverages">Alcoholic Beverages</option>
          <option value="Health & Fitness">Health & Fitness</option>
          <option value="Home & Lifestyle">Home & Lifestyle</option>
          <option value="Tech & Electronics">Tech & Electronics</option>
          <option value="Entertainment & Media">Entertainment & Media</option>
          <option value="Sports & Esports">Sports & Esports</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="year_founded" className="block text-sm font-medium text-gray-700">
          Year Founded
        </label>
        <input
          type="number"
          id="year_founded"
          name="year_founded"
          value={formData.year_founded}
          onChange={handleChange}
          required
          min="1900"
          max={new Date().getFullYear()}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-700">
            Thank you for your suggestion! We'll review it shortly.
          </p>
        </div>
      )}

      <Button
        type="submit"
        isLoading={isSubmitting}
        className="w-full"
      >
        Submit Brand Suggestion
      </Button>
    </form>
  );
}