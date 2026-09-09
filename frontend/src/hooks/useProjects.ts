import { useState, useCallback, useEffect } from 'react';
import { projectService } from '../services/projectService';
import { getApiErrorMessage } from '../api/axios';
import type { Project, PageResponse } from '../types';

export function useProject(workspaceId: string | undefined, projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId || !projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.get(workspaceId, projectId, signal);
      setProject(data);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, "Failed to load project"));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProject(controller.signal);
    return () => controller.abort();
  }, [fetchProject]);

  return { project, setProject, loading, error, refetch: fetchProject };
}

export function useProjects(workspaceId: string | undefined) {
  const [projects, setProjects] = useState<PageResponse<Project> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (search?: string, signal?: AbortSignal) => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.list(workspaceId, search, 0, 10, signal);
      setProjects(data);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, "Failed to load projects"));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(undefined, controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  return { projects, setProjects, loading, error, refetch: fetchProjects };
}
