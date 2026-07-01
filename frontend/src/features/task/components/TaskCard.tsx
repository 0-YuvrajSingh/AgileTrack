import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types/task.types';

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

    const setNodeRef = (node: HTMLElement | null) => {
        setDraggableNodeRef(node);
        setDroppableNodeRef(node);
    };

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    const priorityColors = {
        LOW: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        MEDIUM: 'bg-orange-950 text-orange-400 border-orange-900',
        HIGH: 'bg-yellow-950 text-yellow-400 border-yellow-900',
        URGENT: 'bg-red-950 text-red-400 border-red-900',
    };

    return (
        <article 
            ref={setNodeRef} 
            {...listeners} 
            {...attributes}
            onClick={onClick}
            style={style}
            className={`bg-zinc-950 border rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all ${
                isDragging ? 'border-orange-500/50 scale-105' : 'border-zinc-800 hover:border-orange-500/50'
            } ${isOver && !isDragging ? 'border-orange-500/50 bg-orange-500/10' : ''}`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                    {task.priority}
                </span>
            </div>
            <h3 className="font-semibold text-zinc-50 text-sm leading-snug">{task.title}</h3>
        </article>
    );
};
