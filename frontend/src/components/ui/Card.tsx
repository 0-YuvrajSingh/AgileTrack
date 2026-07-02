import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'bg-white border border-cf-border rounded shadow-cf-card overflow-hidden';
  const hoverStyle = hoverable ? 'transition-shadow duration-150 hover:shadow-md' : '';

  return (
    <div
      className={`${baseStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`px-5 py-4 border-b border-cf-border ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`px-5 py-4 border-t border-cf-border bg-cf-bgLight ${className}`} {...props}>
    {children}
  </div>
);
