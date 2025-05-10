import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
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
  const [showLogoText, setShowLogoText] = useState(false);
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
    <header className="bg-gray-900 text-gray-200 py-4 px-4 md:px-6 border-b border-gray-800">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <Link to="/" className="flex items-center">
          {showLogoText ? (
            <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
              Gabel.ai
            </span>
          ) : (
            <img 
              src="/gabel-logo-light.png"
              alt="Gabel.ai"
              className="h-8"
              onError={() => setShowLogoText(true)}
            />
          )}
        </Link>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {showFavoritesToggle && (
                <button
                  onClick={onFavoritesToggle}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    showFavoritesOnly 
                      ? 'bg-teal-600 text-white hover:bg-teal-700' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  } ${!hasFavorites ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasFavorites}
                  title={!hasFavorites ? 'No favorite brands yet' : 'Toggle favorite brands'}
                >
                  <Heart className="w-5 h-5" fill="currentColor" />
                </button>
              )}
              <UserMenu />
            </>
          ) : (
            <Link to="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}