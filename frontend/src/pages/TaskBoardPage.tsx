// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../api/axios';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskCard } from '../components/TaskCard';
import styles from './TaskBoard.module.css';

const columns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const TaskBoardPage = () => {
    const { workspaceId, projectId } = useParams();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [error, setError] = useState('');
    const [dragOverColumn, setDragOverColumn] = useState('');

    const taskUrl = `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

    useEffect(() => {
        const fetchBoardData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [tasksRes, membersRes] = await Promise.all([
                    api.get(taskUrl),
                    api.get(`/workspaces/${workspaceId}/members`)
                ]);
                setTasks(tasksRes.data || []);
                setMembers(membersRes.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to load board data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchBoardData();
    }, [taskUrl, workspaceId]);

    const groupedTasks = useMemo(() => {
        return columns.reduce((groups, status) => {
            groups[status] = tasks.filter((task) => task.status === status);
            return groups;
        }, {});
    }, [tasks]);

    const addTask = (task) => setTasks((current) => [task, ...current]);

    const updateStatus = async (taskId, status) => {
        // Optimistic update
        setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status } : task));
        try {
            const response = await api.patch(`${taskUrl}/${taskId}/status`, { status });
            // Confirm with server response
            setTasks((current) => current.map((task) => task.id === taskId ? response.data : task));
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update task status.');
            // Ideally we'd revert the optimistic update here on failure
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await api.delete(`${taskUrl}/${taskId}`);
            setTasks((current) => current.filter((task) => task.id !== taskId));
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to delete task.');
        }
    };

    const assignTask = async (taskId, assigneeId) => {
        try {
            const response = await api.put(`${taskUrl}/${taskId}/assignee`, { assigneeId });
            setTasks((current) => current.map((task) => task.id === taskId ? response.data : task));
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to assign task.');
        }
    };

    const handleDragOver = (e, status) => {
        e.preventDefault();
        if (dragOverColumn !== status) {
            setDragOverColumn(status);
        }
    };

    const handleDragLeave = () => {
        setDragOverColumn('');
    };

    const handleDrop = (e, status) => {
        e.preventDefault();
        setDragOverColumn('');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== status) {
                updateStatus(taskId, status);
            }
        }
    };

    return (
        <main className={styles.boardContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button type="button" onClick={() => navigate(`/workspaces/${workspaceId}`)} className={styles.backBtn} aria-label="Back to workspace">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className={styles.headerTitle}>Task Board</h2>
                        <p className={styles.headerSubtitle}>Track work by status.</p>
                    </div>
                </div>
                <button type="button" onClick={() => setIsCreateOpen(true)} className={styles.createBtn}>
                    <Plus size={17} />
                    New Task
                </button>
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {isLoading && <div className={styles.stateMessage}>Loading board data...</div>}

            {!isLoading && (
                <div className={styles.boardGrid}>
                    {columns.map((status) => (
                        <section 
                            key={status} 
                            className={`${styles.column} ${dragOverColumn === status ? styles.dragOver : ''}`}
                            onDragOver={(e) => handleDragOver(e, status)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            <div className={styles.columnHeader}>
                                <h3 className={styles.columnTitle}>{status.replace('_', ' ')}</h3>
                                <span className={styles.columnCount}>{groupedTasks[status].length}</span>
                            </div>
                            <div className={styles.columnContent}>
                                {groupedTasks[status].map((task) => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        members={members}
                                        onStatusChange={updateStatus} 
                                        onDelete={deleteTask} 
                                        onAssign={assignTask} 
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {isCreateOpen && <CreateTaskModal workspaceId={workspaceId} projectId={projectId} members={members} onClose={() => setIsCreateOpen(false)} onCreated={addTask} />}
        </main>
    );
};


