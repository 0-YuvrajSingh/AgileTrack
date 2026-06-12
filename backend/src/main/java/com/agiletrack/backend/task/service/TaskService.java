package com.agiletrack.backend.task.service;

import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.common.exception.UserNotFoundException;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.task.dto.CreateTaskRequest;
import com.agiletrack.backend.task.dto.TaskResponse;
import com.agiletrack.backend.task.dto.UpdateTaskRequest;
import com.agiletrack.backend.task.dto.UpdateTaskStatusRequest;
import com.agiletrack.backend.task.dto.AssignTaskRequest;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.task.mapper.TaskMapper;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.workspace.entity.WorkspaceRole;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final ProjectService projectService;
    private final UserRepository userRepository;
    private final WorkspaceService workspaceService;

    @Transactional
    public TaskResponse createTask(UUID workspaceId, UUID projectId, CreateTaskRequest request) {
        requireMutationAccess(workspaceId);
        Project project = getProject(workspaceId, projectId);
        User assignee = getValidatedAssignee(workspaceId, request.assigneeId());

        Task task = Task.builder()
                .title(request.title())
                .description(request.description())
                .status(TaskStatus.TODO)
                .priority(request.priority())
                .deadline(request.deadline())
                .project(project)
                .assignee(assignee)
                .build();

        task = taskRepository.save(task);
        return taskMapper.toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProject(UUID workspaceId, UUID projectId) {
        getProject(workspaceId, projectId);
        return taskRepository.findByProjectId(projectId)
                .stream()
                .map(taskMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(UUID workspaceId, UUID projectId, UUID taskId) {
        return taskMapper.toResponse(getTask(workspaceId, projectId, taskId));
    }

    @Transactional
    public TaskResponse updateTask(UUID workspaceId, UUID projectId, UUID taskId, UpdateTaskRequest request) {
        requireMutationAccess(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        User assignee = getValidatedAssignee(workspaceId, request.assigneeId());

        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setPriority(request.priority());
        task.setDeadline(request.deadline());
        task.setAssignee(assignee);

        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse updateTaskStatus(UUID workspaceId, UUID projectId, UUID taskId, UpdateTaskStatusRequest request) {
        requireMutationAccess(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        task.setStatus(request.status());
        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse assignTask(UUID workspaceId, UUID projectId, UUID taskId, AssignTaskRequest request) {
        requireMutationAccess(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        User assignee = getValidatedAssignee(workspaceId, request.assigneeId());

        task.setAssignee(assignee);
        return taskMapper.toResponse(task);
    }

    @Transactional
    public void deleteTask(UUID workspaceId, UUID projectId, UUID taskId) {
        requireMutationAccess(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        taskRepository.delete(task);
    }

    private Project getProject(UUID workspaceId, UUID projectId) {
        return projectService.getProject(workspaceId, projectId);
    }

    private Task getTask(UUID workspaceId, UUID projectId, UUID taskId) {
        getProject(workspaceId, projectId);
        return taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new TaskNotFoundException("Task not found"));
    }

    private void requireMutationAccess(UUID workspaceId) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        WorkspaceRole role = workspaceService.getMemberRole(workspaceId, currentUser.getId());

        if (role == WorkspaceRole.VIEWER) {
            throw new AccessDeniedException("VIEWER role cannot modify tasks");
        }
    }

    private User getValidatedAssignee(UUID workspaceId, UUID assigneeId) {
        if (!workspaceService.isWorkspaceMember(workspaceId, assigneeId)) {
            throw new IllegalArgumentException("Assignee must be a member of the workspace");
        }
        return userRepository.findById(assigneeId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + assigneeId));
    }
}