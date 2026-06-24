// @ts-nocheck
import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/axios';
import styles from './Modal.module.css';

export const CreateProjectModal = ({ workspaceId, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post(`/workspaces/${workspaceId}/projects`, { name, description });
            onCreated(response.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create project');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Create New Project</h2>
                    <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.form}>
                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.inputGroup}>
                            <label htmlFor="name" className={styles.label}>Project Name</label>
                            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={styles.input} placeholder="e.g. Website Redesign" autoFocus />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="description" className={styles.label}>Description (Optional)</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className={styles.textarea} placeholder="What is this project about?" rows={3} />
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={isLoading || !name.trim()} className={styles.submitBtn}>
                            {isLoading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
