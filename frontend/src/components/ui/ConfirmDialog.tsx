import React from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white rounded-lg shadow-stripe-hover w-full max-w-md overflow-hidden animate-[slideUp_0.2s_ease-out]">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-stripe-textDark mb-2">{title}</h2>
                    <p className="text-sm text-stripe-textLight">{message}</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-stripe-border">
                    <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button 
                        variant={isDestructive ? 'danger' : 'primary'} 
                        onClick={onConfirm} 
                        isLoading={isLoading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};
