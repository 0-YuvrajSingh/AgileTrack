import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Rocket,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ExternalLink,
  ChevronRight,
  Loader2,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  Ban,
  FileCheck2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { apiClient } from '../api/axios';
import type { PageResponse, Project, Release, ReleaseReadiness, Task, Workspace } from '../types';
import { releaseService } from '../services/releaseService';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LIFECYCLE_BADGE, LIFECYCLE_LABEL } from './ReleaseList';

interface ReleaseContext {
  workspace: Workspace;
  project: Project;
  release: Release;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, loading: workspacesLoading, error: workspacesError } = useWorkspaces();

  const [loading, setLoading] = useState(true);
  const [releaseContexts, setReleaseContexts] = useState<ReleaseContext[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [activeReadiness, setActiveReadiness] = useState<ReleaseReadiness | null>(null);
  const [activeWorkItems, setActiveWorkItems] = useState<Task[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // 1. Discover every release across the user's accessible workspaces & projects.
  useEffect(() => {
    const controller = new AbortController();

    const fetchAllReleases = async () => {
      setLoading(true);
      const discovered: ReleaseContext[] = [];

      for (const ws of workspaces) {
        try {
          const projectsRes = await apiClient.get<PageResponse<Project>>(
            `/workspaces/${ws.id}/projects`,
            { signal: controller.signal }
          );
          const projects = projectsRes.data?.content || [];

          for (const proj of projects) {
            try {
              const releasesRes = await releaseService.list(ws.id, proj.id, controller.signal);
              const releases = releasesRes?.content || [];
              for (const rel of releases) {
                discovered.push({
                  workspace: ws,
                  project: proj,
                  release: rel,
                });
              }
            } catch (e: any) {
              if (e?.name !== 'CanceledError') {
                console.error('Error loading releases for project', proj.id, e);
              }
            }
          }
        } catch (e: any) {
          if (e?.name !== 'CanceledError') {
            console.error('Error loading projects for workspace', ws.id, e);
          }
        }
      }

      if (controller.signal.aborted) return;

      setReleaseContexts(discovered);

      if (discovered.length > 0 && !selectedKey) {
        // Default to first IN_PROGRESS release, or first PLANNED, or simply the first.
        const inProgress = discovered.find(d => d.release.lifecycleState === 'IN_PROGRESS');
        const planned = discovered.find(d => d.release.lifecycleState === 'PLANNED');
        const chosen = inProgress || planned || discovered[0];
        setSelectedKey(`${chosen.workspace.id}:${chosen.project.id}:${chosen.release.id}`);
      }
      setLoading(false);
    };

    if (!workspacesLoading && !workspacesError) {
      if (workspaces.length === 0) {
        setLoading(false);
      } else {
        fetchAllReleases();
      }
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, workspacesLoading, workspacesError]);

  // Find currently selected release context
  const selectedContext = useMemo(() => {
    if (!selectedKey) return null;
    const [wsId, pId, rId] = selectedKey.split(':');
    return releaseContexts.find(
      c => c.workspace.id === wsId && c.project.id === pId && c.release.id === rId
    ) || null;
  }, [releaseContexts, selectedKey]);

  // 2. Fetch readiness & work items for the selected release
  useEffect(() => {
    if (!selectedContext) {
      setActiveReadiness(null);
      setActiveWorkItems([]);
      return;
    }

    const controller = new AbortController();
    const { workspace, project, release } = selectedContext;

    const fetchDetails = async () => {
      setDetailsLoading(true);
      try {
        const [readinessData, workItemsData] = await Promise.all([
          releaseService.readiness(workspace.id, project.id, release.id, controller.signal),
          releaseService.workItems(workspace.id, project.id, release.id, controller.signal),
        ]);
        setActiveReadiness(readinessData);
        setActiveWorkItems(workItemsData);
      } catch (err: any) {
        if (err?.name !== 'CanceledError') {
          console.error('Failed to fetch release readiness details', err);
          toast.error('Failed to load release readiness details');
        }
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
    return () => controller.abort();
  }, [selectedContext]);

  // Metrics derived from work items & readiness reasons
  const metrics = useMemo(() => {
    const total = activeWorkItems.length;
    const done = activeWorkItems.filter(t => t.status === 'DONE').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const changes = activeWorkItems.filter(t => t.type === 'CHANGE').length;
    const bugs = activeWorkItems.filter(t => t.type === 'BUG').length;
    const features = activeWorkItems.filter(t => t.type === 'FEATURE').length;
    const techDebt = activeWorkItems.filter(t => t.type === 'TECH_DEBT').length;

    const blockers = activeReadiness?.reasons?.filter(r => r.code === 'BLOCKED_WORK').length || 0;
    const pendingApprovals =
      activeReadiness?.reasons?.filter(r => r.code === 'APPROVAL_REQUIRED').length || 0;

    return { total, done, percent, changes, bugs, features, techDebt, blockers, pendingApprovals };
  }, [activeWorkItems, activeReadiness]);

  if (workspacesLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-cf-textMuted">
        <Loader2 className="animate-spin mb-4 text-cf-primary" size={32} />
        <p className="text-sm font-medium">Loading Engineering Release Dashboard...</p>
      </div>
    );
  }

  if (workspacesError) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardBody className="text-sm text-red-600">
            Failed to load workspaces. Please refresh and try again.
          </CardBody>
        </Card>
      </div>
    );
  }

  if (releaseContexts.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-br from-cf-navy via-cf-navy to-cf-navyDark text-white p-6 rounded-xl shadow-cf-card-lg">
          <h1 className="text-2xl font-bold tracking-tight">Engineering Release Dashboard</h1>
          <p className="text-sm text-gray-300 mt-1">
            Deterministic release readiness, dependency gates, and change governance across projects.
          </p>
        </div>

        <Card>
          <CardBody>
            <EmptyState
              icon={Rocket}
              title="No Releases Found"
              description="Get started by creating a project and scoping work items into an engineering release."
              actionLabel="Explore Workspaces"
              onAction={() => navigate('/workspaces')}
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Release Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-br from-cf-navy via-cf-navy to-cf-navyDark text-white p-6 rounded-xl shadow-cf-card-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cf-primary/20 text-cf-primarySoft rounded">
              <Rocket size={20} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Engineering Release Dashboard</h1>
          </div>
          <p className="text-sm text-gray-300 mt-1.5">
            Real-time derived readiness verdicts, dependency constraints, and change governance.
          </p>
        </div>

        {/* Release Switcher Dropdown */}
        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/15">
          <Layers size={16} className="text-cf-primarySoft shrink-0 ml-1" />
          <label htmlFor="release-select" className="text-xs font-semibold text-gray-300 shrink-0">
            Active Release:
          </label>
          <select
            id="release-select"
            aria-label="Active Release"
            value={selectedKey || ''}
            onChange={e => setSelectedKey(e.target.value)}
            className="bg-cf-navyDark text-white text-xs rounded border border-white/20 px-3 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-cf-primary"
          >
            {releaseContexts.map(c => (
              <option
                key={`${c.workspace.id}:${c.project.id}:${c.release.id}`}
                value={`${c.workspace.id}:${c.project.id}:${c.release.id}`}
              >
                {c.release.name} {c.release.releaseVersion ? `(${c.release.releaseVersion})` : ''} — {c.project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Release Spotlight / Hero Cockpit */}
      {selectedContext && (
        <Card className="overflow-hidden border-2 border-cf-border shadow-md">
          {/* Top Banner with Verdict */}
          <div className="bg-cf-bgLight p-5 border-b border-cf-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-cf-textMuted mb-1">
                <span>{selectedContext.workspace.name}</span>
                <span>/</span>
                <span>{selectedContext.project.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-cf-textDark">
                  {selectedContext.release.name}
                </h2>
                {selectedContext.release.releaseVersion && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-800 font-semibold">
                    {selectedContext.release.releaseVersion}
                  </span>
                )}
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                    LIFECYCLE_BADGE[selectedContext.release.lifecycleState]
                  }`}
                >
                  {LIFECYCLE_LABEL[selectedContext.release.lifecycleState]}
                </span>
              </div>
            </div>

            {/* Headline Readiness Verdict Badge */}
            <div className="flex items-center gap-3 shrink-0">
              {detailsLoading ? (
                <div className="flex items-center gap-1.5 text-xs text-cf-textMuted">
                  <Loader2 size={16} className="animate-spin text-cf-primary" /> Calculating readiness...
                </div>
              ) : activeReadiness?.status === 'READY' ? (
                <div
                  data-testid="readiness-verdict"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-sm shadow-sm"
                >
                  <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                  <span>READY TO SHIP</span>
                </div>
              ) : (
                <div
                  data-testid="readiness-verdict"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold text-sm shadow-sm"
                >
                  <ShieldAlert size={20} className="text-amber-600 shrink-0" />
                  <span>NOT READY</span>
                </div>
              )}
            </div>
          </div>

          <CardBody className="p-6 space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Metric 1: Work Completion */}
              <div
                data-testid="metric-work-items"
                className="p-4 rounded-lg bg-cf-bgLight/70 border border-cf-border space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-cf-textMuted uppercase tracking-wider">
                  <span>Work Items</span>
                  <span className="font-bold text-cf-textDark">{metrics.percent}%</span>
                </div>
                <div className="text-xl font-bold text-cf-textDark">
                  {metrics.done} <span className="text-xs font-normal text-cf-textMuted">/ {metrics.total} complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 transition-all duration-300 ${
                      metrics.percent === 100 ? 'bg-emerald-500' : 'bg-cf-primary'
                    }`}
                    style={{ width: `${metrics.percent}%` }}
                  />
                </div>
              </div>

              {/* Metric 2: Blockers */}
              <div
                data-testid="metric-blockers"
                className="p-4 rounded-lg bg-cf-bgLight/70 border border-cf-border space-y-1"
              >
                <div className="text-xs font-semibold text-cf-textMuted uppercase tracking-wider flex items-center justify-between">
                  <span>Blockers</span>
                  <Ban size={14} className={metrics.blockers > 0 ? 'text-red-500' : 'text-emerald-500'} />
                </div>
                <div className="text-2xl font-bold text-cf-textDark">
                  {metrics.blockers}
                </div>
                <p className="text-[11px] text-cf-textMuted">
                  {metrics.blockers === 0 ? 'No active blockers' : 'Unresolved dependency edges'}
                </p>
              </div>

              {/* Metric 3: Change Approvals */}
              <div
                data-testid="metric-approvals"
                className="p-4 rounded-lg bg-cf-bgLight/70 border border-cf-border space-y-1"
              >
                <div className="text-xs font-semibold text-cf-textMuted uppercase tracking-wider flex items-center justify-between">
                  <span>Approvals</span>
                  <FileCheck2 size={14} className={metrics.pendingApprovals > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                </div>
                <div className="text-2xl font-bold text-cf-textDark">
                  {metrics.pendingApprovals}
                </div>
                <p className="text-[11px] text-cf-textMuted">
                  {metrics.pendingApprovals === 0 ? 'All changes approved' : 'Pending HIGH/CRITICAL sign-offs'}
                </p>
              </div>

              {/* Metric 4: Work Item Breakdown */}
              <div
                data-testid="metric-breakdown"
                className="p-4 rounded-lg bg-cf-bgLight/70 border border-cf-border space-y-1.5"
              >
                <div className="text-xs font-semibold text-cf-textMuted uppercase tracking-wider">
                  Scope Breakdown
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    {metrics.features} Feature{metrics.features === 1 ? '' : 's'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-medium">
                    {metrics.bugs} Bug{metrics.bugs === 1 ? '' : 's'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    {metrics.changes} Change{metrics.changes === 1 ? '' : 's'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                    {metrics.techDebt} Debt
                  </span>
                </div>
              </div>
            </div>

            {/* Readiness Reason List (Blockers or Success Banner) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cf-textMuted">
                Readiness Gate Evaluation
              </h3>

              {detailsLoading ? (
                <div className="p-4 text-center text-xs text-cf-textMuted">
                  Evaluating readiness gates...
                </div>
              ) : activeReadiness?.status === 'READY' ? (
                <div className="p-4 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800">All Delivery Gates Passed</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Every work item in scope is completed, no dependency cycles or unresolved blockers exist, and all change governance approvals are recorded.
                    </p>
                  </div>
                </div>
              ) : activeReadiness?.reasons && activeReadiness.reasons.length > 0 ? (
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertOctagon size={16} className="text-amber-700 shrink-0" />
                      <span className="text-xs font-bold text-amber-900">
                        {activeReadiness.reasons.length} Readiness Blocker{activeReadiness.reasons.length === 1 ? '' : 's'} Preventing Release
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-700 font-medium">
                      Deterministic Server Verdict
                    </span>
                  </div>

                  <div className="divide-y divide-cf-border border border-cf-border rounded-lg overflow-hidden bg-white">
                    {activeReadiness.reasons.map((reason, idx) => (
                      <div key={idx} className="p-3.5 flex items-start justify-between gap-4 hover:bg-cf-bgLight/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-semibold border border-gray-200">
                              {reason.code}
                            </span>
                            {reason.workItemTitle && (
                              <span className="text-xs font-bold text-cf-textDark">
                                {reason.workItemTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-cf-textMuted">{reason.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-xs text-cf-textMuted bg-gray-50 rounded border border-gray-200">
                  No readiness evaluation reasons available.
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-cf-border flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-cf-textMuted flex items-center gap-2">
                <Calendar size={14} />
                <span>Target Date: {selectedContext.release.targetDate || 'None specified'}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to={`/workspaces/${selectedContext.workspace.id}/projects/${selectedContext.project.id}`}
                >
                  <Button variant="secondary" size="sm">
                    Open Project Board
                  </Button>
                </Link>
                <Link
                  to={`/workspaces/${selectedContext.workspace.id}/projects/${selectedContext.project.id}/releases/${selectedContext.release.id}`}
                >
                  <Button size="sm">
                    Enter Release Cockpit <ChevronRight size={14} className="ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Portfolio Releases Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-cf-textDark">
              All Engineering Releases ({releaseContexts.length})
            </h2>
            <p className="text-xs text-cf-textMuted mt-0.5">
              Click any release below to inspect its derived readiness verdict and delivery metrics.
            </p>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cf-bgLight border-b border-cf-border text-cf-textMuted font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3">Release</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Lifecycle</th>
                  <th className="px-5 py-3">Target Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cf-border">
                {releaseContexts.map(c => {
                  const isCurrent =
                    selectedKey === `${c.workspace.id}:${c.project.id}:${c.release.id}`;
                  return (
                    <tr
                      key={`${c.workspace.id}:${c.project.id}:${c.release.id}`}
                      onClick={() =>
                        setSelectedKey(`${c.workspace.id}:${c.project.id}:${c.release.id}`)
                      }
                      className={`cursor-pointer transition-colors ${
                        isCurrent ? 'bg-cf-primary/5 font-medium' : 'hover:bg-cf-bgLight'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cf-textDark">{c.release.name}</span>
                          {c.release.releaseVersion && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-gray-100 rounded border font-semibold">
                              {c.release.releaseVersion}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] bg-cf-primary text-white px-1.5 py-0.5 rounded font-bold">
                              Selected
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-cf-textMuted">
                        {c.project.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                            LIFECYCLE_BADGE[c.release.lifecycleState]
                          }`}
                        >
                          {LIFECYCLE_LABEL[c.release.lifecycleState]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-cf-textMuted">
                        {c.release.targetDate || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/workspaces/${c.workspace.id}/projects/${c.project.id}/releases/${c.release.id}`}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center text-cf-primary hover:underline font-semibold"
                        >
                          Cockpit <ExternalLink size={12} className="ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Dashboard;
