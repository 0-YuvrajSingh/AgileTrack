package com.agiletrack.backend.approval.policy;

import com.agiletrack.backend.task.entity.RiskLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ChangeRiskPolicy — fixed governance approval policy")
class ChangeRiskPolicyTest {

    @Test
    @DisplayName("LOW risk does not require approval")
    void lowRisk_doesNotRequireApproval() {
        assertThat(ChangeRiskPolicy.requiresApproval(RiskLevel.LOW)).isFalse();
    }

    @Test
    @DisplayName("MEDIUM risk does not require approval")
    void mediumRisk_doesNotRequireApproval() {
        assertThat(ChangeRiskPolicy.requiresApproval(RiskLevel.MEDIUM)).isFalse();
    }

    @Test
    @DisplayName("HIGH risk requires approval")
    void highRisk_requiresApproval() {
        assertThat(ChangeRiskPolicy.requiresApproval(RiskLevel.HIGH)).isTrue();
    }

    @Test
    @DisplayName("CRITICAL risk requires approval")
    void criticalRisk_requiresApproval() {
        assertThat(ChangeRiskPolicy.requiresApproval(RiskLevel.CRITICAL)).isTrue();
    }

    @Test
    @DisplayName("Null risk level defaults to not requiring approval")
    void nullRisk_doesNotRequireApproval() {
        assertThat(ChangeRiskPolicy.requiresApproval(null)).isFalse();
    }
}

