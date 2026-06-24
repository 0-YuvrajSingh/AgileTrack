// @ts-nocheck
import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/axios';
import styles from './Modal.module.css';

export const CreateTaskModal = ({ workspaceId, projectId, onClose, onCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [deadline, setDeadline] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const payload = {
                title,
                description,
                priority,
                deadline: deadline ? new Date(deadline).toISOString() : undefined
            };
            const response = await api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, payload);
            onCreated(response.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create task');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Create New Task</h2>
                    <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.form}>
                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.inputGroup}>
                            <label htmlFor="title" className={styles.label}>Task Title</label>
                            <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={styles.input} placeholder="What needs to be done?" autoFocus />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="description" className={styles.label}>Description (Optional)</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className={styles.textarea} placeholder="Add more details..." rows={3} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className={styles.inputGroup} style={{ flex: 1 }}>
                                <label htmlFor="priority" className={styles.label}>Priority</label>
                                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={styles.select}>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup} style={{ flex: 1 }}>
                                <label htmlFor="deadline" className={styles.label}>Deadline (Optional)</label>
                                <input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={styles.input} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={isLoading || !title.trim()} className={styles.submitBtn}>
                            {isLoading ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
