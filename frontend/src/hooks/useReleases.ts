import { useState, useCallback, useEffect } from 'react';
import { releaseService } from '../services/releaseService';
import { getApiErrorMessage } from '../api/axios';
import type { Release, Task } from '../types';

export function useReleases(workspaceId: string | undefined, projectId: string | undefined) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId || !projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await releaseService.list(workspaceId, projectId, signal);
      setReleases(data.content);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, 'Failed to load releases'));
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

  return { releases, setReleases, loading, error, refetch };
}

export function useRelease(
  workspaceId: string | undefined,
  projectId: string | undefined,
  releaseId: string | undefined
) {
  const [release, setRelease] = useState<Release | null>(null);
  const [workItems, setWorkItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId || !projectId || !releaseId) return;
    try {
      setLoading(true);
      setError(null);
      // The scope list is only meaningful alongside the release it belongs to, so both
      // are loaded together and the view never renders a half-updated pair.
      const [releaseData, items] = await Promise.all([
        releaseService.get(workspaceId, projectId, releaseId, signal),
        releaseService.workItems(workspaceId, projectId, releaseId, signal)
      ]);
      setRelease(releaseData);
      setWorkItems(items);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, 'Failed to load release'));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, releaseId]);

  useEffect(() => {
    const controller = new AbortController();
    refetch(controller.signal);
    return () => controller.abort();
  }, [refetch]);

  return { release, workItems, loading, error, refetch };
}
