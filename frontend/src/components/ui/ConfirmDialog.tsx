import React from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

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
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title} closeOnOutsideClick={!isLoading}>
            <p className="text-sm text-stripe-textLight mb-6">{message}</p>
            <div className="flex justify-end gap-3 pt-4 border-t border-stripe-border">
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
        </Modal>
    );
};
