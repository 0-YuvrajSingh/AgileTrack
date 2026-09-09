package com.agiletrack.backend.task.entity;

public enum ActivityType {
    CREATED,
    ASSIGNED,
    STATUS_CHANGED,
    PRIORITY_CHANGED,
    TYPE_CHANGED,
    RELEASE_ASSIGNED,
    RELEASE_UNASSIGNED,
    DEPENDENCY_ADDED,
    DEPENDENCY_REMOVED,
    COMPLETED
}
