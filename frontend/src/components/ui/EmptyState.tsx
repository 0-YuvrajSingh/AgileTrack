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
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-stripe-border rounded-lg shadow-sm">
            {icon && <div className="mb-4 text-stripe-textLight">{icon}</div>}
            <h3 className="text-lg font-medium text-stripe-textDark mb-2">{title}</h3>
            <p className="text-sm text-stripe-textLight mb-6 max-w-md">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>{actionLabel}</Button>
            )}
        </div>
    );
};
