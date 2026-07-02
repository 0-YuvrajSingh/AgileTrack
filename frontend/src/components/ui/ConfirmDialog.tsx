import React from 'react';
import { Card, CardBody, CardFooter } from './Card';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardBody className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full flex-shrink-0 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-cf-bgLight text-cf-orange'}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-cf-textDark text-sm">{title}</h3>
              <p className="text-xs text-cf-textMuted mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
        </CardBody>
        <CardFooter className="flex justify-end gap-2 border-t border-cf-border mt-2 pt-3 pb-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button 
            size="sm" 
            onClick={onConfirm} 
            className={isDestructive ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}
          >
            {confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
