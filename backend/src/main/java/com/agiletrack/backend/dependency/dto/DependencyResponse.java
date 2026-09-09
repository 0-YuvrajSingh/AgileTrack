package com.agiletrack.backend.dependency.dto;

import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.task.entity.TaskStatus;

import java.util.UUID;

/** One edge, rendered with enough of each endpoint for a UI to show it without extra lookups. */
public record DependencyResponse(
        UUID id,
        DependencyType type,
        UUID blockerWorkItemId,
        String blockerTitle,
        TaskStatus blockerStatus,
        UUID blockedWorkItemId,
        String blockedTitle,
        TaskStatus blockedStatus,
        /** Derived: a blocker stops mattering once it is DONE. */
        boolean resolved
) {
}
