package com.agiletrack.backend.task.service;

import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.mapper.TaskMapper;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.workspace.entity.WorkspaceRole;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private TaskMapper taskMapper;
    @Mock private ProjectService projectService;
    @Mock private UserRepository userRepository;
    @Mock private WorkspaceService workspaceService;

    @InjectMocks
    private TaskService taskService;

    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;
    private UUID userId;
    private Project testProject;

    @BeforeEach
    void setUp() {
        workspaceId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        taskId = UUID.randomUUID();
        userId = UUID.randomUUID();
        testProject = Project.builder().id(projectId).build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getTaskById_NotFound_ThrowsException() {
        when(projectService.getProject(workspaceId, projectId)).thenReturn(testProject);
        when(taskRepository.findByIdAndProjectId(taskId, projectId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(workspaceId, projectId, taskId))
                .isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    void deleteTask_Success() {
        Task task = Task.builder().id(taskId).build();
        setCurrentUser();
        when(workspaceService.getMemberRole(workspaceId, userId)).thenReturn(WorkspaceRole.OWNER);
        when(projectService.getProject(workspaceId, projectId)).thenReturn(testProject);
        when(taskRepository.findByIdAndProjectId(taskId, projectId)).thenReturn(Optional.of(task));

        taskService.deleteTask(workspaceId, projectId, taskId);

        verify(taskRepository).delete(task);
    }

    @Test
    void deleteTask_Viewer_ThrowsException() {
        setCurrentUser();
        when(workspaceService.getMemberRole(workspaceId, userId)).thenReturn(WorkspaceRole.VIEWER);

        assertThatThrownBy(() -> taskService.deleteTask(workspaceId, projectId, taskId))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        
        verify(taskRepository, never()).delete(any());
    }

    private void setCurrentUser() {
        User user = User.builder()
                .id(userId)
                .email("user@agiletrack.com")
                .password("password")
                .role(Role.USER)
                .build();
        CustomUserDetails userDetails = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities())
        );
    }
}
