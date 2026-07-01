import React from 'react';

export const Badge: React.FC<{ variant: 'High' | 'Medium' | 'Low', children: React.ReactNode }> = ({ variant, children }) => {
    const colors = {
        High: 'bg-red-50 text-red-600 border-red-200',
        Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        Low: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-semibold border ${colors[variant]}`}>
            {children}
        </span>
    );
};
