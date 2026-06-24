// @ts-nocheck
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setIsLoading(true);

        try {
            await register(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Registration failed');
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
                    <h1 className={styles.brandTitle}>Create an account</h1>
                    <p className={styles.brandSubtitle}>Start managing your projects today.</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>Email Address</label>
                        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} placeholder="you@example.com" />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} placeholder="••••••••" />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                        <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={styles.input} placeholder="••••••••" />
                    </div>

                    <button type="submit" disabled={isLoading} className={styles.submitBtn}>
                        {isLoading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className={styles.linkText}>
                    Already have an account? <Link to="/login" className={styles.link}>Sign in</Link>
                </p>
            </div>
        </main>
    );
};
