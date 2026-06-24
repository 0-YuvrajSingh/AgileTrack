package com.agiletrack.backend.task.service;

import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.mapper.TaskMapper;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @InjectMocks
    private TaskService taskService;

    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;
    private Project testProject;

    @BeforeEach
    void setUp() {
        workspaceId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        taskId = UUID.randomUUID();
        testProject = Project.builder().id(projectId).build();
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
        when(projectService.getProject(workspaceId, projectId)).thenReturn(testProject);
        when(taskRepository.findByIdAndProjectId(taskId, projectId)).thenReturn(Optional.of(task));

        taskService.deleteTask(workspaceId, projectId, taskId);

        verify(taskRepository).delete(task);
    }
}