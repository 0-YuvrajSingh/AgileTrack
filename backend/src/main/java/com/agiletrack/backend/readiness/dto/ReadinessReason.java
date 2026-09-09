package com.agiletrack.backend.readiness.dto;

import java.util.UUID;

/**
 * One specific thing standing between a release and shipping.
 *
 * @param code         stable code for clients to branch on
 * @param workItemId   the work item at fault, or null for a release-level reason
 * @param workItemTitle the same work item's title, for display without a second lookup
 * @param detail       human-readable explanation
 */
public record ReadinessReason(
        ReadinessReasonCode code,
        UUID workItemId,
        String workItemTitle,
        String detail
) {
}
