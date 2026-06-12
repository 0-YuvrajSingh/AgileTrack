package com.agiletrack.backend.workspace.mapper;

import com.agiletrack.backend.workspace.dto.WorkspaceResponse;
import com.agiletrack.backend.workspace.entity.Workspace;
import org.springframework.stereotype.Component;

@Component
public class WorkspaceMapper {

    public WorkspaceResponse toResponse(Workspace workspace) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getOwner().getId(),
                workspace.getCreatedAt(),
                workspace.getUpdatedAt()
        );
    }
}
