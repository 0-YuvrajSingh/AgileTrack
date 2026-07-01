import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-6 ${onClick ? 'cursor-pointer hover:border-[#635BFF]/40 hover:shadow-md transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
