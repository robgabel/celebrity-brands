import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GlobalNav } from '../components/GlobalNav';
import { Info, CheckCircle, Mail, ArrowLeft } from 'lucide-react';

export function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  
  const { signUp } = useAuthStore();
  const navigate = useNavigate();

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long and include uppercase, lowercase, and numbers.');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, { firstName, lastName, company });
      setIsEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="w-full max-w-md">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-100 mb-2">Check Your Email</h1>
              <p className="text-gray-300 mb-6">
                We've sent a verification link to <strong>{email}</strong>
              </p>
              
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-200 text-left">
                    <p className="font-medium mb-1">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Check your email inbox (and spam folder)</li>
                      <li>Click the verification link in the email</li>
                      <li>Return to sign in with your new account</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <Link to="/login">
                  <Button className="w-full">
                    Go to Sign In
                  </Button>
                </Link>
                
                <button
                  onClick={() => {
                    setIsEmailSent(false);
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign Up
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <GlobalNav />
      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
            <h1 className="text-4xl font-bold mb-8 text-center text-gray-100">Sign Up</h1>
            
            {error && <ErrorMessage message={error} />}
            
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
                
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
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !isPasswordValid || password !== confirmPassword}
                className="w-full"
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-md">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-1">Email Verification Required</p>
                  <p>After signing up, you'll need to verify your email address before you can sign in.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}