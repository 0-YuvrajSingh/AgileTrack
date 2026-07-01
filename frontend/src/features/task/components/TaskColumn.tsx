import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface TaskColumnProps {
    status: string;
    children: React.ReactNode;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({ status, children }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: status,
    });

    return (
        <div 
            ref={setNodeRef}
            className={`min-w-[320px] max-w-[320px] border rounded-xl flex flex-col shadow-sm transition-colors ${
                isOver ? 'bg-orange-500/10 border-orange-500/50' : 'bg-zinc-900 border-zinc-800'
            }`}
        >
            <header className={`p-4 border-b flex items-center justify-between rounded-t-xl ${
                isOver ? 'border-orange-500/50 bg-orange-500/20' : 'border-zinc-800 bg-zinc-950'
            }`}>
                <div>
                    <strong className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                        {status.replace('_', ' ')}
                    </strong>
                </div>
            </header>
            <div className="p-3 flex flex-col gap-3 min-h-[150px]">
                {children}
            </div>
        </div>
    );
};
