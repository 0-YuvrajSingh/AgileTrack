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

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      login(response.data.token, response.data.refreshToken, response.data.user);
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Invalid credentials. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow grid md:grid-cols-2 min-h-[calc(100vh-56px)]">
      <BrandPanel
        heading="Welcome back to your pipeline."
        sub="Pick up exactly where your team left off."
      />

      <div className="flex items-center justify-center bg-cf-bgLight py-12 px-6">
        <div className="w-full max-w-sm animate-fadeUp">
          <h2 className="text-2xl font-bold text-cf-textDark tracking-tight">Log in to AgileTrack</h2>
          <p className="mt-1 text-sm text-cf-textMuted mb-8">Enterprise workspace coordination portal</p>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button
              type="submit"
              fullWidth
              className="mt-4 font-semibold"
              disabled={loading}
            >
              {loading ? 'Authenticating…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-cf-textMuted">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-cf-orange font-medium hover:underline">
              Create an account
            </Link>
          </div>

          <div className="mt-6 p-3 bg-cf-bgLight rounded-lg border border-cf-border">
            <p className="text-[11px] text-cf-textMuted text-center">
              Demo account: <span className="font-medium text-cf-textDark">demo@agiletrack.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
