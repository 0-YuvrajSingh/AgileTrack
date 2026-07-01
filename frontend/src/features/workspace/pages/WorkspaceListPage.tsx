import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
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
        <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-stripe-textDark">Workspaces</h1>
                <Button onClick={() => setIsModalOpen(true)}>+ New Workspace</Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12 text-stripe-textLight">Loading workspaces...</div>
            ) : error ? (
                <div className="rounded-md border border-red-100 bg-red-50 p-4 text-sm text-stripe-error">
                    {parseApiError(error, 'Failed to load workspaces')}
                </div>
            ) : workspaces && workspaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {workspaces.map(ws => (
                        <Card key={ws.id} onClick={() => navigate(`/workspaces/${ws.id}`)}>
                            <h3 className="font-semibold text-stripe-textDark text-lg mb-1">{ws.name}</h3>
                            <p className="text-sm text-stripe-textLight mb-4 line-clamp-2">{ws.description}</p>
                            <div className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                                ID: {ws.id.substring(0, 8)}...
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-stripe-border rounded-lg p-12 text-center">
                    <h3 className="text-lg font-medium text-stripe-textDark mb-2">No workspaces found</h3>
                    <p className="text-stripe-textLight mb-6">Create your first workspace to get started.</p>
                    <Button onClick={() => setIsModalOpen(true)}>+ Create Workspace</Button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-stripe-hover animate-[fadeIn_0.2s_ease-out]">
                        <h2 className="text-xl font-bold mb-4 text-stripe-textDark">Create Workspace</h2>
                        <form onSubmit={handleCreate}>
                            <Input 
                                label="Workspace Name" 
                                value={newWsName} 
                                onChange={e => setNewWsName(e.target.value)} 
                                required 
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
