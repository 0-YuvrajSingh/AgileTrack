package com.agiletrack.backend.project.controller;

import com.agiletrack.backend.project.dto.CreateProjectRequest;
import com.agiletrack.backend.project.dto.ProjectResponse;
import com.agiletrack.backend.project.dto.UpdateProjectRequest;
import com.agiletrack.backend.project.dto.UpdateProjectStatusRequest;
import com.agiletrack.backend.project.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateProjectRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(projectService.createProject(workspaceId, request));
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getProjectsByWorkspace(
            @PathVariable UUID workspaceId
    ) {
        return ResponseEntity.ok(
                projectService.getProjectsByWorkspace(workspaceId)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProjectById(
            @PathVariable UUID workspaceId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                projectService.getProjectById(workspaceId, id)
        );
    }

    @PutMapping("/{id}")
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
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID workspaceId,
            @PathVariable UUID id
    ) {
        projectService.deleteProject(workspaceId, id);
        return ResponseEntity.noContent().build();
    }
}
