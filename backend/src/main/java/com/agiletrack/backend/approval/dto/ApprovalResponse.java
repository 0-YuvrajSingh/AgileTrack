package com.agiletrack.backend.approval.dto;

import com.agiletrack.backend.approval.entity.ApprovalDecision;
import com.agiletrack.backend.task.entity.RiskLevel;

import java.time.LocalDateTime;
import java.util.UUID;

public record ApprovalResponse(
        UUID id,
        UUID workItemId,
        RiskLevel riskLevel,
        boolean approvalRequired,
        ApprovalDecision decision,
        UUID approverId,
        String approverEmail,
        LocalDateTime createdAt
) {
}

