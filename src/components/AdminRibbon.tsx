import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';

export function AdminRibbon() {
  return (
    <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 text-gray-200 py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-teal-400" />
          <span className="text-sm">Welcome Administrator.</span>
        </div>
        <Link 
          to="/admin/agent-boss-control-center"
          className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
        >
          Agent Boss Control Center
        </Link>
      </div>
    </div>
  );
}