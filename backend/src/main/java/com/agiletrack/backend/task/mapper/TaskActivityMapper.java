package com.agiletrack.backend.task.mapper;

import com.agiletrack.backend.task.dto.TaskActivityResponse;
import com.agiletrack.backend.task.entity.TaskActivity;
import org.springframework.stereotype.Component;

@Component
public class TaskActivityMapper {

    public TaskActivityResponse toResponse(TaskActivity activity) {
        return new TaskActivityResponse(
                activity.getId(),
                activity.getUser().getId(),
                activity.getUser().getEmail(),
                activity.getActivityType(),
                activity.getDetails(),
                activity.getCreatedAt()
        );
    }
}
