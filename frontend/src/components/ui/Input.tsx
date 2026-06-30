import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full mb-4">
      <label className="block text-sm font-medium text-stripe-textDark mb-1">
        {label}
      </label>
      <input
        className={`w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:shadow-stripe-focus transition-shadow ${
          error ? 'border-stripe-error' : 'border-stripe-border focus:border-stripe-primary'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-stripe-error">{error}</p>}
    </div>
  );
};
