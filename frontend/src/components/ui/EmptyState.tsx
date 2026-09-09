import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-cf-border rounded bg-cf-bgLight/50">
      <div className="bg-white p-3 rounded-full border border-cf-border shadow-sm mb-4">
        <Icon className="text-cf-textMuted" size={24} />
      </div>
      <h3 className="text-cf-textDark font-bold text-sm mb-1">{title}</h3>
      <p className="text-xs text-cf-textMuted mb-4 max-w-xs mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
