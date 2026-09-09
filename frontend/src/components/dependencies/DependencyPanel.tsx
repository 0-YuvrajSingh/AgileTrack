import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, Link2, Ban, Check, Loader2 } from 'lucide-react';

import type { Dependency, Task } from '../../types';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDependencies } from '../../hooks/useDependencies';
import { dependencyService } from '../../services/dependencyService';
import { getApiErrorMessage } from '../../api/axios';

interface DependencyPanelProps {
  workspaceId: string;
  projectId: string;
  task: Task;
  /** All work items in the project, used to offer candidate blockers. */
  candidates: Task[];
  canMutate: boolean;
  onClose: () => void;
  /** Lets the board refresh derived blocked state after an edge changes. */
  onChanged?: () => void;
}

const DependencyRow: React.FC<{
  dependency: Dependency;
  label: string;
  onRemove?: () => void;
  removing: boolean;
}> = ({ dependency, label, onRemove, removing }) => (
  <li className="py-2 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm text-cf-textDark truncate">{label}</p>
      <span className="text-[10px] uppercase font-mono text-cf-textMuted flex items-center gap-1">
        {dependency.resolved ? (
          <>
            <Check size={11} className="text-emerald-600" /> resolved
          </>
        ) : (
          <>
            <Ban size={11} className="text-amber-600" /> unresolved
          </>
        )}
      </span>
    </div>
    {onRemove && (
      <button
        type="button"
        aria-label={`Remove dependency on ${label}`}
        className="text-cf-textMuted hover:text-red-600 p-1 disabled:opacity-40"
        disabled={removing}
        onClick={onRemove}
      >
        <X size={14} />
      </button>
    )}
  </li>
);

export const DependencyPanel: React.FC<DependencyPanelProps> = ({
  workspaceId,
  projectId,
  task,
  candidates,
  canMutate,
  onClose,
  onChanged,
}) => {
  const { dependencies, loading, error, refetch } = useDependencies(workspaceId, projectId, task.id);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');

  // Anything already linked in either direction would be a duplicate or an immediate cycle,
  // so it is not worth offering. The server still rejects transitive cycles it cannot see here.
  const alreadyLinked = useMemo(() => {
    const ids = new Set<string>();
    dependencies?.blockedBy.forEach(d => ids.add(d.blockerWorkItemId));
    dependencies?.blocking.forEach(d => ids.add(d.blockedWorkItemId));
    return ids;
  }, [dependencies]);

  const selectable = useMemo(
    () => candidates.filter(c => c.id !== task.id && !alreadyLinked.has(c.id)),
    [candidates, task.id, alreadyLinked]
  );

  const afterChange = () => {
    refetch();
    onChanged?.();
  };

  const addBlocker = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await dependencyService.add(workspaceId, projectId, task.id, selected);
      toast.success('Dependency added');
      setSelected('');
      afterChange();
    } catch (err) {
      // A rejected cycle is the interesting case: the server explains which loop it would close.
      toast.error(getApiErrorMessage(err, 'Failed to add dependency'));
    } finally {
      setBusy(false);
    }
  };

  const removeBlocker = async (dependencyId: string) => {
    setBusy(true);
    try {
      await dependencyService.remove(workspaceId, projectId, task.id, dependencyId);
      toast.success('Dependency removed');
      afterChange();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to remove dependency'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 size={15} className="text-cf-primary shrink-0" />
            <h2 className="font-bold text-cf-textDark text-sm truncate">
              Dependencies — {task.title}
            </h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={16} className="text-cf-textMuted" />
          </button>
        </CardHeader>

        <CardBody className="space-y-5 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-cf-textMuted">
              <Loader2 className="animate-spin" size={14} /> Loading dependencies...
            </div>
          )}

          {error && (
            <div className="p-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          {dependencies && (
            <>
              {dependencies.blocked && (
                <div
                  role="status"
                  className="p-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded flex items-center gap-2"
                >
                  <Ban size={14} />
                  This work item is blocked and cannot be completed yet.
                </div>
              )}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                  Blocked by
                </h3>
                {dependencies.blockedBy.length === 0 ? (
                  <p className="text-xs text-cf-textMuted italic">Nothing is blocking this work item.</p>
                ) : (
                  <ul className="divide-y divide-cf-border">
                    {dependencies.blockedBy.map(d => (
                      <DependencyRow
                        key={d.id}
                        dependency={d}
                        label={d.blockerTitle}
                        removing={busy}
                        onRemove={canMutate ? () => removeBlocker(d.id) : undefined}
                      />
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                  Blocks
                </h3>
                {dependencies.blocking.length === 0 ? (
                  <p className="text-xs text-cf-textMuted italic">
                    This work item is not blocking anything.
                  </p>
                ) : (
                  <ul className="divide-y divide-cf-border">
                    {dependencies.blocking.map(d => (
                      <DependencyRow
                        key={d.id}
                        dependency={d}
                        label={d.blockedTitle}
                        removing={busy}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {canMutate && (
                <section className="pt-1 border-t border-cf-border">
                  <label
                    htmlFor="blocker-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5"
                  >
                    Add a blocker
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="blocker-select"
                      value={selected}
                      onChange={e => setSelected(e.target.value)}
                      disabled={busy || selectable.length === 0}
                      className="flex-1 px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary"
                    >
                      <option value="">
                        {selectable.length === 0 ? 'No available work items' : 'Select a work item...'}
                      </option>
                      {selectable.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={addBlocker} disabled={busy || !selected}>
                      Add
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default DependencyPanel;
