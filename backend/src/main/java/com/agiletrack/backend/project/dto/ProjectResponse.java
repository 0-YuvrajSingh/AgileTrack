package com.agiletrack.backend.project.dto;

import com.agiletrack.backend.project.entity.ProjectStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectResponse (
        UUID id,
        String name,
        String description,
        ProjectStatus status,
        UUID workspaceId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

}
