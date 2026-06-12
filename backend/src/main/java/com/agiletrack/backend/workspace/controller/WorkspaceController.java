package com.agiletrack.backend.workspace.controller;

import com.agiletrack.backend.workspace.dto.CreateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.InviteMemberRequest;
import com.agiletrack.backend.workspace.dto.UpdateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.WorkspaceResponse;
import com.agiletrack.backend.workspace.service.WorkspaceService;
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
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping
    public ResponseEntity<WorkspaceResponse> createWorkspace(
            @Valid @RequestBody CreateWorkspaceRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workspaceService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<WorkspaceResponse>> getAllWorkspaces() {
        return ResponseEntity.ok(workspaceService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkspaceResponse> getWorkspaceById(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(workspaceService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkspaceResponse> updateWorkspace(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateWorkspaceRequest request
    ) {
        return ResponseEntity.ok(
                workspaceService.update(request, id)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkspace(
            @PathVariable UUID id
    ) {
        workspaceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<Void> inviteMember(
            @PathVariable UUID id,
            @Valid @RequestBody InviteMemberRequest request
            ) {
        workspaceService.inviteMember(id, request);
        return ResponseEntity.ok().build();
    }
}
