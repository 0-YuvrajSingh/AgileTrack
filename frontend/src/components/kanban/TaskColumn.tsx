import React from 'react';

interface TaskColumnProps {
    title: string;
    status: string;
    children: React.ReactNode;
    onDrop: (e: React.DragEvent, status: string) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({ title, status, children, onDrop }) => {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); 
        e.currentTarget.classList.add('bg-slate-200/50');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-slate-200/50');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-slate-200/50');
        onDrop(e, status);
    };

    return (
        <div 
            className="flex-shrink-0 w-[85vw] md:w-[320px] bg-slate-100/50 rounded-xl p-4 flex flex-col h-full border border-slate-200/50 transition-colors snap-center"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <h3 className="font-semibold text-sm text-slate-700 mb-4 tracking-tight flex items-center justify-between uppercase">
                {title}
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{React.Children.count(children)}</span>
            </h3>
            <div className="flex-1 overflow-y-auto min-h-[150px] scrollbar-hide">
                {children}
            </div>
        </div>
    );
};
