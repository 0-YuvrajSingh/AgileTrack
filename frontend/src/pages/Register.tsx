import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, getApiErrorMessage } from '../api/axios';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { toast } from 'react-hot-toast';
import type { AuthResponse } from '../types';

export const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('All fields are required');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

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
    <div className="flex-grow flex items-center justify-center bg-cf-bgLight py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center bg-cf-navy text-white">
          <h2 className="text-xl font-bold tracking-tight">Create your Account</h2>
          <p className="mt-1 text-xs text-gray-300">Start tracking workflows in clean tables</p>
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
              placeholder="Min. 8 characters"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
            />
            <Button
              type="submit"
              fullWidth
              className="mt-4 font-semibold"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-cf-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="text-cf-orange font-medium hover:underline">
              Log In
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Register;
