import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GlobalNav } from '../components/GlobalNav';
import { useAuthStore } from '../stores/authStore';
import { Info } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.message === 'Invalid login credentials' || err.message.includes('invalid_credentials')) {
        setError('The email or password you entered is incorrect. Please check your credentials and try again.');
        setShowHelp(true);
      } else if (err.message.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (err.message.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a few minutes before trying again.');
      } else if (err.message.includes('Network error') || err.message.includes('Failed to fetch')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
      
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <GlobalNav />
      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
            <h1 className="text-4xl font-bold mb-8 text-center text-gray-100">Login</h1>
            
            {error && (
              <ErrorMessage message={error} className="mb-4">
                {showHelp && (
                  <div className="mt-3 text-sm">
                    <p className="mb-2">Having trouble logging in?</p>
                    <ul className="list-disc list-inside space-y-1 text-red-200">
                      <li>Double-check your email address for typos</li>
                      <li>Make sure your password is correct (passwords are case-sensitive)</li>
                      <li>If you don't have an account, <Link to="/signup" className="underline hover:no-underline text-teal-400 hover:text-teal-300">sign up here</Link></li>
                    </ul>
                  </div>
                )}
              </ErrorMessage>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full">
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
                <p className="text-center text-gray-400">
                  <Link to="/forgot-password" className="text-teal-400 hover:text-teal-300 font-medium">
                    Forgot your password?
                  </Link>
                </p>

                <p className="text-center text-gray-400">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-teal-400 hover:text-teal-300 font-medium">
                    Sign up
                  </Link>
                </p>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">New to the platform?</p>
                    <p>Create an account to save your favorite brands, set goals, and get personalized recommendations.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}