import { apiClient } from '../api/axios';
import type { ApprovalDecision, ApprovalResponse } from '../types';

const projectUrl = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}`;

export const approvalService = {
  /** Retrieves the governance approval status for a CHANGE work item. */
  get: async (workspaceId: string, projectId: string, taskId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<ApprovalResponse>(
      `${projectUrl(workspaceId, projectId)}/tasks/${taskId}/approval`,
      { signal }
    );
    return response.data;
  },

  /** Submits an APPROVED or REJECTED decision on a CHANGE work item. */
  submitDecision: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    decision: ApprovalDecision
  ) => {
    const response = await apiClient.post<ApprovalResponse>(
      `${projectUrl(workspaceId, projectId)}/tasks/${taskId}/approval`,
      { decision }
    );
    return response.data;
  }
};
