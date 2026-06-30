import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow-stripe border border-stripe-border p-6 ${onClick ? 'cursor-pointer hover:shadow-stripe-hover transition-shadow duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
