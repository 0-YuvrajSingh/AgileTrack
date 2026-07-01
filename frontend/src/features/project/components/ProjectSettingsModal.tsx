import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import type { Project } from '../types/project.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface ProjectSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    project: Project | null;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
    isOpen,
    onClose,
    workspaceId,
    project
}) => {
    if (!isOpen || !project) return null;

    return (
        <ProjectSettingsModalContent
            key={project.id}
            onClose={onClose}
            workspaceId={workspaceId}
            project={project}
        />
    );
};

const ProjectSettingsModalContent: React.FC<Omit<ProjectSettingsModalProps, 'isOpen'> & { project: Project }> = ({
    onClose,
    workspaceId,
    project
}) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const updateMutation = useMutation({
        mutationFn: () => projectService.update(workspaceId, project.id, { name, description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
            toast.success('Project updated');
            onClose();
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to update project'))
    });

    const deleteMutation = useMutation({
        mutationFn: () => projectService.delete(workspaceId, project.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
            toast.success('Project deleted');
            onClose();
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to delete project'))
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Edit Project" closeOnOutsideClick={false}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-6">
                    <Input 
                        label="Project Name"
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
                title="Delete project"
                message="All tasks in this project will be permanently removed."
                confirmLabel="Delete"
                isDestructive
                isLoading={deleteMutation.isPending}
                onCancel={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => deleteMutation.mutate()}
            />
        </Modal>
    );
};
