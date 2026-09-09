import { useState, useCallback, useEffect } from 'react';
import { dependencyService } from '../services/dependencyService';
import { getApiErrorMessage } from '../api/axios';
import type { BlockedWorkItem, WorkItemDependencies } from '../types';

export function useDependencies(
  workspaceId: string | undefined,
  projectId: string | undefined,
  taskId: string | undefined
) {
  const [dependencies, setDependencies] = useState<WorkItemDependencies | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId || !projectId || !taskId) {
      setDependencies(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setDependencies(await dependencyService.get(workspaceId, projectId, taskId, signal));
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, 'Failed to load dependencies'));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, taskId]);

  useEffect(() => {
    const controller = new AbortController();
    refetch(controller.signal);
    return () => controller.abort();
  }, [refetch]);

  return { dependencies, loading, error, refetch };
}

/** Project-wide blocked state, loaded once for the board rather than per card. */
export function useBlockedWorkItems(workspaceId: string | undefined, projectId: string | undefined) {
  const [blocked, setBlocked] = useState<BlockedWorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId || !projectId) return;
    try {
      setLoading(true);
      setBlocked(await dependencyService.blockedWorkItems(workspaceId, projectId, signal));
    } catch (e: any) {
      // Blocked state decorates the board; failing to load it must not break the board itself.
      if (e?.name !== 'CanceledError') {
        setBlocked([]);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    const controller = new AbortController();
    refetch(controller.signal);
    return () => controller.abort();
  }, [refetch]);

  return { blocked, loading, refetch };
}
