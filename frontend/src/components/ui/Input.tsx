import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full mb-4">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`w-full px-3 py-2 text-sm text-cf-textDark bg-white border rounded focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition duration-150 ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-cf-border'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
