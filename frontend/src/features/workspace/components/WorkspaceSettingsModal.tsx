import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import type { Workspace } from '../types/workspace.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspace: Workspace;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
    isOpen,
    onClose,
    workspace
}) => {
    if (!isOpen) return null;

    return (
        <WorkspaceSettingsModalContent
            key={workspace.id}
            onClose={onClose}
            workspace={workspace}
        />
    );
};

const WorkspaceSettingsModalContent: React.FC<Omit<WorkspaceSettingsModalProps, 'isOpen'>> = ({
    onClose,
    workspace
}) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [name, setName] = useState(workspace.name);
    const [description, setDescription] = useState(workspace.description || '');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const updateMutation = useMutation({
        mutationFn: () => workspaceService.update(workspace.id, { name, description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            toast.success('Workspace updated');
            onClose();
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to update workspace'))
    });

    const deleteMutation = useMutation({
        mutationFn: () => workspaceService.delete(workspace.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            toast.success('Workspace deleted');
            navigate('/dashboard');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to delete workspace'))
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Workspace Settings" closeOnOutsideClick={false}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-6">
                    <Input 
                        label="Workspace Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <Input 
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-stripe-border mt-4">
                    <Button 
                        type="button" 
                        variant="danger" 
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        isLoading={deleteMutation.isPending}
                    >
                        Delete
                    </Button>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={updateMutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={updateMutation.isPending}>
                            Save
                        </Button>
                    </div>
                </div>
            </form>
            <ConfirmDialog
                isOpen={isDeleteConfirmOpen}
                title="Delete workspace"
                message="This workspace and its projects will be permanently removed."
                confirmLabel="Delete"
                isDestructive
                isLoading={deleteMutation.isPending}
                onCancel={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => deleteMutation.mutate()}
            />
        </Modal>
    );
};
