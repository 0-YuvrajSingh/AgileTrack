package com.agiletrack.backend.release.controller;

import com.agiletrack.backend.release.dto.CreateReleaseRequest;
import com.agiletrack.backend.release.dto.ReleaseResponse;
import com.agiletrack.backend.release.dto.UpdateReleaseLifecycleRequest;
import com.agiletrack.backend.release.dto.UpdateReleaseRequest;
import com.agiletrack.backend.release.service.ReleaseService;
import com.agiletrack.backend.task.dto.TaskResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/releases")
@RequiredArgsConstructor
@Tag(name = "Release", description = "Endpoints for managing delivery releases inside a project")
public class ReleaseController {

    private final ReleaseService releaseService;

    @PostMapping
    @Operation(summary = "Create release", description = "Creates a new release in the specified project.")
    public ResponseEntity<ReleaseResponse> createRelease(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateReleaseRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(releaseService.createRelease(workspaceId, projectId, request));
    }

    @GetMapping
    @Operation(summary = "List releases", description = "Retrieves releases for the specified project.")
    public ResponseEntity<Page<ReleaseResponse>> getReleases(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PageableDefault(size = 50) Pageable pageable
    ) {
        return ResponseEntity.ok(releaseService.getReleasesByProject(workspaceId, projectId, pageable));
    }

    @GetMapping("/{releaseId}")
    @Operation(summary = "Get release", description = "Retrieves a single release.")
    public ResponseEntity<ReleaseResponse> getRelease(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId
    ) {
        return ResponseEntity.ok(releaseService.getReleaseById(workspaceId, projectId, releaseId));
    }

    @PutMapping("/{releaseId}")
    @Operation(summary = "Update release", description = "Updates a release's name, version and target date.")
    public ResponseEntity<ReleaseResponse> updateRelease(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId,
            @Valid @RequestBody UpdateReleaseRequest request
    ) {
        return ResponseEntity.ok(releaseService.updateRelease(workspaceId, projectId, releaseId, request));
    }

    @PatchMapping("/{releaseId}/lifecycle")
    @Operation(summary = "Change release lifecycle state",
            description = "Advances the release through PLANNED, IN_PROGRESS, RELEASED or CANCELLED.")
    public ResponseEntity<ReleaseResponse> updateLifecycle(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId,
            @Valid @RequestBody UpdateReleaseLifecycleRequest request
    ) {
        return ResponseEntity.ok(releaseService.updateLifecycle(workspaceId, projectId, releaseId, request));
    }

    @DeleteMapping("/{releaseId}")
    @Operation(summary = "Delete release",
            description = "Deletes a release. Permitted only while the release is still PLANNED.")
    public ResponseEntity<Void> deleteRelease(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId
    ) {
        releaseService.deleteRelease(workspaceId, projectId, releaseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{releaseId}/work-items")
    @Operation(summary = "List release scope", description = "Retrieves the work items in this release.")
    public ResponseEntity<List<TaskResponse>> getWorkItems(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId
    ) {
        return ResponseEntity.ok(releaseService.getWorkItems(workspaceId, projectId, releaseId));
    }

    @PutMapping("/{releaseId}/work-items/{taskId}")
    @Operation(summary = "Add work item to release",
            description = "Adds a work item to the release scope. Rejected once the scope is locked.")
    public ResponseEntity<TaskResponse> addWorkItem(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId,
            @PathVariable UUID taskId
    ) {
        return ResponseEntity.ok(releaseService.addWorkItem(workspaceId, projectId, releaseId, taskId));
    }

    @DeleteMapping("/{releaseId}/work-items/{taskId}")
    @Operation(summary = "Remove work item from release",
            description = "Removes a work item from the release scope. Rejected once the scope is locked.")
    public ResponseEntity<TaskResponse> removeWorkItem(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId,
            @PathVariable UUID taskId
    ) {
        return ResponseEntity.ok(releaseService.removeWorkItem(workspaceId, projectId, releaseId, taskId));
    }
}
