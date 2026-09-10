import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, LayoutDashboard, Lock, Plus, X, Calendar, Shield } from 'lucide-react';

import type { ReleaseLifecycleState, Task, WorkItemType } from '../types';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useWorkspace } from '../hooks/useWorkspaces';
import { useProject } from '../hooks/useProjects';
import { useRelease } from '../hooks/useReleases';
import { useTasks } from '../hooks/useTasks';
import { releaseService } from '../services/releaseService';
import { getApiErrorMessage } from '../api/axios';
import { LIFECYCLE_BADGE, LIFECYCLE_LABEL } from './ReleaseList';
import ReadinessPanel from '../components/readiness/ReadinessPanel';
import ApprovalModal from '../components/approval/ApprovalModal';

const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  FEATURE: 'Feature',
  BUG: 'Bug',
  CHANGE: 'Change',
  TECH_DEBT: 'Tech Debt',
};

/** Mirrors the server's transition rules so the UI only offers moves that will be accepted. */
const NEXT_STATES: Record<ReleaseLifecycleState, ReleaseLifecycleState[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RELEASED', 'CANCELLED'],
  RELEASED: [],
  CANCELLED: [],
};

const ReleaseDetail: React.FC = () => {
  const { workspaceId, projectId, releaseId } = useParams<{
    workspaceId: string;
    projectId: string;
    releaseId: string;
  }>();

  const { workspace } = useWorkspace(workspaceId);
  const { project } = useProject(workspaceId, projectId);
  const { release, workItems, readiness, loading, error, refetch } = useRelease(workspaceId, projectId, releaseId);
  const { tasks } = useTasks(workspaceId, projectId);

  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [approvalTask, setApprovalTask] = useState<Task | null>(null);

  const canMutate = workspace?.myRole !== 'VIEWER' && project?.status !== 'ARCHIVED';
  const scopeEditable = canMutate && release != null && !release.scopeLocked;

  const completion = useMemo(() => {
    if (workItems.length === 0) return { done: 0, total: 0, percent: 0 };
    const done = workItems.filter(t => t.status === 'DONE').length;
    return { done, total: workItems.length, percent: Math.round((done / workItems.length) * 100) };
  }, [workItems]);

  const assignable = useMemo(
    () => tasks.filter(t => t.releaseId === null),
    [tasks]
  );

  // A 409 means someone else changed this release; the fix is always to reload it.
  const handleError = (err: unknown, fallback: string) => {
    if ((err as { response?: { status?: number } })?.response?.status === 409) {
      toast.error('Release was modified by another user. Refreshing...');
      refetch();
    } else {
      toast.error(getApiErrorMessage(err, fallback));
    }
  };

  const changeLifecycle = async (next: ReleaseLifecycleState) => {
    if (!workspaceId || !projectId || !releaseId || !release) return;
    setBusy(true);
    try {
      await releaseService.updateLifecycle(workspaceId, projectId, releaseId, next, release.version);
      toast.success(`Release moved to ${LIFECYCLE_LABEL[next]}`);
      refetch();
    } catch (err) {
      handleError(err, 'Failed to change release state');
    } finally {
      setBusy(false);
    }
  };

  const addWorkItem = async (taskId: string) => {
    if (!workspaceId || !projectId || !releaseId) return;
    setBusy(true);
    try {
      await releaseService.addWorkItem(workspaceId, projectId, releaseId, taskId);
      toast.success('Work item added to release');
      setShowAdd(false);
      refetch();
    } catch (err) {
      handleError(err, 'Failed to add work item');
    } finally {
      setBusy(false);
    }
  };

  const removeWorkItem = async (taskId: string) => {
    if (!workspaceId || !projectId || !releaseId) return;
    setBusy(true);
    try {
      await releaseService.removeWorkItem(workspaceId, projectId, releaseId, taskId);
      toast.success('Work item removed from release');
      refetch();
    } catch (err) {
      handleError(err, 'Failed to remove work item');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !release) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cf-textMuted">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading release...</p>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        {error ?? 'Release not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-cf-textMuted mb-1">
            <LayoutDashboard size={12} />
            <Link to={`/workspaces/${workspaceId}`} className="hover:text-cf-primary">
              {workspace?.name}
            </Link>
            <span>/</span>
            <Link
              to={`/workspaces/${workspaceId}/projects/${projectId}/releases`}
              className="hover:text-cf-primary"
            >
              Releases
            </Link>
            <span>/</span>
            <span className="text-cf-textDark">{release.name}</span>
          </div>

          <h1 className="text-2xl font-bold text-cf-textDark flex items-center gap-2">
            {release.name}
            <span
              className={`text-[10px] uppercase px-2 py-0.5 rounded border font-mono ${LIFECYCLE_BADGE[release.lifecycleState]}`}
            >
              {LIFECYCLE_LABEL[release.lifecycleState]}
            </span>
          </h1>

          <div className="flex items-center gap-3 mt-1 text-xs text-cf-textMuted">
            {release.releaseVersion && <span className="font-mono">{release.releaseVersion}</span>}
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {release.targetDate ?? 'No target date'}
            </span>
          </div>
        </div>

        {canMutate && NEXT_STATES[release.lifecycleState].length > 0 && (
          <div className="flex gap-2">
            {NEXT_STATES[release.lifecycleState].map(next => (
              <Button
                key={next}
                size="sm"
                variant={next === 'CANCELLED' ? 'secondary' : 'primary'}
                disabled={busy}
                onClick={() => changeLifecycle(next)}
              >
                {next === 'CANCELLED' ? 'Cancel release' : `Move to ${LIFECYCLE_LABEL[next]}`}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ReadinessPanel readiness={readiness} />

      <Card>
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-cf-textDark">Completion</span>
            <span className="text-cf-textMuted">
              {completion.done} of {completion.total} done
            </span>
          </div>
          <div className="h-2 w-full bg-cf-bgLight rounded-full overflow-hidden border border-cf-border">
            <div
              className="h-full bg-cf-primary transition-all"
              style={{ width: `${completion.percent}%` }}
              role="progressbar"
              aria-valuenow={completion.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-cf-textDark text-sm">Release scope</h2>
            {release.scopeLocked && (
              <span
                className="flex items-center gap-1 text-[10px] uppercase font-mono text-cf-textMuted"
                title="Scope changes are rejected by the server once a release leaves PLANNED"
              >
                <Lock size={11} /> Locked
              </span>
            )}
          </div>
          {scopeEditable && (
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)} disabled={busy}>
              <Plus size={14} className="mr-1" /> Add work item
            </Button>
          )}
        </CardHeader>

        <CardBody>
          {workItems.length === 0 ? (
            <p className="text-sm text-cf-textMuted italic py-4 text-center">
              No work items in this release yet.
            </p>
          ) : (
            <ul className="divide-y divide-cf-border">
              {workItems.map((task: Task) => (
                <li key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-cf-textDark truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] uppercase font-mono text-cf-textMuted">
                        {WORK_ITEM_TYPE_LABELS[task.type]}
                      </span>
                      {task.type === 'CHANGE' && task.riskLevel && (
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded border ${
                          task.riskLevel === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                          task.riskLevel === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          task.riskLevel === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {task.riskLevel}
                        </span>
                      )}
                      <span className="text-[9px] uppercase font-mono text-cf-textMuted">
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {task.type === 'CHANGE' && (
                      <button
                        type="button"
                        aria-label={`Governance for ${task.title}`}
                        title="Change Governance"
                        className="text-cf-textMuted hover:text-cf-primary p-1"
                        onClick={() => setApprovalTask(task)}
                      >
                        <Shield size={14} />
                      </button>
                    )}
                    {scopeEditable && (
                      <button
                        type="button"
                        aria-label={`Remove ${task.title} from release`}
                        className="text-cf-textMuted hover:text-red-600 p-1"
                        disabled={busy}
                        onClick={() => removeWorkItem(task.id)}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex items-center justify-between">
              <h2 className="font-bold text-cf-textDark text-sm">Add work item to release</h2>
              <button type="button" aria-label="Close" onClick={() => setShowAdd(false)}>
                <X size={16} className="text-cf-textMuted" />
              </button>
            </CardHeader>
            <CardBody className="max-h-80 overflow-y-auto">
              {assignable.length === 0 ? (
                <EmptyState
                  icon={Plus}
                  title="Nothing to add"
                  description="Every work item in this project already belongs to a release."
                />
              ) : (
                <ul className="divide-y divide-cf-border">
                  {assignable.map(task => (
                    <li key={task.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-sm text-cf-textDark truncate">{task.title}</span>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => addWorkItem(task.id)}>
                        Add
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {approvalTask && workspaceId && projectId && (
        <ApprovalModal
          workspaceId={workspaceId}
          projectId={projectId}
          task={approvalTask}
          canMutate={canMutate}
          onClose={() => setApprovalTask(null)}
          onChanged={() => refetch()}
        />
      )}
    </div>
  );
};

export default ReleaseDetail;
