import { Link, useLocation } from 'react-router-dom';
import { Bot, Terminal, Cpu, Zap } from 'lucide-react';

export function AdminRibbon() {
  const location = useLocation();
  const isInControlCenter = location.pathname.includes('/admin/agent-boss-control-center');

  return (
    <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-teal-500/20">
      {/* Animated gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500 to-transparent animate-pulse" />
      
      <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <Terminal className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200">
              ADMIN_ACCESS::
            </span>
            <span className="text-sm font-mono text-teal-400 animate-pulse">
              GRANTED
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-gray-700/50">
            <Cpu className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500 font-mono">
              SYS.STATUS: OPTIMAL
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-mono">
            <span>UPTIME:</span>
            <span className="text-teal-400">ACTIVE</span>
          </div>
          
          {!isInControlCenter ? (
            <Link 
              to="/admin/agent-boss-control-center"
              className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded-md transition-colors group"
            >
              <Bot className="w-4 h-4 text-teal-400 group-hover:animate-pulse" />
              <span className="text-sm text-teal-400 font-medium">
                Control Center
              </span>
              <Zap className="w-3 h-3 text-teal-400 animate-pulse" />
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 rounded-md">
              <Bot className="w-4 h-4 text-teal-400" />
              <span className="text-sm text-teal-400 font-medium">
                Control Active
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Animated gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500 to-transparent animate-pulse" />
    </div>
  );
}