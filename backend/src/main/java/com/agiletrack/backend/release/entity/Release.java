package com.agiletrack.backend.release.entity;

import com.agiletrack.backend.common.entity.BaseEntity;
import com.agiletrack.backend.project.entity.Project;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "releases",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_release_name_per_project", columnNames = {"project_id", "name"}),
        indexes = {
                @Index(name = "idx_releases_project_id", columnList = "project_id"),
                @Index(name = "idx_releases_lifecycle_state", columnList = "lifecycle_state")
        }
)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false, onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Release extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @Column(nullable = false, length = 150)
    @ToString.Include
    private String name;

    /** The semantic release string such as "v2.4.0". Distinct from the locking counter below. */
    @Column(name = "release_version", length = 50)
    @ToString.Include
    private String releaseVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(name = "lifecycle_state", nullable = false, length = 50)
    @Builder.Default
    @ToString.Include
    private ReleaseLifecycleState lifecycleState = ReleaseLifecycleState.PLANNED;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public boolean canTransitionTo(ReleaseLifecycleState target) {
        return lifecycleState.canTransitionTo(target);
    }
}
