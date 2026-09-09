package com.agiletrack.backend.workspace.mapper;

import com.agiletrack.backend.workspace.dto.WorkspaceResponse;
import com.agiletrack.backend.workspace.entity.Workspace;
import org.springframework.stereotype.Component;

import com.agiletrack.backend.workspace.entity.WorkspaceRole;

@Component
public class WorkspaceMapper {

    public WorkspaceResponse toResponse(Workspace workspace, WorkspaceRole role) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getOwner().getId(),
                role,
                workspace.getCreatedAt(),
                workspace.getUpdatedAt()
        );
    }
}
