import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';

// Mock types
interface Workspace {
    id: string;
    name: string;
    members: { id: string, name: string }[];
}

export const WorkspaceHub = () => {
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                // Mock API call for now. In real app: const res = await apiClient.get('/workspaces');
                setTimeout(() => {
                    setWorkspaces([
                        { id: '1', name: 'Alpha Project', members: [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob' }] },
                        { id: '2', name: 'Beta Launch', members: [{ id: 'm3', name: 'Charlie' }] },
                        { id: '3', name: 'Marketing Campaign', members: [{ id: 'm1', name: 'Alice' }, { id: 'm4', name: 'Dave' }, { id: 'm5', name: 'Eve' }] }
                    ]);
                    setIsLoading(false);
                }, 800);
            } catch (error) {
                console.error(error);
                setIsLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    const openBoard = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/workspaces/${id}/board`);
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workspaces</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your project environments</p>
                </div>
                <Button>+ New Workspace</Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="h-48 flex flex-col justify-between">
                            <Skeleton className="h-6 w-2/3" />
                            <div className="flex justify-between items-end mt-auto">
                                <div className="flex -space-x-2">
                                    <Skeleton className="w-8 h-8 rounded-full border-2 border-white" />
                                    <Skeleton className="w-8 h-8 rounded-full border-2 border-white" />
                                </div>
                                <Skeleton className="h-9 w-28" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map(ws => (
                        <Card key={ws.id} className="flex flex-col justify-between h-48 hover:shadow-md transition-shadow group" onClick={() => navigate(`/workspaces/${ws.id}/board`)}>
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-lg text-slate-900 tracking-tight">{ws.name}</h3>
                                <button className="text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors" onClick={(e) => { e.stopPropagation(); alert('Settings menu'); }}>
                                    •••
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between mt-auto pt-4">
                                <div className="flex -space-x-2">
                                    {ws.members.slice(0, 3).map((m, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600 shadow-sm z-10" style={{ zIndex: 10 - i }}>
                                            {m.name.charAt(0)}
                                        </div>
                                    ))}
                                    {ws.members.length > 3 && (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500 z-0">
                                            +{ws.members.length - 3}
                                        </div>
                                    )}
                                </div>
                                
                                <Button variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" onClick={(e) => openBoard(ws.id, e)}>
                                    Open Board
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
