package com.agiletrack.backend.approval.controller;

import com.agiletrack.backend.approval.dto.ApprovalResponse;
import com.agiletrack.backend.approval.dto.CreateApprovalRequest;
import com.agiletrack.backend.approval.service.ApprovalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}")
@RequiredArgsConstructor
@Tag(name = "Approval", description = "Endpoints for CHANGE work item approval governance")
public class ApprovalController {

    private final ApprovalService approvalService;

    @GetMapping({"/tasks/{taskId}/approval", "/changes/{taskId}/approval"})
    @Operation(summary = "Get change approval status",
            description = "Retrieves the current approval decision and risk governance state for a CHANGE work item.")
    public ResponseEntity<ApprovalResponse> getApproval(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId
    ) {
        return ResponseEntity.ok(approvalService.getApproval(workspaceId, projectId, taskId));
    }

    @PostMapping({"/tasks/{taskId}/approval", "/changes/{taskId}/approval"})
    @Operation(summary = "Submit approval decision",
            description = "Records an APPROVED or REJECTED decision on a CHANGE work item. Audited transactionally.")
    public ResponseEntity<ApprovalResponse> submitDecision(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @Valid @RequestBody CreateApprovalRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(approvalService.submitDecision(workspaceId, projectId, taskId, request));
    }
}

