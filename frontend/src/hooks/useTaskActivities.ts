import { useState, useCallback } from 'react';
import { activityService } from '../services/activityService';
import { getApiErrorMessage } from '../api/axios';
import type { TaskActivityResponse } from '../types';

export function useTaskActivities() {
  const [activities, setActivities] = useState<TaskActivityResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (workspaceId: string, projectId: string, taskId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await activityService.listForTask(workspaceId, projectId, taskId);
      setActivities(data);
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Failed to load activities"));
    } finally {
      setLoading(false);
    }
  }, []);

  return { activities, loading, error, fetchActivities };
}
