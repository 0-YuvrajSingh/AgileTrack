import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../services/taskService';

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
    const { attributes, listeners, setNodeRef: setDraggableNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
    });

    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
        id: task.id,
        data: { task },
    });

    // Helper to merge refs
    const setNodeRef = (node: HTMLElement | null) => {
        setDraggableNodeRef(node);
        setDroppableNodeRef(node);
    };

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <article 
            ref={setNodeRef} 
            {...listeners} 
            {...attributes}
            onClick={onClick}
            style={style}
            className={`bg-stripe-surface border border-stripe-border rounded-md p-4 shadow-sm hover:shadow-stripe cursor-grab transition-all ${isDragging ? 'shadow-lg border-stripe-primary' : ''} ${isOver ? 'border-indigo-400 bg-indigo-50' : ''}`}
        >
            <div className="text-xs text-stripe-textLight mb-1">{task.priority}</div>
            <h3 className="font-medium text-stripe-textDark text-sm">{task.title}</h3>
        </article>
    );
};
