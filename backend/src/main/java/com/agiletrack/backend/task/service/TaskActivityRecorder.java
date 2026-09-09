package com.agiletrack.backend.task.service;

import com.agiletrack.backend.security.CurrentUserService;
import com.agiletrack.backend.task.entity.ActivityType;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskActivity;
import com.agiletrack.backend.task.repository.TaskActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Writes append-only work item history.
 *
 * <p>Callers must invoke this from inside the transaction performing the mutation it describes, so
 * a rolled-back change cannot leave a history entry claiming it happened. Shared by every service
 * that mutates a work item, so the rule holds in one place instead of being re-implemented.
 */
@Component
@RequiredArgsConstructor
public class TaskActivityRecorder {

    private final TaskActivityRepository taskActivityRepository;
    private final CurrentUserService currentUserService;

    public void record(Task task, ActivityType type, String details) {
        taskActivityRepository.save(TaskActivity.builder()
                .task(task)
                .user(currentUserService.getCurrentUser())
                .activityType(type)
                .details(details)
                .build());
    }
}
