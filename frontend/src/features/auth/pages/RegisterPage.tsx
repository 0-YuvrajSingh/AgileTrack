import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import type { RegisterRequest } from '../types/auth.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

export const RegisterPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterRequest>();

    const onSubmit = async (data: RegisterRequest) => {
        setIsLoading(true);
        try {
            const res = await authService.register(data);
            login(res);
            toast.success('Account created successfully!');
            navigate('/dashboard');
        } catch (err: unknown) {
            toast.error(parseApiError(err, 'Registration failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stripe-bg px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-stripe-textDark">Create your account</h2>
                </div>
                
                <div className="bg-white rounded-xl shadow-stripe border border-stripe-border p-8">
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
                            {...register('password', { 
                                required: 'Password is required',
                                minLength: { value: 6, message: 'Password must be at least 6 characters' }
                            })}
                        />
                        <div className="mt-6">
                            <Button type="submit" className="w-full" isLoading={isLoading}>
                                Create account
                            </Button>
                        </div>
                    </form>
                    <div className="mt-6 text-center text-sm">
                        <span className="text-stripe-textLight">Already have an account? </span>
                        <Link to="/login" className="text-stripe-primary font-medium hover:underline">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
