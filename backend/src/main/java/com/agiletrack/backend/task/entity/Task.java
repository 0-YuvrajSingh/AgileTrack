package com.agiletrack.backend.task.entity;

import com.agiletrack.backend.common.entity.BaseEntity;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "tasks",
        indexes = {
                @Index(name = "idx_tasks_project_id", columnList = "project_id"),
                @Index(name = "idx_tasks_assignee_id", columnList = "assignee_id"),
                @Index(name = "idx_tasks_status", columnList = "status"),
                @Index(name = "idx_tasks_deadline", columnList = "deadline"),
                @Index(name = "idx_tasks_project_status_position", columnList = "project_id,status,position")
        }
)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false, onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Task extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @Column(nullable = false, length = 255)
    @EqualsAndHashCode.Include
    @ToString.Include
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @EqualsAndHashCode.Include
    @ToString.Include
    private TaskPriority priority;

    @EqualsAndHashCode.Include
    @ToString.Include
    private LocalDateTime deadline;

    @Column(nullable = false)
    @Builder.Default
    private Double position = 0.0;
}
