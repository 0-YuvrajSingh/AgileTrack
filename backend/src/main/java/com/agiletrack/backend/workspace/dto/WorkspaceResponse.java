package com.agiletrack.backend.workspace.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.agiletrack.backend.workspace.entity.WorkspaceRole;

public record WorkspaceResponse(
        UUID id,
        String name,
        String description,
        UUID ownerId,
        WorkspaceRole myRole,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

}
