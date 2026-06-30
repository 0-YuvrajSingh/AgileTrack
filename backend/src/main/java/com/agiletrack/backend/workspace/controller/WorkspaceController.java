package com.agiletrack.backend.workspace.controller;

import com.agiletrack.backend.workspace.dto.CreateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.InviteMemberRequest;
import com.agiletrack.backend.workspace.dto.UpdateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.WorkspaceResponse;
import com.agiletrack.backend.workspace.service.WorkspaceService;
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
@RequestMapping("/api/v1/workspaces")
@RequiredArgsConstructor
@Tag(name = "Workspace", description = "Endpoints for managing workspaces and invitations")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping
    @Operation(summary = "Create a new workspace", description = "Creates a workspace and assigns the current user as the OWNER.")
    public ResponseEntity<WorkspaceResponse> createWorkspace(
            @Valid @RequestBody CreateWorkspaceRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workspaceService.create(request));
    }

    @GetMapping
    @Operation(summary = "List workspaces", description = "Retrieves all workspaces the current authenticated user belongs to.")
    public ResponseEntity<List<WorkspaceResponse>> getAllWorkspaces() {
        return ResponseEntity.ok(workspaceService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get workspace details", description = "Retrieves details of a specific workspace if the user is a member.")
    public ResponseEntity<WorkspaceResponse> getWorkspaceById(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(workspaceService.findById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update workspace", description = "Updates settings of a workspace. Requires OWNER role.")
    public ResponseEntity<WorkspaceResponse> updateWorkspace(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateWorkspaceRequest request
    ) {
        return ResponseEntity.ok(
                workspaceService.update(request, id)
        );
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete workspace", description = "Deletes workspace entirely. Requires OWNER role.")
    public ResponseEntity<Void> deleteWorkspace(
            @PathVariable UUID id
    ) {
        workspaceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    @Operation(summary = "Invite workspace member", description = "Adds a user to the workspace with specified role. Requires OWNER role.")
    public ResponseEntity<Void> inviteMember(
            @PathVariable UUID id,
            @Valid @RequestBody InviteMemberRequest request
            ) {
        workspaceService.inviteMember(id, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/members")
    @Operation(summary = "List workspace members", description = "Retrieves all members of a workspace. Requires membership.")
    public ResponseEntity<List<com.agiletrack.backend.workspace.dto.WorkspaceMemberResponse>> getMembers(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(workspaceService.getMembers(id));
    }
}
