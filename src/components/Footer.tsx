import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gradient-to-t from-gray-900 via-gray-800/90 to-gray-900 backdrop-blur-sm border-t border-gray-800/50 py-12 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-teal-400">Celebrity Brands</h2>
          <p className="text-gray-400 text-sm">
            Discover, follow, and invest in celebrity and creator owned brands
          </p>
          <div className="flex space-x-4 text-gray-400">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Explore Section */}
        <div>
          <h3 className="text-white font-semibold mb-4">Explore</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/explore" className="text-gray-400 hover:text-teal-400 transition-colors">
                All Brands
              </Link>
            </li>
            <li>
              <Link to="/explore" className="text-gray-400 hover:text-teal-400 transition-colors">
                Categories
              </Link>
            </li>
            <li>
              <Link to="/explore" className="text-gray-400 hover:text-teal-400 transition-colors">
                Trending Brands
              </Link>
            </li>
            <li>
              <Link to="/explore" className="text-gray-400 hover:text-teal-400 transition-colors">
                Founder Types
              </Link>
            </li>
          </ul>
        </div>

        {/* Account Section */}
        <div>
          <h3 className="text-white font-semibold mb-4">Account</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/login" className="text-gray-400 hover:text-teal-400 transition-colors">
                Sign In
              </Link>
            </li>
            <li>
              <Link to="/signup" className="text-gray-400 hover:text-teal-400 transition-colors">
                Create Account
              </Link>
            </li>
            <li>
              <Link to="/profile" className="text-gray-400 hover:text-teal-400 transition-colors">
                My Profile
              </Link>
            </li>
            <li>
              <Link to="/profile" className="text-gray-400 hover:text-teal-400 transition-colors">
                Favorites
              </Link>
            </li>
          </ul>
        </div>

        {/* Help Section */}
        <div>
          <h3 className="text-white font-semibold mb-4">Help</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/about" className="text-gray-400 hover:text-teal-400 transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/faq" className="text-gray-400 hover:text-teal-400 transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="text-gray-400 hover:text-teal-400 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-gray-400 hover:text-teal-400 transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800/50">
        <p className="text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Celebrity Brands. All rights reserved.
        </p>
      </div>
    </footer>
  );
}