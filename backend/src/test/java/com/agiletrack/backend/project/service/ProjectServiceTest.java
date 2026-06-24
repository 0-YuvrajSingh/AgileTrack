package com.agiletrack.backend.project.service;

import com.agiletrack.backend.common.exception.ProjectNotFoundException;
import com.agiletrack.backend.project.dto.CreateProjectRequest;
import com.agiletrack.backend.project.dto.ProjectResponse;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.mapper.ProjectMapper;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.workspace.entity.Workspace;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock private WorkspaceService workspaceService;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMapper projectMapper;

    @InjectMocks
    private ProjectService projectService;

    private Workspace testWorkspace;
    private Project testProject;
    private UUID workspaceId;
    private UUID projectId;

    @BeforeEach
    void setUp() {
        workspaceId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        testWorkspace = Workspace.builder().id(workspaceId).name("WS").build();
        testProject = Project.builder().id(projectId).name("Proj").workspace(testWorkspace).build();
    }

    @Test
    void createProject_Success() {
        CreateProjectRequest request = new CreateProjectRequest("Proj", "Desc");
        when(workspaceService.getOwnedWorkspace(workspaceId)).thenReturn(testWorkspace);
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        ProjectResponse mockResponse = new ProjectResponse(
                projectId, "Proj", "Desc", ProjectStatus.PLANNING, workspaceId, null, null
        );
        when(projectMapper.toResponse(any(Project.class))).thenReturn(mockResponse);

        ProjectResponse response = projectService.createProject(workspaceId, request);

        assertThat(response.name()).isEqualTo("Proj");
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void getProject_NotFound_ThrowsException() {
        when(workspaceService.getOwnedWorkspace(workspaceId)).thenReturn(testWorkspace);
        when(projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.getProject(workspaceId, projectId))
                .isInstanceOf(ProjectNotFoundException.class);
    }
}