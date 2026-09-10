package com.agiletrack.backend.approval.policy;

import com.agiletrack.backend.task.entity.RiskLevel;

/**
 * Explicit fixed policy for change governance.
 *
 * <p>LOW and MEDIUM risk changes do not require approval.
 * HIGH and CRITICAL risk changes require approval before participating in a READY release.
 */
public final class ChangeRiskPolicy {

    private ChangeRiskPolicy() {
    }

    public static boolean requiresApproval(RiskLevel riskLevel) {
        if (riskLevel == null) {
            return false;
        }
        return switch (riskLevel) {
            case LOW, MEDIUM -> false;
            case HIGH, CRITICAL -> true;
        };
    }
}

