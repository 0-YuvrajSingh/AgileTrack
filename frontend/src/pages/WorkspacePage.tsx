// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, FolderKanban, Plus, UserPlus } from 'lucide-react';
import { api } from '../api/axios';
import { CreateProjectModal } from '../components/CreateProjectModal';
import styles from './WorkspacePage.module.css';

export const WorkspacePage = () => {
    const { id: workspaceId } = useParams();
    const navigate = useNavigate();
    const [workspace, setWorkspace] = useState(null);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => {
        const fetchWorkspace = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [workspaceResponse, projectsResponse] = await Promise.all([
                    api.get(`/workspaces/${workspaceId}`),
                    api.get(`/workspaces/${workspaceId}/projects`),
                ]);
                setWorkspace(workspaceResponse.data);
                setProjects(projectsResponse.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to load this workspace.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkspace();
    }, [workspaceId]);

    const addProject = (project) => setProjects((current) => [project, ...current]);

    return (
        <main className={styles.workspaceContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button type="button" onClick={() => navigate('/dashboard')} className={styles.backBtn} aria-label="Back to dashboard">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className={styles.headerTitle}>{workspace?.name || 'Workspace'}</h2>
                        <p className={styles.headerSubtitle}>{workspace?.description || 'Projects in this workspace.'}</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button type="button" onClick={() => navigate(`/workspaces/${workspaceId}/invite`)} className={`${styles.actionBtn} ${styles.secondaryBtn}`}>
                        <UserPlus size={17} />
                        Invite
                    </button>
                    <button type="button" onClick={() => setIsCreateOpen(true)} className={`${styles.actionBtn} ${styles.primaryBtn}`}>
                        <Plus size={17} />
                        New Project
                    </button>
                </div>
            </div>

            {isLoading && <div className={styles.stateMessage}>Loading workspace...</div>}
            {!isLoading && error && <div className={styles.errorMessage}>{error}</div>}

            {!isLoading && !error && projects.length === 0 && (
                <div className={styles.emptyState}>
                    <FolderKanban className={styles.emptyIcon} size={48} />
                    <h4>No projects yet</h4>
                    <p>Create a project to start tracking tasks.</p>
                </div>
            )}

            {!isLoading && !error && projects.length > 0 && (
                <div className={styles.grid}>
                    {projects.map((project, index) => (
                        <button 
                            key={project.id} 
                            type="button" 
                            onClick={() => navigate(`/workspaces/${workspaceId}/projects/${project.id}`)} 
                            className={`${styles.card} animate-slide-up`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={styles.cardHeader}>
                                <h4 className={styles.cardTitle} title={project.name}>{project.name}</h4>
                                <span className={styles.statusBadge}>{project.status || 'PLANNING'}</span>
                            </div>
                            <p className={styles.cardDescription}>{project.description || 'No description provided.'}</p>
                            <div className={styles.cardFooter}>
                                <Clock size={14} />
                                {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Recently created'}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isCreateOpen && <CreateProjectModal workspaceId={workspaceId} onClose={() => setIsCreateOpen(false)} onCreated={addProject} />}
        </main>
    );
};

