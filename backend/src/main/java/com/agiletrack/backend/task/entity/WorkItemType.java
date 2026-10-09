package com.agiletrack.backend.task.entity;

/**
 * The kind of engineering work a work item represents.
 *
 * <p>Type is common to all work items and lives on {@code tasks}. Only
 * {@code FEATURE}, {@code BUG} and {@code TECH_DEBT} are in scope.
 */
public enum WorkItemType {
    FEATURE,
    BUG,
    TECH_DEBT
}
