import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import type { Workspace } from '../types/workspace.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white rounded-lg shadow-stripe-hover w-full max-w-md overflow-hidden animate-[slideUp_0.2s_ease-out]">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-stripe-textDark mb-4">Workspace Settings</h2>
                        <div className="space-y-4">
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
                    </div>
                    <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-t border-stripe-border">
                        <Button 
                            type="button" 
                            variant="danger" 
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            isLoading={deleteMutation.isPending}
                        >
                            Delete Workspace
                        </Button>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={updateMutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={updateMutation.isPending}>
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
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
        </div>
    );
};
