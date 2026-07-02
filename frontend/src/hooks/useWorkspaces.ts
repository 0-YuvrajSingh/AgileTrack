import { useCallback, useEffect, useState } from 'react';
import type { Workspace } from '../types';
import { workspaceService } from '../services/workspaceService';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkspaces(await workspaceService.list());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { workspaces, loading, error, refetch };
}
