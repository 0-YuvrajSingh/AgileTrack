import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { WorkspaceRole } from '../types/workspace.types';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
    isOpen,
    onClose,
    workspaceId
}) => {
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<WorkspaceRole>('MEMBER');

    const inviteMutation = useMutation({
        mutationFn: () => workspaceService.inviteMember(workspaceId, { email, role }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaceMembers', workspaceId] });
            toast.success(`Invitation sent to ${email}`);
            setEmail('');
            onClose();
        },
        onError: (error: unknown) => {
            toast.error(parseApiError(error, 'Failed to invite member'));
        }
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        inviteMutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white rounded-lg shadow-stripe-hover w-full max-w-md overflow-hidden animate-[slideUp_0.2s_ease-out]">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-stripe-textDark mb-4">Invite Team Member</h2>
                        <div className="space-y-4">
                            <Input 
                                label="Email address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="colleague@example.com"
                                autoFocus
                            />
                            <div>
                                <label className="block text-sm font-medium text-stripe-textDark mb-1">
                                    Role
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-stripe-border rounded-md focus:outline-none focus:ring-1 focus:ring-stripe-primary focus:border-stripe-primary text-sm bg-white"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                                >
                                    <option value="VIEWER">Viewer (Read-only)</option>
                                    <option value="MEMBER">Member (Can edit tasks)</option>
                                    <option value="OWNER">Owner (Full access)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-stripe-border">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={inviteMutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={inviteMutation.isPending}>
                            Send Invite
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
