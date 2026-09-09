package com.agiletrack.backend.readiness.dto;

import com.agiletrack.backend.release.entity.ReleaseLifecycleState;

import java.util.List;
import java.util.UUID;

/**
 * The full readiness verdict for a release.
 *
 * <p>{@code NOT_READY} always carries at least one reason: a verdict a reviewer cannot act on is
 * not worth returning.
 */
public record ReleaseReadinessResponse(
        UUID releaseId,
        String releaseName,
        ReleaseLifecycleState lifecycleState,
        ReadinessStatus status,
        List<ReadinessReason> reasons,
        int totalWorkItems,
        int completedWorkItems
) {
}
