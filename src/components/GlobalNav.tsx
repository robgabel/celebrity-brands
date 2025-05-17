import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { Button } from './Button';
import { supabase } from '../lib/supabase';

interface GlobalNavProps {
  showFavoritesToggle?: boolean;
  onFavoritesToggle?: () => void;
  showFavoritesOnly?: boolean;
  hasFavorites?: boolean;
}

export function GlobalNav({ 
  showFavoritesToggle = false,
  onFavoritesToggle,
  showFavoritesOnly = false,
  hasFavorites = false
}: GlobalNavProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    // Initial auth check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="bg-gradient-to-b from-gray-900 via-gray-800/90 to-gray-900 backdrop-blur-sm text-gray-200 py-4 px-4 md:px-6 border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-xl font-bold text-teal-400 hover:text-teal-300 transition-colors">
            <span className="flex items-baseline gap-2">
              Celebrity Brands
              <span className="text-sm font-normal text-gray-500">by Gabel.ai</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center">
            <Link 
              to="/explore" 
              className="text-gray-300 hover:text-gray-100 transition-colors mr-6"
            >
              Explore
            </Link>
            <Link
              to="/compare"
              className="text-gray-300 hover:text-gray-100 transition-colors"
            >
              Compare
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="secondary">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}