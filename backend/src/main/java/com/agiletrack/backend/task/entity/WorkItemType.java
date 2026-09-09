package com.agiletrack.backend.task.entity;

/**
 * The kind of engineering work a work item represents.
 *
 * <p>Type is common to all work items and lives on {@code tasks}. Data that only one type needs
 * and that drives its own business rule (change risk and approvals, for example) is modelled
 * separately rather than as nullable columns here.
 */
public enum WorkItemType {
    FEATURE,
    BUG,
    CHANGE,
    TECH_DEBT
}
