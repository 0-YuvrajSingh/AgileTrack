import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import type { Workspace } from '../../types/workspace';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const Dashboard = () => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get<Workspace[]>('/workspaces').then(res => setWorkspaces(res.data)).catch(err => console.error(err));
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-stripe-textDark">Workspaces</h1>
                    <p className="text-sm text-stripe-textLight mt-1">Manage your teams and projects.</p>
                </div>
                <Button onClick={() => console.log('Open modal')}>+ New Workspace</Button>
            </div>

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
        </div>
    );
};
