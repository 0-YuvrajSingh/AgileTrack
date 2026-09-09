import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { WorkspaceRole } from '../types';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Users, UserPlus, ShieldAlert, ShieldCheck, User as UserIcon, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useWorkspace } from '../hooks/useWorkspaces';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { workspaceService } from '../services/workspaceService';
import { getApiErrorMessage } from '../api/axios';

const ROLE_COLORS: Record<WorkspaceRole, { bg: string, text: string, icon: React.ReactNode }> = {
  OWNER: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <ShieldAlert size={12} /> },
  ADMIN: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <ShieldCheck size={12} /> },
  MEMBER: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <UserIcon size={12} /> },
  VIEWER: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <UserIcon size={12} /> }
};

const WorkspaceMembers: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  
  const { workspace, loading: wsLoading, error: wsError } = useWorkspace(workspaceId);
  const { members, loading: memLoading, error: memError, refetch: fetchMembers } = useWorkspaceMembers(workspaceId);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [inviting, setInviting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; memberId: string | null; email: string }>({ 
    isOpen: false, memberId: null, email: '' 
  });

  const loading = wsLoading || memLoading;
  const error = wsError || memError;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !workspaceId) return;

    setInviting(true);
    try {
      await workspaceService.inviteMember(workspaceId, inviteEmail, inviteRole);
      toast.success('Member invited successfully!');
      setInviteEmail('');
      setShowInvite(false);
      fetchMembers();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Membership was modified. Refreshing...');
        fetchMembers();
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to invite member'));
      }
    } finally {
      setInviting(false);
    }
  };

  const executeRemove = async () => {
    if (!deleteDialog.memberId || !workspaceId) return;

    try {
      await workspaceService.removeMember(workspaceId, deleteDialog.memberId);
      toast.success('Member removed successfully');
      fetchMembers();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Membership was modified. Refreshing...');
        fetchMembers();
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to remove member'));
      }
    } finally {
      setDeleteDialog({ isOpen: false, memberId: null, email: '' });
    }
  };

  if (loading && !workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cf-textMuted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cf-primary mb-4"></div>
        <p>Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <EmptyState
          icon={Users}
          title="Could not load team"
          description={error}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const canManageMembers = workspace?.myRole === 'OWNER' || workspace?.myRole === 'ADMIN';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cf-border pb-4">
        <div>
          <div className="flex items-center text-xs text-cf-textMuted mb-1 font-semibold tracking-wide uppercase">
            <Link to={`/workspaces/${workspaceId}`} className="hover:text-cf-primary transition-colors flex items-center gap-1">
              <ArrowLeft size={12} /> Back to Workspace
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-cf-textDark flex items-center gap-2">
            Team Members
          </h1>
          <p className="text-sm text-cf-textMuted mt-1">
            Manage who has access to {workspace?.name}
          </p>
        </div>

        {canManageMembers && (
          <Button onClick={() => setShowInvite(!showInvite)} size="sm">
            <UserPlus size={16} className="mr-1.5" /> 
            {showInvite ? 'Cancel Invite' : 'Invite Member'}
          </Button>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && canManageMembers && (
        <Card className="bg-blue-50/50 border-blue-100">
          <CardBody>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="User Email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition duration-150"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <Button type="submit" disabled={inviting} className="w-full sm:w-auto h-[38px]">
                {inviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader className="border-b border-cf-border bg-cf-bgLight/30">
          <h3 className="font-bold text-cf-textDark flex items-center gap-2">
            <Users size={18} className="text-cf-primary" />
            Active Members ({members.length})
          </h3>
        </CardHeader>
        <div className="divide-y divide-cf-border">
          {members.map(member => {
            const isMe = member.userId === user?.id;
            const roleConfig = ROLE_COLORS[member.role];
            
            // Only OWNER can remove other OWNERs. ADMINs can remove MEMBERs and VIEWERs.
            const canRemove = !isMe && canManageMembers && (
              workspace?.myRole === 'OWNER' || 
              (workspace?.myRole === 'ADMIN' && member.role !== 'OWNER' && member.role !== 'ADMIN')
            );

            return (
              <div key={member.userId} className="p-4 flex items-center justify-between hover:bg-cf-bgLight/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cf-primary/10 flex items-center justify-center text-cf-primary font-bold shadow-inner">
                    {member.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-cf-textDark">{member.email}</p>
                      {isMe && (
                        <span className="text-[9px] uppercase font-bold tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleConfig.bg} ${roleConfig.text}`}>
                    {roleConfig.icon}
                    {member.role}
                  </div>

                  {canRemove ? (
                    <button
                      onClick={() => setDeleteDialog({ isOpen: true, memberId: member.userId, email: member.email })}
                      className="text-cf-textMuted hover:text-red-500 p-2 rounded hover:bg-red-50 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div className="w-8"></div> /* Spacer for alignment */
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Remove Member"
        message={`Are you sure you want to remove ${deleteDialog.email} from the workspace? They will lose access to all projects and tasks.`}
        confirmLabel="Remove Member"
        isDestructive={true}
        onConfirm={executeRemove}
        onCancel={() => setDeleteDialog({ isOpen: false, memberId: null, email: '' })}
      />
    </div>
  );
};

export default WorkspaceMembers;
