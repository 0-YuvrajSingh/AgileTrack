import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import type { LoginRequest } from '../types/auth.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { parseApiError } from '../../../lib/utils';

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
        <div className="min-h-screen flex items-center justify-center bg-stripe-bg px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-stripe-textDark">Sign in to your account</h2>
                </div>
                
                <div className="bg-white rounded-xl shadow-stripe border border-stripe-border p-8">
                    {apiError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-stripe-error rounded-md text-sm">{apiError}</div>}
                    
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Input 
                            label="Email address" 
                            type="email" 
                            error={errors.email?.message}
                            {...register('email', { required: 'Email is required' })}
                        />
                        <Input 
                            label="Password" 
                            type="password" 
                            error={errors.password?.message}
                            {...register('password', { required: 'Password is required' })}
                        />
                        <div className="mt-6">
                            <Button type="submit" className="w-full" isLoading={isLoading}>
                                Continue
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
