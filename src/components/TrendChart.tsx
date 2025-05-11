import { Line } from 'react-chartjs-2';
import { TrendResponse } from '../services/trendsService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendChartProps {
  data: TrendResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function TrendChart({ data, isLoading, error }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading trend data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center h-32">
          <div className="text-center max-w-md">
            <p className="text-red-400 mb-2">{error}</p>
            {error.includes('rate limit') && (
              <p className="text-sm text-gray-400">
                Due to high demand, we limit the number of trend requests. Please try again later.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.interest || data.interest.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-400">No trend data available for this brand.</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.interest.map(point => point.timestamp),
    datasets: [
      {
        label: 'Interest Over Time',
        data: data.interest.map(point => point.value),
        borderColor: 'rgb(45, 212, 191)',
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgb(17, 24, 39)',
        titleColor: 'rgb(229, 231, 235)',
        bodyColor: 'rgb(156, 163, 175)',
        borderColor: 'rgb(75, 85, 99)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)'
        }
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Interest Trends</h2>
        <p className="text-sm text-gray-400 mt-1">
          {data.source} for {data.articleTitle}
        </p>
      </div>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-400">Average Interest</p>
          <p className="text-lg font-semibold text-teal-400">
            {data.averageInterest.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Peak Interest</p>
          <p className="text-lg font-semibold text-teal-400">
            {data.maxInterest}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Lowest Interest</p>
          <p className="text-lg font-semibold text-teal-400">
            {data.minInterest}
          </p>
        </div>
      </div>
    </div>
  );
}