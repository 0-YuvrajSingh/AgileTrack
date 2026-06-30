import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import type { Project } from '../types/project.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
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
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description || '');
        }
    }, [project]);

    const updateMutation = useMutation({
        mutationFn: () => projectService.update(workspaceId, project!.id, { name, description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
            toast.success('Project updated');
            onClose();
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to update project'))
    });

    const deleteMutation = useMutation({
        mutationFn: () => projectService.delete(workspaceId, project!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
            toast.success('Project deleted');
            onClose();
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to delete project'))
    });

    if (!isOpen || !project) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white rounded-lg shadow-stripe-hover w-full max-w-md overflow-hidden animate-[slideUp_0.2s_ease-out]">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-stripe-textDark mb-4">Edit Project</h2>
                        <div className="space-y-4">
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
                    </div>
                    <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-t border-stripe-border">
                        <Button 
                            type="button" 
                            variant="danger" 
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this project? All associated tasks will be lost.')) {
                                    deleteMutation.mutate();
                                }
                            }}
                            isLoading={deleteMutation.isPending}
                        >
                            Delete
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
        </div>
    );
};
