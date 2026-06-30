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
            className={`min-w-[320px] max-w-[320px] border rounded-lg flex flex-col shadow-stripe transition-colors ${
                isOver ? 'bg-indigo-50 border-stripe-primary' : 'bg-stripe-bg border-stripe-border'
            }`}
        >
            <header className={`p-4 border-b flex items-center justify-between rounded-t-lg ${
                isOver ? 'border-stripe-primary bg-indigo-100' : 'border-stripe-border bg-stripe-surface'
            }`}>
                <div>
                    <strong className="text-sm font-semibold text-stripe-textDark uppercase tracking-wider">
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
