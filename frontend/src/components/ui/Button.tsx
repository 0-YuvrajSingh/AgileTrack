import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyle = "inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-stripe-primary text-white hover:bg-stripe-primaryHover shadow-stripe hover:shadow-stripe-hover focus:ring-stripe-primary",
    secondary: "bg-white text-stripe-textDark border border-stripe-border hover:bg-gray-50 shadow-sm focus:ring-gray-200",
    danger: "bg-white text-stripe-error border border-stripe-error hover:bg-red-50 focus:ring-red-500",
    ghost: "bg-transparent text-stripe-textLight hover:text-stripe-textDark hover:bg-gray-100 focus:ring-gray-200",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'Processing...' : children}
    </button>
  );
};
