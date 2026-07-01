import React, { useId, forwardRef } from 'react';

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
          <label htmlFor={inputId} className="block text-sm font-medium text-stripe-textDark mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:shadow-stripe-focus transition-shadow ${
            error ? 'border-stripe-error' : 'border-stripe-border focus:border-stripe-primary'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-stripe-error">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
