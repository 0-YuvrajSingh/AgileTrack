import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cf-orange/40 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-cf-orange hover:bg-cf-orangeHover text-white border border-transparent',
    secondary: 'bg-white hover:bg-cf-bgLight text-cf-textDark border border-cf-border',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-transparent focus:ring-red-500/40',
    ghost: 'bg-transparent hover:bg-cf-bgLight text-cf-textMuted hover:text-cf-textDark border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
