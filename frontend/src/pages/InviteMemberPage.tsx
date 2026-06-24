// @ts-nocheck
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { api } from '../api/axios';
import styles from './InviteMemberPage.module.css';

export const InviteMemberPage = () => {
    const { id: workspaceId } = useParams();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('MEMBER');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            await api.post(`/workspaces/${workspaceId}/members`, { email, role });
            setSuccess('Member invited successfully.');
            setEmail('');
            setRole('MEMBER');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to invite member.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.header}>
                <button type="button" onClick={() => navigate(`/workspaces/${workspaceId}`)} className={styles.backBtn} aria-label="Back to workspace">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h2 className={styles.headerTitle}>Invite Member</h2>
                    <p className={styles.headerSubtitle}>Add an existing user to this workspace.</p>
                </div>
            </div>

            <section className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardIcon}>
                        <UserPlus size={24} />
                    </div>
                    <h3 className={styles.cardTitle}>Member details</h3>
                </div>

                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>Email Address</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.input} placeholder="colleague@example.com" />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="role" className={styles.label}>Role</label>
                        <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className={styles.select}>
                            <option value="MEMBER">Member (Can create and edit tasks)</option>
                            <option value="VIEWER">Viewer (Read-only access)</option>
                            <option value="OWNER">Owner (Full administrative access)</option>
                        </select>
                    </div>

                    <button type="submit" disabled={isLoading || !email.trim()} className={styles.submitBtn}>
                        {isLoading ? 'Inviting...' : 'Send Invitation'}
                    </button>
                </form>
            </section>
        </main>
    );
};

