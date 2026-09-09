import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Rocket, Plus, Loader2, LayoutDashboard, Calendar, Lock } from 'lucide-react';

import type { ReleaseLifecycleState } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useWorkspace } from '../hooks/useWorkspaces';
import { useProject } from '../hooks/useProjects';
import { useReleases } from '../hooks/useReleases';
import { releaseService } from '../services/releaseService';
import { getApiErrorMessage } from '../api/axios';

export const LIFECYCLE_BADGE: Record<ReleaseLifecycleState, string> = {
  PLANNED: 'bg-gray-100 text-gray-700 border-gray-300',
  IN_PROGRESS: 'bg-blue-50 text-cf-primary border-blue-200',
  RELEASED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};

export const LIFECYCLE_LABEL: Record<ReleaseLifecycleState, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  RELEASED: 'Released',
  CANCELLED: 'Cancelled',
};

const ReleaseList: React.FC = () => {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const { workspace } = useWorkspace(workspaceId);
  const { project } = useProject(workspaceId, projectId);
  const { releases, loading, error, refetch } = useReleases(workspaceId, projectId);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [releaseVersion, setReleaseVersion] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const canMutate = workspace?.myRole !== 'VIEWER' && project?.status !== 'ARCHIVED';

  const openCreate = () => {
    setName('');
    setReleaseVersion('');
    setTargetDate('');
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId || !projectId) return;

    setSaving(true);
    try {
      await releaseService.create(workspaceId, projectId, {
        name,
        releaseVersion: releaseVersion || null,
        targetDate: targetDate || null,
      });
      toast.success('Release created');
      setShowModal(false);
      refetch();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create release'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && releases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cf-textMuted">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading releases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-cf-textMuted mb-1">
            <LayoutDashboard size={12} />
            <Link to={`/workspaces/${workspaceId}`} className="hover:text-cf-primary">
              {workspace?.name}
            </Link>
            <span>/</span>
            <Link
              to={`/workspaces/${workspaceId}/projects/${projectId}`}
              className="hover:text-cf-primary"
            >
              {project?.name}
            </Link>
            <span>/</span>
            <span className="text-cf-textDark">Releases</span>
          </div>
          <h1 className="text-2xl font-bold text-cf-textDark">Releases</h1>
        </div>

        {canMutate && (
          <Button onClick={openCreate} size="sm" className="whitespace-nowrap shadow-sm">
            <Plus size={16} className="mr-1" /> New Release
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
      )}

      {releases.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No releases yet"
          description="A release groups work items into a shippable scope, then tells you whether that scope is ready."
          actionLabel={canMutate ? 'Create a release' : undefined}
          onAction={canMutate ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map(release => (
            <Link
              key={release.id}
              to={`/workspaces/${workspaceId}/projects/${projectId}/releases/${release.id}`}
            >
              <Card hoverable className="h-full">
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-cf-textDark truncate">{release.name}</h3>
                      {release.releaseVersion && (
                        <p className="text-xs text-cf-textMuted font-mono">{release.releaseVersion}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[9px] uppercase px-1.5 py-0.5 rounded border font-mono ${LIFECYCLE_BADGE[release.lifecycleState]}`}
                    >
                      {LIFECYCLE_LABEL[release.lifecycleState]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-cf-textMuted">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {release.targetDate ?? 'No target date'}
                    </span>
                    {release.scopeLocked && (
                      <span className="flex items-center gap-1" title="Scope is locked">
                        <Lock size={12} /> Scope locked
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <form onSubmit={handleCreate}>
              <CardBody className="space-y-4">
                <h2 className="text-lg font-bold text-cf-textDark">New Release</h2>

                <div>
                  <label
                    htmlFor="release-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5"
                  >
                    Name
                  </label>
                  <Input
                    id="release-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. v2.4.0"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="release-version"
                    className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5"
                  >
                    Version
                  </label>
                  <Input
                    id="release-version"
                    value={releaseVersion}
                    onChange={e => setReleaseVersion(e.target.value)}
                    placeholder="e.g. 2.4.0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="release-target-date"
                    className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5"
                  >
                    Target date
                  </label>
                  <input
                    id="release-target-date"
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Release'}
                  </Button>
                </div>
              </CardBody>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReleaseList;
