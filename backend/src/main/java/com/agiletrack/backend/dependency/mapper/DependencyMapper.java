package com.agiletrack.backend.dependency.mapper;

import com.agiletrack.backend.dependency.dto.DependencyResponse;
import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskStatus;
import org.springframework.stereotype.Component;

@Component
public class DependencyMapper {

    public DependencyResponse toResponse(WorkItemDependency dependency) {
        Task blocker = dependency.getSource();
        Task blocked = dependency.getTarget();

        return new DependencyResponse(
                dependency.getId(),
                dependency.getDependencyType(),
                blocker.getId(),
                blocker.getTitle(),
                blocker.getStatus(),
                blocked.getId(),
                blocked.getTitle(),
                blocked.getStatus(),
                blocker.getStatus() == TaskStatus.DONE
        );
    }
}
