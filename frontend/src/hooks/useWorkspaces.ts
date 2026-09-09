import { useState, useCallback, useEffect } from 'react';
import { workspaceService } from '../services/workspaceService';
import { getApiErrorMessage } from '../api/axios';
import type { Workspace } from '../types';

export function useWorkspace(workspaceId: string | undefined) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceService.get(workspaceId, signal);
      setWorkspace(data);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, "Failed to load workspace"));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkspace(controller.signal);
    return () => controller.abort();
  }, [fetchWorkspace]);

  return { workspace, setWorkspace, loading, error, refetch: fetchWorkspace };
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async (search?: string, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceService.list(search, signal);
      setWorkspaces(data);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, "Failed to load workspaces"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkspaces(undefined, controller.signal);
    return () => controller.abort();
  }, [fetchWorkspaces]);

  return { workspaces, setWorkspaces, loading, error, refetch: fetchWorkspaces };
}
