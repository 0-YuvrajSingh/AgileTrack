import { useState, useCallback, useEffect } from 'react';
import { workspaceService } from '../services/workspaceService';
import { getApiErrorMessage } from '../api/axios';
import type { WorkspaceMember } from '../types';

export function useWorkspaceMembers(workspaceId: string | undefined) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceService.getMembers(workspaceId, signal);
      setMembers(data);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, "Failed to load members"));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMembers(controller.signal);
    return () => controller.abort();
  }, [fetchMembers]);

  return { members, setMembers, loading, error, refetch: fetchMembers };
}
