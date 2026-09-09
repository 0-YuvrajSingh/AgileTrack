package com.agiletrack.backend.readiness.dto;

/**
 * Whether a release can ship.
 *
 * <p>Derived state. There is deliberately no endpoint, column or DTO field that sets it: it is
 * recomputed from committed rows on every read, so it cannot drift from the work items,
 * dependencies and governance it summarises.
 */
public enum ReadinessStatus {
    READY,
    NOT_READY
}
