package com.agiletrack.backend.task.controller;

import com.agiletrack.backend.task.dto.CreateTaskRequest;
import com.agiletrack.backend.task.dto.TaskResponse;
import com.agiletrack.backend.task.dto.UpdateTaskRequest;
import com.agiletrack.backend.task.dto.UpdateTaskStatusRequest;
import com.agiletrack.backend.task.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks")
@RequiredArgsConstructor
@Tag(name = "Task", description = "Endpoints for managing tasks inside projects")
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    @Operation(summary = "Create task", description = "Creates a new task within the specified project.")
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateTaskRequest request
    ) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(taskService.createTask(
                        workspaceId,
                        projectId,
                        request
                ));
    }

    @GetMapping
    @Operation(summary = "List project tasks", description = "Retrieves all tasks for the specified project.")
    public ResponseEntity<List<TaskResponse>> getTasksByProject(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId
    ) {

        return ResponseEntity.ok(
                taskService.getTasksByProject(
                        workspaceId,
                        projectId
                )
        );
    }

    @GetMapping("/{taskId}")
    @Operation(summary = "Get task details", description = "Retrieves details of a specific task.")
    public ResponseEntity<TaskResponse> getTaskById(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId
    ) {

        return ResponseEntity.ok(
                taskService.getTaskById(
                        workspaceId,
                        projectId,
                        taskId
                )
        );
    }

    @PutMapping("/{taskId}")
    @Operation(summary = "Update task", description = "Updates settings and content of a specific task.")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskRequest request
    ) {

        return ResponseEntity.ok(
                taskService.updateTask(
                        workspaceId,
                        projectId,
                        taskId,
                        request
                )
        );
    }

    @PatchMapping("/{taskId}/status")
    @Operation(summary = "Update task status", description = "Updates the status of a specific task (e.g. TODO, IN_PROGRESS, DONE).")
    public ResponseEntity<TaskResponse> updateTaskStatus(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request
    ) {

        return ResponseEntity.ok(
                taskService.updateTaskStatus(
                        workspaceId,
                        projectId,
                        taskId,
                        request
                )
        );
    }

    @DeleteMapping("/{taskId}")
    @Operation(summary = "Delete task", description = "Deletes a specific task.")
    public ResponseEntity<Void> deleteTask(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId
    ) {

        taskService.deleteTask(
                workspaceId,
                projectId,
                taskId
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{taskId}/assignee")
    @Operation(summary = "Assign task", description = "Assigns the task to a user who is a member of the workspace.")
    public ResponseEntity<TaskResponse> assignTask(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @Valid @RequestBody com.agiletrack.backend.task.dto.AssignTaskRequest request
    ) {
        return ResponseEntity.ok(
                taskService.assignTask(workspaceId, projectId, taskId, request)
        );
    }
}
