import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Spinner } from './Spinner';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'children'> {
  children?: React.ReactNode;
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
  const baseStyle = "inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white relative overflow-hidden";
  
  const variants = {
    primary: "bg-[#635BFF] text-white hover:bg-[#5449e5] border border-[#5449e5] focus:ring-[#635BFF]",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200 shadow-sm",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-red-200 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-200",
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.96 }}
      className={`${baseStyle} ${variants[variant]} ${isLoading ? 'opacity-80 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Invisible children placeholder to maintain exact width when loading */}
      <span className={`inline-flex items-center gap-2 ${isLoading ? 'invisible' : 'visible'}`}>
        {children}
      </span>
      
      {/* Absolute positioned spinner in the center */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="h-5 w-5" />
        </div>
      )}
    </motion.button>
  );
};
