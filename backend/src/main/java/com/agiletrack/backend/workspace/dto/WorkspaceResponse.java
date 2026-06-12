package com.agiletrack.backend.workspace.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkspaceResponse(
        UUID id,
        String name,
        String description,
        UUID ownerId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

}
