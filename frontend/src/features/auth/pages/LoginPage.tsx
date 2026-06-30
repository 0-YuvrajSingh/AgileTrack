import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { parseApiError } from '../../../lib/utils';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await authService.login({ email, password });
            login(res);
            navigate('/dashboard');
        } catch (err: any) {
            setError(parseApiError(err, 'Login failed'));
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
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-stripe-error rounded-md text-sm">{error}</div>}
                    
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
                                Continue
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
