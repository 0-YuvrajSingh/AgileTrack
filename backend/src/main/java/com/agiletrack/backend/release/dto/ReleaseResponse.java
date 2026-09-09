package com.agiletrack.backend.release.dto;

import com.agiletrack.backend.release.entity.ReleaseLifecycleState;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReleaseResponse(
        UUID id,
        String name,
        String releaseVersion,
        UUID projectId,
        ReleaseLifecycleState lifecycleState,
        LocalDate targetDate,
        /** Derived, not stored: whether the scope may still change. */
        boolean scopeLocked,
        /** Derived, not stored: whether the release's own fields may still be edited. */
        boolean editable,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Long version
) {
}
