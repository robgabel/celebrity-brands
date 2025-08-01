import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ErrorMessage } from './ErrorMessage';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      localStorage.removeItem('supabase.auth.token');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsOpen(false);
      window.location.href = '/';
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200 relative z-50"
        aria-label="User menu"
      >
        <User className="w-6 h-6 text-gray-200" />
      </button>

      {isOpen && (
        <div className="fixed right-4 mt-2 w-48 bg-gray-900 rounded-lg shadow-xl py-1 z-[100] border border-gray-800">
          <Link
            to="/profile"
            className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-800"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Profile Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-gray-200 hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      )}

      {error && (
        <ErrorMessage 
          message={error} 
          className="absolute right-0 mt-2 w-64 shadow-lg border border-red-800" 
        />
      )}
    </div>
  );
}