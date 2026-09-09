package com.agiletrack.backend.dependency.entity;

import com.agiletrack.backend.common.entity.BaseEntity;
import com.agiletrack.backend.task.entity.Task;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * A directional edge in a project's dependency graph: {@code source} blocks {@code target}.
 *
 * <p>The row is immutable once written. Changing which items an edge connects would be
 * indistinguishable from deleting it and adding another, and would skip the cycle check, so the
 * API only creates and deletes edges.
 */
@Entity
@Table(
        name = "work_item_dependencies",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_dependency_edge",
                columnNames = {"source_work_item_id", "target_work_item_id", "dependency_type"}),
        indexes = {
                @Index(name = "idx_dependencies_source", columnList = "source_work_item_id"),
                @Index(name = "idx_dependencies_target", columnList = "target_work_item_id")
        }
)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false, onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class WorkItemDependency extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    /** The blocker. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_work_item_id", nullable = false)
    private Task source;

    /** The item held up by the blocker. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_work_item_id", nullable = false)
    private Task target;

    @Enumerated(EnumType.STRING)
    @Column(name = "dependency_type", nullable = false, length = 50)
    @Builder.Default
    @ToString.Include
    private DependencyType dependencyType = DependencyType.BLOCKS;
}
