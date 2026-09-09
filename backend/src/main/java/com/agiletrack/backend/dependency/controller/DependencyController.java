package com.agiletrack.backend.dependency.controller;

import com.agiletrack.backend.dependency.dto.BlockedWorkItemResponse;
import com.agiletrack.backend.dependency.dto.CreateDependencyRequest;
import com.agiletrack.backend.dependency.dto.DependencyResponse;
import com.agiletrack.backend.dependency.dto.WorkItemDependenciesResponse;
import com.agiletrack.backend.dependency.service.DependencyService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}")
@RequiredArgsConstructor
@Tag(name = "Dependency", description = "Endpoints for BLOCKS relationships between work items")
public class DependencyController {

    private final DependencyService dependencyService;

    @PostMapping("/tasks/{taskId}/dependencies")
    @Operation(summary = "Add a blocker",
            description = "Records that this work item is blocked by another one in the same project. "
                    + "Rejected if it would duplicate an edge or create a dependency cycle.")
    public ResponseEntity<DependencyResponse> addDependency(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @Valid @RequestBody CreateDependencyRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(dependencyService.addDependency(workspaceId, projectId, taskId, request));
    }

    @GetMapping("/tasks/{taskId}/dependencies")
    @Operation(summary = "Get a work item's dependencies",
            description = "Returns what blocks this work item and what it blocks, plus its derived blocked state.")
    public ResponseEntity<WorkItemDependenciesResponse> getDependencies(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId
    ) {
        return ResponseEntity.ok(dependencyService.getDependencies(workspaceId, projectId, taskId));
    }

    @DeleteMapping("/tasks/{taskId}/dependencies/{dependencyId}")
    @Operation(summary = "Remove a blocker", description = "Deletes a dependency edge. Audited on both work items.")
    public ResponseEntity<Void> removeDependency(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @PathVariable UUID dependencyId
    ) {
        dependencyService.removeDependency(workspaceId, projectId, taskId, dependencyId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/blocked-work-items")
    @Operation(summary = "List blocked work",
            description = "Every work item in the project with at least one unresolved blocker.")
    public ResponseEntity<List<BlockedWorkItemResponse>> getBlockedWorkItems(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId
    ) {
        return ResponseEntity.ok(dependencyService.getBlockedWorkItems(workspaceId, projectId));
    }
}
