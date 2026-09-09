package com.agiletrack.backend.project.entity;

import com.agiletrack.backend.common.entity.BaseEntity;
import com.agiletrack.backend.workspace.entity.Workspace;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@Entity
@Table(
        name = "projects",
        indexes = {
                @Index(name = "idx_projects_workspace_id", columnList = "workspace_id"),
                @Index(name = "idx_projects_status", columnList = "status")
        }
)
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false, onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Project extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @EqualsAndHashCode.Include
    @ToString.Include
    @Column(length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @EqualsAndHashCode.Include
    @ToString.Include
    private ProjectStatus status;

    public boolean isArchived() {
        return this.status == ProjectStatus.ARCHIVED;
    }

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public boolean canTransitionTo(ProjectStatus target) {
        if (this.status == target) return true;
        
        return switch (this.status) {
            case PLANNING -> target == ProjectStatus.ACTIVE;
            case ACTIVE -> target == ProjectStatus.ON_HOLD || target == ProjectStatus.COMPLETED;
            case ON_HOLD -> target == ProjectStatus.ACTIVE || target == ProjectStatus.COMPLETED;
            case COMPLETED -> target == ProjectStatus.ARCHIVED;
            case ARCHIVED -> false; // Terminal state
        };
    }
}
