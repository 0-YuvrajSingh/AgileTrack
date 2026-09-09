package com.agiletrack.backend.task.dto;

import com.agiletrack.backend.task.entity.ActivityType;

import java.time.ZonedDateTime;
import java.util.UUID;

public record TaskActivityResponse(
        UUID id,
        UUID userId,
        String userEmail,
        ActivityType type,
        String details,
        ZonedDateTime createdAt
) {
}
