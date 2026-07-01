import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        success: 'bg-green-950 text-green-400 border-green-900',
        warning: 'bg-yellow-950 text-yellow-400 border-yellow-900',
        error: 'bg-red-950 text-red-400 border-red-900',
        info: 'bg-orange-950 text-orange-400 border-orange-900',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
