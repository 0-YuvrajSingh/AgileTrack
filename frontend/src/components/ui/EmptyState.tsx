import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
    title, 
    description, 
    actionLabel, 
    onAction, 
    icon 
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-zinc-900/40 border border-zinc-800/60 rounded-2xl shadow-sm backdrop-blur-sm">
            {icon && <div className="mb-6 text-zinc-500 p-4 bg-zinc-800/50 rounded-full border border-zinc-700/50">{icon}</div>}
            <h3 className="text-xl font-bold text-zinc-100 mb-3">{title}</h3>
            <p className="text-base text-zinc-400 mb-8 max-w-md leading-relaxed">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} className="shadow-[0_0_15px_rgba(249,115,22,0.3)]">{actionLabel}</Button>
            )}
        </div>
    );
};
