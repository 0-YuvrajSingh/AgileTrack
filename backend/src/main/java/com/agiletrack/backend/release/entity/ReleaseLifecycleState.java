package com.agiletrack.backend.release.entity;

/**
 * Where a release sits in its delivery lifecycle.
 *
 * <p>The state decides two separate things: whether the release's own fields may be edited, and
 * whether its scope (which work items it contains) may still change. Scope locks earlier than
 * editing does — once execution starts, what ships is fixed even though the target date is not.
 */
public enum ReleaseLifecycleState {

    /** Scope is being assembled. Everything is editable. */
    PLANNED,

    /** Execution has started. Fields stay editable; scope is locked. */
    IN_PROGRESS,

    /** Shipped. Terminal: nothing may change. */
    RELEASED,

    /** Abandoned. Terminal: nothing may change. This is the archive path for a release. */
    CANCELLED;

    public boolean isTerminal() {
        return this == RELEASED || this == CANCELLED;
    }

    /** Scope changes are only safe before execution begins. */
    public boolean allowsScopeChange() {
        return this == PLANNED;
    }

    /** A terminal release is a historical record, not a working document. */
    public boolean allowsFieldEdit() {
        return !isTerminal();
    }

    public boolean canTransitionTo(ReleaseLifecycleState target) {
        if (this == target) {
            return true;
        }
        return switch (this) {
            case PLANNED -> target == IN_PROGRESS || target == CANCELLED;
            case IN_PROGRESS -> target == RELEASED || target == CANCELLED;
            case RELEASED, CANCELLED -> false;
        };
    }
}
