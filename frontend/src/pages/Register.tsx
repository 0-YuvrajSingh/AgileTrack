import type React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, getApiErrorMessage } from '../api/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'react-hot-toast';
import type { AuthResponse } from '../types';
import { BrandPanel } from '../components/layout/BrandPanel';

export const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setConfirmError('');

    let valid = true;
    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email format');
      valid = false;
    }
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', { email, password });
      login(response.data.token, response.data.refreshToken, response.data.user);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Failed to register account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow grid md:grid-cols-2 min-h-[calc(100vh-56px)]">
      <BrandPanel
        heading="Every project, one clear board."
        sub="Create a workspace and see your team's work line up instantly."
      />

      <div className="flex items-center justify-center bg-cf-bgLight py-12 px-6">
        <div className="w-full max-w-sm animate-fadeUp">
          <h2 className="text-2xl font-bold text-cf-textDark tracking-tight">Create your account</h2>
          <p className="mt-1 text-sm text-cf-textMuted mb-8">Start tracking workflows in clean boards</p>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              placeholder="name@company.com"
              error={emailError}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              placeholder="Min. 8 characters"
              error={passwordError}
              required
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
              placeholder="Confirm password"
              error={confirmError}
              required
            />
            <Button
              type="submit"
              fullWidth
              className="mt-4 font-semibold"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-cf-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="text-cf-primary font-medium hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
