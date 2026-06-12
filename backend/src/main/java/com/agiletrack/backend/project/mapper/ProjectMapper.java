package com.agiletrack.backend.project.mapper;

import com.agiletrack.backend.project.dto.ProjectResponse;
import com.agiletrack.backend.project.entity.Project;
import org.springframework.stereotype.Component;

@Component
public class ProjectMapper {

    public ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getStatus(),
                project.getWorkspace().getId(),
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }
}
