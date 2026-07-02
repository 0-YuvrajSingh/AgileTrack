package com.agiletrack.backend.project.controller;

import com.agiletrack.backend.project.dto.CreateProjectRequest;
import com.agiletrack.backend.project.dto.ProjectResponse;
import com.agiletrack.backend.project.dto.UpdateProjectRequest;
import com.agiletrack.backend.project.dto.UpdateProjectStatusRequest;
import com.agiletrack.backend.project.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects")
@RequiredArgsConstructor
@Tag(name = "Project", description = "Endpoints for managing projects inside a workspace")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @Operation(summary = "Create a project", description = "Creates a new project in the specified workspace.")
    public ResponseEntity<ProjectResponse> createProject(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateProjectRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(projectService.createProject(workspaceId, request));
    }

    @GetMapping
    @Operation(summary = "List workspace projects", description = "Retrieves projects belonging to the specified workspace with pagination.")
    public ResponseEntity<Page<ProjectResponse>> getProjectsByWorkspace(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return ResponseEntity.ok(
                projectService.getProjectsByWorkspace(workspaceId, search, pageable)
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project details", description = "Retrieves details of a specific project.")
    public ResponseEntity<ProjectResponse> getProjectById(
            @PathVariable UUID workspaceId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                projectService.getProjectById(workspaceId, id)
        );
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update project", description = "Updates settings of a specific project.")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID workspaceId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectRequest request
    ) {
        return ResponseEntity.ok(
                projectService.updateProject(workspaceId, id, request)
        );
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update project status", description = "Updates the health status of a project.")
    public ResponseEntity<ProjectResponse> updateProjectStatus(
            @PathVariable UUID workspaceId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectStatusRequest request
    ) {
        return ResponseEntity.ok(
                projectService.updateProjectStatus(workspaceId, id, request)
        );
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete project", description = "Deletes a project from the workspace.")
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID workspaceId,
            @PathVariable UUID id
    ) {
        projectService.deleteProject(workspaceId, id);
        return ResponseEntity.noContent().build();
    }
}
