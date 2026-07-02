package com.agiletrack.backend.project.service;

import com.agiletrack.backend.common.exception.ProjectNotFoundException;
import com.agiletrack.backend.project.dto.CreateProjectRequest;
import com.agiletrack.backend.project.dto.ProjectResponse;
import com.agiletrack.backend.project.dto.UpdateProjectRequest;
import com.agiletrack.backend.project.dto.UpdateProjectStatusRequest;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.mapper.ProjectMapper;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.workspace.entity.Workspace;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {
    private final WorkspaceService workspaceService;
    private final ProjectRepository projectRepository;
    private final ProjectMapper projectMapper;

    @Transactional
    public ProjectResponse createProject(UUID workspaceId, @Valid CreateProjectRequest request) {
        Workspace workspace = workspaceService.getWorkspaceForMutation(workspaceId);

        Project project = Project.builder()
                .name(request.name())
                .description(request.description())
                .status(ProjectStatus.PLANNING)
                .workspace(workspace)
                .build();

        project = projectRepository.save(project);
        return projectMapper.toResponse(project);
    }

    public Page<ProjectResponse> getProjectsByWorkspace(UUID workspaceId, String search, Pageable pageable) {
        workspaceService.getWorkspaceIfMember(workspaceId);

        Page<Project> projects;
        if (search != null && !search.trim().isEmpty()) {
            projects = projectRepository.findByWorkspaceIdAndSearch(workspaceId, search.trim(), pageable);
        } else {
            projects = projectRepository.findByWorkspaceId(workspaceId, pageable);
        }

        return projects.map(projectMapper::toResponse);
    }

    public ProjectResponse getProjectById(UUID workspaceId, UUID id) {
        Project project = getProject(workspaceId, id);
        return projectMapper.toResponse(project);
    }

    @Transactional
    public ProjectResponse updateProject(UUID workspaceId, UUID id, @Valid UpdateProjectRequest request) {
        Workspace workspace = workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = getProject(workspaceId, id);

        project.setName(request.name());
        project.setDescription(request.description());
        return projectMapper.toResponse(project);
    }

    @Transactional
    public ProjectResponse updateProjectStatus(UUID workspaceId, UUID id, @Valid UpdateProjectStatusRequest request) {
        Workspace workspace = workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = getProject(workspaceId, id);

        project.setStatus(request.status());
        return projectMapper.toResponse(project);
    }

    @Transactional
    public void deleteProject(UUID workspaceId, UUID id) {
        Workspace workspace = workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = getProject(workspaceId, id);

        projectRepository.delete(project);
    }

    public Project getProject(UUID workspaceId, UUID projectId) {
        workspaceService.getWorkspaceIfMember(workspaceId);
        return projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found"));
    }
}