import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Calendar } from 'lucide-react';
import { getWikipediaPageViews } from '../services/wikipediaTrendsService';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import type { TrendData } from '../services/wikipediaTrendsService';

interface Brand {
  id: number;
  name: string;
}

interface BrandTrends {
  brandId: number;
  brandName: string;
  data: TrendData[];
}

const COLORS = [
  'rgb(45, 212, 191)', // teal-400
  'rgb(168, 85, 247)', // purple-500
  'rgb(251, 146, 60)', // orange-400
  'rgb(74, 222, 128)', // green-400
  'rgb(248, 113, 113)', // red-400
  'rgb(96, 165, 250)', // blue-400
];

export function ComparePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([]);
  const [trendData, setTrendData] = useState<BrandTrends[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrands.length > 0 && dateRange) {
      fetchTrendData();
    }
  }, [selectedBrands]);

  const fetchBrands = async () => {
    try {
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name')
        .eq('approval_status', 'approved')
        .order('name');

      if (brandsData) {
        setBrands(brandsData);
      }
    } catch (err: any) {
      console.error('Error fetching brands:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('approval_status', 'approved')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (err: any) {
      console.error('Error fetching brands:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
        .from('brand_metrics')
        .select('brand_id, metric_value, collected_at')
        .in('brand_id', selectedBrands)
      setError(null);

      const trendsPromises = selectedBrands.map(async (brand) => {
        try {
          return {};
        } catch (err) {
          console.error(err);
          return null;
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBrandToggle = (brand: Brand) => {
    setSelectedBrands(prev => 
      prev.find(b => b.id === brand.id)
        ? prev.filter(b => b.id !== brand.id)
        : [...prev, brand].slice(0, 6) // Limit to 6 brands
    );
  };

  const formatDate = (timestamp: string) => {
    // Convert YYYYMMDD to readable date
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    return new Date(`${year}-${month}-${day}`).toLocaleDateString();
  };

  const chartData = {
    datasets: trendData.map((brand, index) => {
      return {
        label: brand.brandName,
        data: brand.data.map(point => ({
          x: formatDate(point.timestamp),
          y: point.value
        })),
        borderColor: COLORS[index % COLORS.length],
        backgroundColor: COLORS[index % COLORS.length],
        tension: 0.4,
        fill: false
      };
    })
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)' // text-gray-400
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)' // gray-600 with opacity
        },
        ticks: {
          color: 'rgb(156, 163, 175)' // text-gray-400
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)' // gray-600 with opacity
        },
        ticks: {
          color: 'rgb(156, 163, 175)' // text-gray-400
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <GlobalNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-4">Compare Brands</h1>
          <p className="text-gray-400">
            Select up to 6 brands to compare their search interest trends over time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Brand Selection */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Select Brands</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {brands.map(brand => (
                  <label
                    key={brand.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-700/50 rounded-lg cursor-pointer"
                  >
                     <input
                      type="checkbox"
                      checked={selectedBrands.some(b => b.id === brand.id)}
                      onChange={() => handleBrandToggle(brand)}
                      className="rounded border-gray-600 text-teal-500 focus:ring-teal-500 bg-gray-700"
                    />
                    <span className="text-gray-300">{brand.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date Range
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    max={dateRange.end}
                    className="w-full bg-gray-700 border-gray-600 rounded-lg text-gray-200 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    min={dateRange.start}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-700 border-gray-600 rounded-lg text-gray-200 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-4"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="text-red-400">{error}</div>
                </div>
              ) : selectedBrands.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-gray-400">
                  Select brands to compare their trends
                </div>
              ) : (
                <div className="h-[400px]">
                  <Line data={chartData} options={chartOptions} />
                  <div className="mt-4 text-sm text-gray-400 text-center">
                    Data source: Wikipedia Page Views
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}