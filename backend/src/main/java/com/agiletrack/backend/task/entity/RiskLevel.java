package com.agiletrack.backend.task.entity;

/**
 * The assessed risk level of a CHANGE work item.
 *
 * <p>Determines whether governance approval is required for a release to be READY.
 * By policy:
 * <ul>
 *   <li>LOW: approval not required</li>
 *   <li>MEDIUM: approval not required</li>
 *   <li>HIGH: approval required</li>
 *   <li>CRITICAL: approval required</li>
 * </ul>
 */
public enum RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}

