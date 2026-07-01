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
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">{message}</p>
            <div className="flex justify-end gap-3 pt-5 border-t border-zinc-800">
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
