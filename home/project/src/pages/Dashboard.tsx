import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';

interface Goal {
  id: string;
  note: string;
  brand_id: number | null;
  goal_type: 'research' | 'contact' | 'investment' | 'collaboration' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

interface Brand {
  id: number;
  name: string;
  creators: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<Goal['goal_type']>('research');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchGoals(), fetchBrands()]);
  }, []);

  const fetchBrands = async () => {
    try {
      const { data: brands, error } = await supabase
        .from('brands')
        .select('id, name, creators')
        .order('name');

      if (error) throw error;
      setBrands(brands || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchGoals = async () => {
    try {
      const { data: goals, error } = await supabase
        .from('goals')
        .select('*, brands(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(goals || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('goals')
        .insert([{ 
          note: newGoal.trim(),
          user_id: user.id,
          brand_id: selectedBrand || null,
          goal_type: selectedType
        }]);

      if (error) throw error;
      setNewGoal('');
      setSelectedBrand('');
      setSelectedType('research');
      fetchGoals();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (goalId: string, newStatus: Goal['status']) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goalId);

      if (error) throw error;
      fetchGoals();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getGoalTypeLabel = (type: Goal['goal_type']) => {
    const labels = {
      research: 'Research',
      contact: 'Contact',
      investment: 'Investment',
      collaboration: 'Collaboration',
      other: 'Other'
    };
    return labels[type];
  };

  const getStatusColor = (status: Goal['status']) => {
    const colors = {
      pending: 'bg-yellow-50 text-yellow-700',
      in_progress: 'bg-blue-50 text-blue-700',
      completed: 'bg-green-50 text-green-700',
      cancelled: 'bg-red-50 text-red-700'
    };
    return colors[status];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Brand Tracking</h1>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleAddGoal} className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Enter your goal..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Related Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No specific brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.creators})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as Goal['goal_type'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="research">Research</option>
                <option value="contact">Contact</option>
                <option value="investment">Investment</option>
                <option value="collaboration">Collaboration</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </div>
        </form>

        {goals.length === 0 ? (
          <p className="text-center text-gray-600">No goals yet. Add your first goal above!</p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-lg">{goal.note}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {getGoalTypeLabel(goal.goal_type)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                        {goal.status.replace('_', ' ').charAt(0).toUpperCase() + goal.status.slice(1)}
                      </span>
                      {goal.brand_id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {brands.find(b => b.id === goal.brand_id)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <select
                    value={goal.status}
                    onChange={(e) => handleUpdateStatus(goal.id, e.target.value as Goal['status'])}
                    className="ml-4 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(goal.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}