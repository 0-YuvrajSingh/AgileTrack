package com.agiletrack.backend.task.controller;

import com.agiletrack.backend.task.dto.CreateTaskRequest;
import com.agiletrack.backend.task.dto.TaskResponse;
import com.agiletrack.backend.task.dto.UpdateTaskRequest;
import com.agiletrack.backend.task.dto.UpdateTaskStatusRequest;
import com.agiletrack.backend.task.service.TaskService;
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
public class TaskController {

    private final TaskService taskService;

    @PostMapping
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
