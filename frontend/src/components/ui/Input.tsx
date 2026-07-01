import React, { useId, forwardRef } from 'react';
import { motion } from 'framer-motion';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : generatedId);
    
    return (
      <div className="w-full mb-4">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <motion.div
            initial={false}
            animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
        >
            <input
            ref={ref}
            id={inputId}
            className={`w-full px-4 py-2.5 bg-white border rounded-md placeholder-slate-400 text-slate-900 focus:outline-none shadow-sm transition-all ${
                error 
                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                : 'border-slate-300 hover:border-slate-400 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/20'
            } ${className}`}
            {...props}
            />
        </motion.div>
        {error && <p className="mt-1.5 text-sm text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
