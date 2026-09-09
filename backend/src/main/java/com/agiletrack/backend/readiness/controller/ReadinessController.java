package com.agiletrack.backend.readiness.controller;

import com.agiletrack.backend.readiness.dto.ReleaseReadinessResponse;
import com.agiletrack.backend.readiness.service.ReadinessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Read-only by design. Readiness is derived from committed state, so there is no endpoint that
 * sets it — that absence is the enforcement of frozen business rule #7.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/releases/{releaseId}")
@RequiredArgsConstructor
@Tag(name = "Readiness", description = "Derived release readiness evaluation")
public class ReadinessController {

    private final ReadinessService readinessService;

    @GetMapping("/readiness")
    @Operation(summary = "Evaluate release readiness",
            description = "Recomputes READY / NOT_READY from committed state. Every NOT_READY "
                    + "result carries machine-readable reason codes plus human-readable detail.")
    public ResponseEntity<ReleaseReadinessResponse> getReadiness(
            @PathVariable UUID workspaceId,
            @PathVariable UUID projectId,
            @PathVariable UUID releaseId
    ) {
        return ResponseEntity.ok(readinessService.evaluate(workspaceId, projectId, releaseId));
    }
}
