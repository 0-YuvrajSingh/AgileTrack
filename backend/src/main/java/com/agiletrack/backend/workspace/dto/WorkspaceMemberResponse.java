package com.agiletrack.backend.workspace.dto;

import com.agiletrack.backend.workspace.entity.WorkspaceRole;

import java.util.UUID;

public record WorkspaceMemberResponse(
        UUID memberId,
        UUID userId,
        String email,
        WorkspaceRole role
) {
}
