import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

export const WorkspaceListPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newWsName, setNewWsName] = useState('');

    const { data: workspaces, isLoading, error } = useQuery({
        queryKey: ['workspaces'],
        queryFn: workspaceService.getAll
    });

    const createMutation = useMutation({
        mutationFn: workspaceService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            setIsModalOpen(false);
            setNewWsName('');
            toast.success('Workspace created');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to create workspace'))
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({ name: newWsName, description: 'New workspace' });
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 relative">
            <div className="flex justify-between items-center mb-10 relative z-10">
                <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Your Workspaces</h1>
                <Button onClick={() => setIsModalOpen(true)}>+ New Workspace</Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12 text-zinc-500 animate-pulse">Loading workspaces...</div>
            ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 relative z-10">
                    {parseApiError(error, 'Failed to load workspaces')}
                </div>
            ) : workspaces && workspaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    {workspaces.map(ws => (
                        <Card key={ws.id} onClick={() => navigate(`/workspaces/${ws.id}`)} className="group">
                            <h3 className="font-bold text-zinc-50 text-xl mb-2 group-hover:text-orange-500 transition-colors">{ws.name}</h3>
                            <p className="text-sm text-zinc-400 mb-6 line-clamp-2 leading-relaxed">{ws.description}</p>
                            <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 mr-2 group-hover:bg-orange-500 transition-colors"></span>
                                ID: {ws.id.substring(0, 8)}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center relative z-10">
                    <h3 className="text-xl font-bold text-zinc-50 mb-3">No workspaces found</h3>
                    <p className="text-zinc-400 mb-8 max-w-sm mx-auto">Create your first workspace to start collaborating and managing projects with your team.</p>
                    <Button onClick={() => setIsModalOpen(true)}>+ Create Workspace</Button>
                </div>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title="Create Workspace"
            >
                <form onSubmit={handleCreate}>
                    <Input 
                        label="Workspace Name" 
                        value={newWsName} 
                        onChange={e => setNewWsName(e.target.value)} 
                        required 
                        autoFocus
                    />
                    <div className="flex justify-end gap-3 mt-8">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={createMutation.isPending}>Create Workspace</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
