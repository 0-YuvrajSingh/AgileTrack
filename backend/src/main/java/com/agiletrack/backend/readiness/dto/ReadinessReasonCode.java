package com.agiletrack.backend.readiness.dto;

/**
 * Why a release is not ready.
 *
 * <p>Stable, machine-readable codes: a client branches on these, and the human-readable detail
 * beside them is free to change wording without breaking anything.
 *
 * <p>Declaration order is also the display order, so a given database state always produces the
 * same reason list in the same sequence.
 */
public enum ReadinessReasonCode {

    /** The release has been abandoned, so shipping it is not meaningful. */
    RELEASE_CANCELLED,

    /** The release contains no work items; there is nothing to ship. */
    EMPTY_RELEASE,

    /** A work item in the release is not DONE. */
    INCOMPLETE_WORK,

    /** A work item in the release is held up by an unresolved blocker. */
    BLOCKED_WORK,

    /** A controlled change in the release still needs approval. Populated from Phase 5 onward. */
    APPROVAL_REQUIRED
}
