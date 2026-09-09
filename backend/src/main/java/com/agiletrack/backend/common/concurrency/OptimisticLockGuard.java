package com.agiletrack.backend.common.concurrency;

import org.springframework.orm.ObjectOptimisticLockingFailureException;

/**
 * Enforces that a client is writing against the version of a record it actually read.
 *
 * <p>JPA's {@code @Version} only protects concurrent server-side transactions: each request
 * re-reads the row, so two sequential requests never collide no matter how stale the second
 * client's data is. Carrying the version through the API closes that gap — a client that read
 * version 3 and writes while the stored row is at version 4 is rejected rather than silently
 * overwriting the newer state.
 *
 * <p>A {@code null} expected version means the caller did not claim to have read anything, so
 * there is nothing to check. Endpoints that require the claim enforce it with bean validation.
 */
public final class OptimisticLockGuard {

    private OptimisticLockGuard() {
    }

    public static void requireCurrentVersion(Class<?> entityType, Object id, Long actual, Long expected) {
        if (expected != null && !expected.equals(actual)) {
            throw new ObjectOptimisticLockingFailureException(entityType, id);
        }
    }
}
