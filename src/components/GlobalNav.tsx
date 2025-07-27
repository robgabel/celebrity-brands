import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Button } from './Button';
import { useAuthStore } from '../stores/authStore';
import { AdminRibbon } from './AdminRibbon';

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
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuthStore();

  return (
    <header className="bg-gradient-to-b from-gray-900 via-gray-800/90 to-gray-900 backdrop-blur-sm text-gray-200 py-4 px-4 md:px-6 border-b border-gray-800/50 relative z-[100]">
      {isAdmin && <AdminRibbon />}
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-teal-400 hover:text-teal-300 transition-colors">
            <span className="flex items-baseline gap-2">
              Celebrity Brands
              <span className="text-sm font-normal text-gray-500">by Rob Gabel</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link 
              to="/explore" 
              className="text-gray-300 hover:text-gray-100 transition-colors"
            >
              Explore
            </Link>
            <Link 
              to="/suggest-brand" 
              className="text-gray-300 hover:text-gray-100 transition-colors"
            >
              Suggest a Brand
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