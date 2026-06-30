import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import { projectService } from '../../project/services/projectService';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { WorkspaceSettingsModal } from '../components/WorkspaceSettingsModal';
import { ProjectSettingsModal } from '../../project/components/ProjectSettingsModal';
import type { Project } from '../../project/types/project.types';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

export const WorkspaceDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');

    const { data: workspace, isLoading: wsLoading } = useQuery({
        queryKey: ['workspace', id],
        queryFn: () => workspaceService.getById(id!),
        enabled: !!id
    });

    const { data: projects, isLoading: projLoading } = useQuery({
        queryKey: ['projects', id],
        queryFn: () => projectService.getByWorkspaceId(id!),
        enabled: !!id
    });

    const createMutation = useMutation({
        mutationFn: (payload: { name: string; description: string }) => projectService.create(id!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', id] });
            setIsModalOpen(false);
            setNewProjectName('');
            setNewProjectDesc('');
            toast.success('Project created');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to create project'))
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({ name: newProjectName, description: newProjectDesc });
    };

    if (wsLoading) return <div className="p-12 text-center text-stripe-textLight">Loading workspace...</div>;
    if (!workspace) return <div className="p-12 text-center text-stripe-textLight">Workspace not found.</div>;

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 text-xs px-0">
                        &larr; Back to Workspaces
                    </Button>
                    <h1 className="text-2xl font-bold text-stripe-textDark">{workspace.name}</h1>
                    <p className="text-sm text-stripe-textLight mt-1">{workspace.description}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setIsSettingsModalOpen(true)}>Settings</Button>
                    <Button variant="secondary" onClick={() => setIsInviteModalOpen(true)}>Invite Team</Button>
                    <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>
                </div>
            </div>

            <h2 className="text-lg font-semibold text-stripe-textDark mb-4">Projects</h2>
            
            {projLoading ? (
                <div className="text-stripe-textLight text-sm">Loading projects...</div>
            ) : projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                        <Card key={p.id} onClick={() => navigate(`/workspaces/${id}/projects/${p.id}/board`)}>
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-stripe-textDark text-lg mb-1">{p.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{p.status}</span>
                                    <button 
                                        className="text-gray-400 hover:text-stripe-primary transition-colors p-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProject(p);
                                        }}
                                        title="Project Settings"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-stripe-textLight mb-4 line-clamp-2">{p.description}</p>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-stripe-border rounded-lg p-8 text-center text-stripe-textLight">
                    No projects found in this workspace. Create one to get started.
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-stripe-hover animate-[fadeIn_0.2s_ease-out]">
                        <h2 className="text-xl font-bold mb-4 text-stripe-textDark">Create Project</h2>
                        <form onSubmit={handleCreate}>
                            <Input 
                                label="Project Name" 
                                value={newProjectName} 
                                onChange={e => setNewProjectName(e.target.value)} 
                                required 
                                autoFocus
                            />
                            <Input 
                                label="Description (optional)" 
                                value={newProjectDesc} 
                                onChange={e => setNewProjectDesc(e.target.value)} 
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <InviteMemberModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                workspaceId={id!} 
            />

            <WorkspaceSettingsModal 
                isOpen={isSettingsModalOpen} 
                onClose={() => setIsSettingsModalOpen(false)} 
                workspace={workspace} 
            />

            <ProjectSettingsModal 
                isOpen={!!selectedProject} 
                onClose={() => setSelectedProject(null)} 
                workspaceId={id!} 
                project={selectedProject} 
            />
        </div>
    );
};
