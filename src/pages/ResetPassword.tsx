import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { GlobalNav } from '../components/GlobalNav';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  };

  const passwordStrength = getPasswordStrength(password);
  const isPasswordValid = passwordStrength.score >= 3 && password.length >= 8;

  useEffect(() => {
    // Check for password reset tokens in URL
    const checkSession = async () => {
      try {
        // First check for access_token and refresh_token in URL params
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        const code = searchParams.get('code');
        
        // Handle different auth flow types
        if (type === 'recovery' && (accessToken && refreshToken)) {
          // Direct token approach
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError) {
            console.error('Session set error:', sessionError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsValidToken(false);
          } else {
            setIsValidToken(true);
          }
        } else if (code) {
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsValidToken(false);
          } else {
            setIsValidToken(true);
          }
        } else {
          // Check if we already have a valid session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session error:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsValidToken(false);
          } else if (session) {
            setIsValidToken(true);
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsValidToken(false);
          }
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Invalid or expired reset link. Please request a new password reset.');
        setIsValidToken(false);
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long and include uppercase, lowercase, and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Password update error:', err);
      
      if (err.message.includes('New password should be different')) {
        setError('Your new password must be different from your current password.');
      } else if (err.message.includes('Password should be at least')) {
        setError('Password must be at least 6 characters long.');
      } else if (err.message.includes('Unable to validate email address')) {
        setError('Invalid or expired reset link. Please request a new password reset.');
      } else {
        setError(err.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Validating reset link...</p>
        </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-100 mb-2">Invalid Reset Link</h1>
            <p className="text-gray-400 mb-6">
            {error || 'This password reset link is invalid or has expired.'}
          </p>
          <Button
            onClick={() => navigate('/forgot-password')}
            className="w-full"
          >
            Request New Reset Link
          </Button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-100 mb-2">Password Updated!</h1>
            <p className="text-gray-400 mb-6">
            Your password has been successfully updated. You'll be redirected to the login page shortly.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Go to Login
          </Button>
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
          <Lock className="w-12 h-12 text-teal-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2 text-gray-100">Reset Password</h1>
          <p className="text-gray-400">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-800 text-red-200 p-4 rounded-lg mb-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-700 text-gray-200 placeholder-gray-400"
                placeholder="Enter your new password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {password && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-400">Password strength:</div>
                <div className="space-y-1">
                  <div className={`text-xs ${passwordStrength.checks.length ? 'text-green-400' : 'text-red-400'}`}>
                    ✓ At least 8 characters {passwordStrength.checks.length ? '✓' : '✗'}
                  </div>
                  <div className={`text-xs ${passwordStrength.checks.uppercase ? 'text-green-400' : 'text-red-400'}`}>
                    ✓ Uppercase letter {passwordStrength.checks.uppercase ? '✓' : '✗'}
                  </div>
                  <div className={`text-xs ${passwordStrength.checks.lowercase ? 'text-green-400' : 'text-red-400'}`}>
                    ✓ Lowercase letter {passwordStrength.checks.lowercase ? '✓' : '✗'}
                  </div>
                  <div className={`text-xs ${passwordStrength.checks.number ? 'text-green-400' : 'text-red-400'}`}>
                    ✓ Number {passwordStrength.checks.number ? '✓' : '✗'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-700 text-gray-200 placeholder-gray-400"
                placeholder="Confirm your new password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {confirmPassword && password !== confirmPassword && (
              <div className="mt-1 text-xs text-red-400">
                Passwords do not match
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            isLoading={isLoading} 
            className="w-full"
            disabled={!isPasswordValid || password !== confirmPassword}
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Remember your password?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-teal-400 hover:text-teal-300 font-medium"
            >
              Back to Login
            </button>
          </p>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}