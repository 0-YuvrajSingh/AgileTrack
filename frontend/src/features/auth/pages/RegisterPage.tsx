import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

export const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = await authService.register({ email, password });
            login(data);
            toast.success('Account created successfully!');
            navigate('/dashboard');
        } catch (err: any) {
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
                    <form onSubmit={handleSubmit}>
                        <Input 
                            label="Email address" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                        <Input 
                            label="Password" 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
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
