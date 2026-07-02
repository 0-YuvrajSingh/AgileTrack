import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/axios';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { toast } from 'react-hot-toast';

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
      const response = await apiClient.post('/auth/login', { email, password });
      login(response.data.token, response.data.user);
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-cf-bgLight py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center bg-cf-navy text-white">
          <h2 className="text-xl font-bold tracking-tight">Log In to AgileTrack</h2>
          <p className="mt-1 text-xs text-gray-300">Enterprise workspace coordination portal</p>
        </CardHeader>
        <CardBody className="p-8">
          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
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
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-cf-textMuted">
            Don't have an account?{' '}
            <Link to="/register" className="text-cf-orange font-medium hover:underline">
              Create an account
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Login;
