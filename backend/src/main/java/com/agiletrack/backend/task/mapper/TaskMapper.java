package com.agiletrack.backend.task.mapper;

import com.agiletrack.backend.task.dto.TaskResponse;
import com.agiletrack.backend.task.entity.Task;
import org.springframework.stereotype.Component;

@Component
public class TaskMapper {

    public TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getType(),
                task.getRiskLevel(),
                task.getPriority(),
                task.getDeadline(),
                task.getProject().getId(),
                task.getRelease() != null ? task.getRelease().getId() : null,
                task.getAssignee() != null ? task.getAssignee().getId() : null,
                task.getAssignee() != null ? task.getAssignee().getEmail() : null,
                task.getCreatedAt(),
                task.getUpdatedAt(),
                task.getPosition(),
                task.getVersion()
        );
    }
}

