package com.agiletrack.backend.dependency.repository;

import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkItemDependencyRepository extends JpaRepository<WorkItemDependency, UUID> {

    boolean existsBySourceIdAndTargetIdAndDependencyType(UUID sourceId, UUID targetId, DependencyType type);

    /** Edges pointing at this item: what blocks it. */
    @Query("""
            SELECT d FROM WorkItemDependency d
            JOIN FETCH d.source
            WHERE d.target.id = :taskId
            """)
    List<WorkItemDependency> findBlockersOf(@Param("taskId") UUID taskId);

    /** Edges leaving this item: what it holds up. */
    @Query("""
            SELECT d FROM WorkItemDependency d
            JOIN FETCH d.target
            WHERE d.source.id = :taskId
            """)
    List<WorkItemDependency> findBlockedBy(@Param("taskId") UUID taskId);

    Optional<WorkItemDependency> findByIdAndTargetId(UUID id, UUID targetId);

    /**
     * One BFS frontier expansion: every item reachable in a single hop from any of
     * {@code sourceIds}.
     *
     * <p>Taking a whole frontier at a time keeps traversal to one query per level rather than one
     * per node. The project constraint keeps the walk inside the tenant boundary even if an edge
     * were ever written across projects.
     */
    @Query("""
            SELECT d.source.id AS sourceId, d.target.id AS targetId FROM WorkItemDependency d
            WHERE d.source.id IN :sourceIds
              AND d.dependencyType = :type
              AND d.source.project.id = :projectId
            """)
    List<EdgeView> findEdgesBySourceIds(@Param("sourceIds") Collection<UUID> sourceIds,
                                        @Param("type") DependencyType type,
                                        @Param("projectId") UUID projectId);

    /** Both endpoints of an edge, so a traversal can record how it reached a node without re-querying. */
    interface EdgeView {
        UUID getSourceId();

        UUID getTargetId();
    }

    /**
     * Unresolved blockers for a batch of work items, used by the blocked-completion rule and by
     * release readiness. "Unresolved" means the blocking item is not DONE.
     */
    @Query("""
            SELECT d FROM WorkItemDependency d
            JOIN FETCH d.source s
            JOIN FETCH d.target t
            WHERE d.target.id IN :taskIds
              AND d.dependencyType = com.agiletrack.backend.dependency.entity.DependencyType.BLOCKS
              AND s.status <> com.agiletrack.backend.task.entity.TaskStatus.DONE
            """)
    List<WorkItemDependency> findUnresolvedBlockersFor(@Param("taskIds") Collection<UUID> taskIds);

    /** Every unresolved blocking edge in a project, for the blocked-work overview. */
    @Query("""
            SELECT d FROM WorkItemDependency d
            JOIN FETCH d.source s
            JOIN FETCH d.target t
            WHERE t.project.id = :projectId
              AND d.dependencyType = com.agiletrack.backend.dependency.entity.DependencyType.BLOCKS
              AND s.status <> com.agiletrack.backend.task.entity.TaskStatus.DONE
            """)
    List<WorkItemDependency> findUnresolvedBlockersInProject(@Param("projectId") UUID projectId);
}
