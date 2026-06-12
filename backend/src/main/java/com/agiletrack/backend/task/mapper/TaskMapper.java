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
                task.getPriority(),
                task.getDeadline(),
                task.getProject().getId(),
                task.getAssignee().getId(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
