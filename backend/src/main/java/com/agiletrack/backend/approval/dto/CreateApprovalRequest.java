package com.agiletrack.backend.approval.dto;

import com.agiletrack.backend.approval.entity.ApprovalDecision;
import jakarta.validation.constraints.NotNull;

public record CreateApprovalRequest(
        @NotNull(message = "Decision is required")
        ApprovalDecision decision
) {
}

