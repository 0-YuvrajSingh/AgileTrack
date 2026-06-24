// @ts-nocheck
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.brand}>
                    <div className={styles.brandIcon}>
                        <Briefcase size={24} />
                    </div>
                    <h1 className={styles.brandTitle}>Welcome back</h1>
                    <p className={styles.brandSubtitle}>Enter your details to access your account.</p>
                </div>

                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-md bg-blue-500 px-4 py-2.5 text-sm font-medium text-white disabled:bg-blue-300"
                    >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    Need an account?{' '}
                    <Link to="/register" className="font-medium text-blue-500">
                        Create one
                    </Link>
                </p>
            </section>
        </main>
    );
};

