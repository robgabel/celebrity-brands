import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GlobalNav } from '../components/GlobalNav';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      if (err.message.includes('Email not found') || err.message.includes('User not found')) {
        setError('No account found with this email address. Please check your email or create a new account.');
      } else if (err.message.includes('Email rate limit exceeded')) {
        setError('Too many password reset requests. Please wait a few minutes before trying again.');
      } else if (err.message.includes('Network error') || err.message.includes('Failed to fetch')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-100 mb-2">Check Your Email</h1>
            <p className="text-gray-300">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200 text-left">
                <p className="font-medium mb-1">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the "Reset Password" link in the email</li>
                  <li>Create a new password</li>
                  <li>Sign in with your new password</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
              }}
              variant="secondary"
              className="w-full"
            >
              Send Another Email
            </Button>

            <Link
              to="/login"
              className="flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <GlobalNav />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-100">Forgot Password?</h1>
          <p className="text-gray-400">
            No worries! Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && <ErrorMessage message={error} className="mb-4" />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-700 text-gray-200 placeholder-gray-400"
              placeholder="Enter your email address"
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full">
            {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <Link
            to="/login"
            className="flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>

          <div className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-teal-400 hover:text-teal-300 font-medium">
              Sign up here
            </Link>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}