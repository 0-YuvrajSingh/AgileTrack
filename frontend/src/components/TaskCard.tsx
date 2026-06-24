// @ts-nocheck
import { useState } from 'react';
import { Trash2, UserRound } from 'lucide-react';
import styles from './TaskCard.module.css';

const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const TaskCard = ({ task, onStatusChange, onDelete, onAssign }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleAssign = () => {
        const assigneeId = window.prompt('Enter assignee user id', task.assigneeId || '');
        if (assigneeId) onAssign(task.id, assigneeId);
    };

    const handleDragStart = (e) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const priorityClass = task.priority === 'HIGH' ? styles.high : task.priority === 'MEDIUM' ? styles.medium : styles.low;

    return (
        <article 
            className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
            draggable="true"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className={styles.header}>
                <h4 className={styles.title}>{task.title}</h4>
                <span className={`${styles.priorityBadge} ${priorityClass}`}>
                    {task.priority || 'LOW'}
                </span>
            </div>

            <p className={styles.description}>{task.description || 'No description.'}</p>

            <div className={styles.meta}>
                <p>Assignee: {task.assigneeId || 'Unassigned'}</p>
                {task.deadline && <p>Deadline: {new Date(task.deadline).toLocaleDateString()}</p>}
            </div>

            <div className={styles.actions}>
                <select 
                    value={task.status} 
                    onChange={(event) => onStatusChange(task.id, event.target.value)} 
                    className={styles.statusSelect}
                >
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <button type="button" onClick={handleAssign} className={styles.actionBtn} aria-label="Assign task">
                    <UserRound size={15} />
                </button>
                <button type="button" onClick={() => onDelete(task.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} aria-label="Delete task">
                    <Trash2 size={15} />
                </button>
            </div>
        </article>
    );
};

