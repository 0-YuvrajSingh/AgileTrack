import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-zinc-900 rounded-xl border border-zinc-800 p-6 ${onClick ? 'cursor-pointer hover:border-orange-500/50 transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
