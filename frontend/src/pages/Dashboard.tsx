// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus } from 'lucide-react';
import { api } from '../api/axios';
import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
    const [workspaces, setWorkspaces] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWorkspaces = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await api.get('/workspaces');
                setWorkspaces(response.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to load workspaces.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    const addWorkspace = (workspace) => {
        setWorkspaces((current) => [workspace, ...current]);
    };

    return (
        <main className={styles.dashboardContainer}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.headerTitle}>Workspaces</h2>
                    <p className={styles.headerSubtitle}>Choose a workspace to view its projects.</p>
                </div>
                <button type="button" onClick={() => setIsCreateOpen(true)} className={styles.createBtn}>
                    <Plus size={17} />
                    New Workspace
                </button>
            </div>

            {isLoading && <div className={styles.stateMessage}>Loading workspaces...</div>}
            {!isLoading && error && <div className={styles.errorMessage}>{error}</div>}

            {!isLoading && !error && workspaces.length === 0 && (
                <div className={styles.emptyState}>
                    <h3>No workspaces yet</h3>
                    <p>Create a workspace to start organizing projects.</p>
                </div>
            )}

            {!isLoading && !error && workspaces.length > 0 && (
                <div className={styles.grid}>
                    {workspaces.map((workspace, index) => (
                        <button 
                            key={workspace.id} 
                            type="button" 
                            onClick={() => navigate(`/workspaces/${workspace.id}`)} 
                            className={`${styles.card} animate-slide-up`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>
                                    <Folder size={24} />
                                </div>
                                <span className={styles.cardDate}>
                                    {workspace.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : 'New'}
                                </span>
                            </div>
                            <h3 className={styles.cardTitle}>{workspace.name}</h3>
                            <p className={styles.cardDescription}>{workspace.description || 'No description provided.'}</p>
                        </button>
                    ))}
                </div>
            )}

            {isCreateOpen && <CreateWorkspaceModal onClose={() => setIsCreateOpen(false)} onCreated={addWorkspace} />}
        </main>
    );
};

