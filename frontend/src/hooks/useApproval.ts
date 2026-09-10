import { useState, useCallback, useEffect } from 'react';
import { approvalService } from '../services/approvalService';
import { getApiErrorMessage } from '../api/axios';
import type { ApprovalDecision, ApprovalResponse } from '../types';

export function useApproval(
  workspaceId: string | undefined,
  projectId: string | undefined,
  taskId: string | undefined
) {
  const [approval, setApproval] = useState<ApprovalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId || !projectId || !taskId) {
      setApproval(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setApproval(await approvalService.get(workspaceId, projectId, taskId, signal));
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, 'Failed to load approval status'));
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

  const submitDecision = async (decision: ApprovalDecision) => {
    if (!workspaceId || !projectId || !taskId) return;
    const updated = await approvalService.submitDecision(workspaceId, projectId, taskId, decision);
    setApproval(updated);
    return updated;
  };

  return { approval, loading, error, submitDecision, refetch };
}
