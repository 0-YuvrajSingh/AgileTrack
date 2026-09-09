package com.agiletrack.backend.task.service;

import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.common.exception.UserNotFoundException;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.security.CurrentUserService;
import com.agiletrack.backend.task.dto.AssignTaskRequest;
import com.agiletrack.backend.task.dto.CreateTaskRequest;
import com.agiletrack.backend.task.dto.TaskResponse;
import com.agiletrack.backend.task.dto.UpdateTaskRequest;
import com.agiletrack.backend.task.dto.UpdateTaskStatusRequest;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.task.mapper.TaskMapper;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.task.entity.ActivityType;
import com.agiletrack.backend.task.entity.TaskActivity;
import com.agiletrack.backend.task.repository.TaskActivityRepository;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.agiletrack.backend.common.exception.BusinessRuleException;

import java.util.UUID;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final ProjectService projectService;
    private final UserRepository userRepository;
    private final WorkspaceService workspaceService;
    private final CurrentUserService currentUserService;
    private final TaskActivityRepository taskActivityRepository;

    private void recordActivity(Task task, ActivityType type, String details) {
        TaskActivity activity = TaskActivity.builder()
                .task(task)
                .user(currentUserService.getCurrentUser())
                .activityType(type)
                .details(details)
                .build();
        taskActivityRepository.save(activity);
    }

    @Transactional
    public TaskResponse createTask(UUID workspaceId, UUID projectId, CreateTaskRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = projectService.getProject(workspaceId, projectId);
        projectService.requireMutable(project);
        User assignee = request.assigneeId() != null
                ? getValidatedAssignee(workspaceId, request.assigneeId())
                : null;

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
        recordActivity(task, ActivityType.CREATED, "Task created");
        
        return taskMapper.toResponse(task);
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> getTasksByProject(UUID workspaceId, UUID projectId, String search, Pageable pageable) {
        projectService.getProject(workspaceId, projectId);

        Page<Task> tasks;
        if (search != null && !search.trim().isEmpty()) {
            tasks = taskRepository.findByProjectIdAndSearch(projectId, search.trim(), pageable);
        } else {
            tasks = taskRepository.findByProjectId(projectId, pageable);
        }

        return tasks.map(taskMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(UUID workspaceId, UUID projectId, UUID taskId) {
        return taskMapper.toResponse(getTask(workspaceId, projectId, taskId));
    }

    @Transactional
    public TaskResponse updateTask(UUID workspaceId, UUID projectId, UUID taskId, UpdateTaskRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        projectService.requireMutable(task.getProject());
        
        com.agiletrack.backend.task.entity.TaskPriority oldPriority = task.getPriority();
        
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setPriority(request.priority());
        task.setDeadline(request.deadline());
        task.setAssignee(request.assigneeId() != null
                ? getValidatedAssignee(workspaceId, request.assigneeId())
                : null);

        if (!Objects.equals(oldPriority, request.priority())) {
            recordActivity(task, ActivityType.PRIORITY_CHANGED, 
                    "Priority changed from " + oldPriority + " to " + request.priority());
        }

        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse updateTaskStatus(UUID workspaceId, UUID projectId, UUID taskId, UpdateTaskStatusRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        projectService.requireMutable(task.getProject());
        
        if (!task.canTransitionTo(request.status())) {
            throw new BusinessRuleException("Invalid task status transition: " + task.getStatus() + " -> " + request.status());
        }

        TaskStatus oldStatus = task.getStatus();
        if (oldStatus != request.status()) {
            ActivityType type = request.status() == TaskStatus.DONE 
                    ? ActivityType.COMPLETED 
                    : ActivityType.STATUS_CHANGED;
            recordActivity(task, type, "Status changed from " + oldStatus + " to " + request.status());
        }

        task.setStatus(request.status());
        if (request.position() != null) {
            task.setPosition(request.position());
        }
        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse assignTask(UUID workspaceId, UUID projectId, UUID taskId, AssignTaskRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        projectService.requireMutable(task.getProject());
        
        User assignee = getValidatedAssignee(workspaceId, request.assigneeId());

        User oldAssignee = task.getAssignee();
        if (oldAssignee == null || !oldAssignee.getId().equals(assignee.getId())) {
            recordActivity(task, ActivityType.ASSIGNED, "Assigned to " + assignee.getEmail());
        }

        task.setAssignee(assignee);
        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse updateTaskPosition(UUID workspaceId, UUID projectId, UUID taskId, Double position) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        projectService.requireMutable(task.getProject());
        
        task.setPosition(position);
        return taskMapper.toResponse(task);
    }

    @Transactional(readOnly = true)
    public java.util.List<com.agiletrack.backend.task.dto.TaskActivityResponse> getTaskActivities(UUID workspaceId, UUID projectId, UUID taskId) {
        // This validates workspace read access and parent-resource hierarchy
        Task task = getTask(workspaceId, projectId, taskId);
        
        return taskActivityRepository.findByTaskIdOrderByCreatedAtDesc(task.getId())
                .stream()
                .map(activity -> new com.agiletrack.backend.task.dto.TaskActivityResponse(
                        activity.getId(),
                        activity.getUser().getId(),
                        activity.getUser().getEmail(),
                        activity.getActivityType(),
                        activity.getDetails(),
                        activity.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public void deleteTask(UUID workspaceId, UUID projectId, UUID taskId) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);
        projectService.requireMutable(task.getProject());
        
        taskRepository.delete(task);
    }

    private Task getTask(UUID workspaceId, UUID projectId, UUID taskId) {
        Task task = taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new TaskNotFoundException("Task not found"));
        
        if (!task.getProject().getWorkspace().getId().equals(workspaceId)) {
            throw new TaskNotFoundException("Task not found");
        }
        
        return task;
    }

    private User getValidatedAssignee(UUID workspaceId, UUID assigneeId) {
        if (!workspaceService.isWorkspaceMember(workspaceId, assigneeId)) {
            throw new BusinessRuleException("Assignee must be a member of the workspace");
        }
        return userRepository.findById(assigneeId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + assigneeId));
    }
}
