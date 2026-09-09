import { useState, useCallback, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { getApiErrorMessage } from '../api/axios';
import type { Task } from '../types';


export function useTasks(workspaceId: string | undefined, projectId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (search?: string, signal?: AbortSignal) => {
    if (!workspaceId || !projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.list(workspaceId, projectId, search, 'position,asc', signal);
      setTasks(data.content);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, "Failed to load tasks"));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    const controller = new AbortController();
    refetch(undefined, controller.signal);
    return () => controller.abort();
  }, [refetch]);

  return { tasks, setTasks, loading, error, refetch };
}
