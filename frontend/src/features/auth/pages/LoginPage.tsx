import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import type { LoginRequest } from '../types/auth.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { parseApiError } from '../../../lib/utils';
import { LandingHeader } from '../../landing/components/LandingHeader';
import { LayoutDashboard } from 'lucide-react';

export const LoginPage = () => {
    const [apiError, setApiError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();
    
    const { register, handleSubmit, formState: { errors } } = useForm<LoginRequest>();

    const onSubmit = async (data: LoginRequest) => {
        setIsLoading(true);
        setApiError('');
        try {
            const res = await authService.login(data);
            login(res);
            navigate('/dashboard');
        } catch (err: unknown) {
            setApiError(parseApiError(err, 'Login failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50">
            <LandingHeader />
            
            <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
                <div className="w-full max-w-md relative z-10">
                    <div className="text-center mb-10">
                        <div className="mx-auto w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                            <LayoutDashboard className="h-6 w-6 text-orange-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-zinc-50 tracking-tight">Sign in</h2>
                        <p className="text-zinc-400 mt-2 text-sm">Welcome back to AgileTrack.</p>
                    </div>
                    
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
                        {apiError && <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg text-sm">{apiError}</div>}
                        
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <Input 
                                label="Email address" 
                                type="email" 
                                error={errors.email?.message}
                                {...register('email', { required: 'Email is required' })}
                                placeholder="you@example.com"
                            />
                            <Input 
                                label="Password" 
                                type="password" 
                                error={errors.password?.message}
                                {...register('password', { required: 'Password is required' })}
                                placeholder="••••••••"
                            />
                            <div className="pt-2">
                                <Button type="submit" className="w-full py-3 text-sm font-semibold" isLoading={isLoading}>
                                    Sign In
                                </Button>
                            </div>
                        </form>
                        
                        <div className="mt-8 text-center text-sm border-t border-zinc-800 pt-6">
                            <span className="text-zinc-500">Don't have an account? </span>
                            <Link to="/register" className="text-orange-500 font-medium hover:text-orange-400 transition-colors">
                                Create one now
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
