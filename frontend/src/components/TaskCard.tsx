// @ts-nocheck
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import styles from './TaskCard.module.css';

const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const TaskCard = ({ task, members, onStatusChange, onDelete, onAssign }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleAssign = (e) => {
        const assigneeId = e.target.value;
        onAssign(task.id, assigneeId);
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
    const assignee = members?.find(m => m.user.id === task.assigneeId);

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
                <p>Assignee: {assignee ? assignee.user.email : 'Unassigned'}</p>
                {task.deadline && <p>Deadline: {new Date(task.deadline).toLocaleDateString()}</p>}
            </div>

            <div className={styles.actions}>
                <select 
                    value={task.status} 
                    onChange={(event) => onStatusChange(task.id, event.target.value)} 
                    className={styles.statusSelect}
                    title="Change Status"
                >
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                
                <select 
                    value={task.assigneeId || ''} 
                    onChange={handleAssign} 
                    className={styles.statusSelect}
                    title="Assign to Member"
                >
                    <option value="">Unassigned</option>
                    {members?.map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                            {member.user.email}
                        </option>
                    ))}
                </select>

                <button type="button" onClick={() => onDelete(task.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} aria-label="Delete task">
                    <Trash2 size={15} />
                </button>
            </div>
        </article>
    );
};

