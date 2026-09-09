package com.agiletrack.backend.task.service;

import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.security.CurrentUserService;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.mapper.TaskMapper;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.workspace.entity.WorkspaceRole;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private TaskMapper taskMapper;
    @Mock private ProjectService projectService;
    @Mock private UserRepository userRepository;
    @Mock private WorkspaceService workspaceService;
    @Mock private CurrentUserService currentUserService;

    @InjectMocks
    private TaskService taskService;

    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;
    private UUID userId;
    private User testUser;
    private Project testProject;

    @BeforeEach
    void setUp() {
        workspaceId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        taskId = UUID.randomUUID();
        userId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .email("user@agiletrack.com")
                .password("password")
                .role(Role.USER)
                .build();

        com.agiletrack.backend.workspace.entity.Workspace testWorkspace = 
                com.agiletrack.backend.workspace.entity.Workspace.builder()
                .id(workspaceId).build();

        testProject = Project.builder()
                .id(projectId)
                .workspace(testWorkspace)
                .build();
    }

    @Test
    void getTaskById_NotFound_ThrowsException() {
        when(taskRepository.findByIdAndProjectId(taskId, projectId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(workspaceId, projectId, taskId))
                .isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    void deleteTask_Success() {
        Task task = Task.builder().id(taskId).project(testProject).build();
        when(workspaceService.getWorkspaceForMutation(workspaceId)).thenReturn(testProject.getWorkspace());
        when(taskRepository.findByIdAndProjectId(taskId, projectId)).thenReturn(Optional.of(task));

        taskService.deleteTask(workspaceId, projectId, taskId);

        verify(taskRepository).delete(task);
    }

    @Test
    void deleteTask_Viewer_ThrowsException() {
        when(workspaceService.getWorkspaceForMutation(workspaceId)).thenThrow(new AccessDeniedException("VIEWER role cannot perform this action"));

        assertThatThrownBy(() -> taskService.deleteTask(workspaceId, projectId, taskId))
                .isInstanceOf(AccessDeniedException.class);

        verify(taskRepository, never()).delete(any());
    }
}
