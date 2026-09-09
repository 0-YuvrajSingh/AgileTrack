package com.agiletrack.backend.dependency.service;

import com.agiletrack.backend.common.exception.BusinessRuleException;
import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
import com.agiletrack.backend.task.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Traversal limits, tested against synthetic graphs.
 *
 * <p>Driving these through the API would mean inserting tens of thousands of rows to prove a
 * safety valve works. Stubbing the frontier query shows the same behaviour, and lets the
 * pathological shapes (an endless chain, an enormous fan-out) be expressed directly.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Cycle detection is bounded and query-efficient")
class DependencyCycleDetectorTest {

    @Mock WorkItemDependencyRepository dependencyRepository;
    @Mock TaskRepository taskRepository;

    @InjectMocks DependencyCycleDetector detector;

    private UUID projectId;
    private UUID source;
    private UUID target;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        source = UUID.randomUUID();
        target = UUID.randomUUID();
    }

    private static WorkItemDependencyRepository.EdgeView edge(UUID from, UUID to) {
        return new WorkItemDependencyRepository.EdgeView() {
            @Override public UUID getSourceId() { return from; }
            @Override public UUID getTargetId() { return to; }
        };
    }

    @Test
    @DisplayName("A self-edge is rejected without touching the database")
    void selfEdge_isRejectedImmediately() {
        assertThatThrownBy(() -> detector.requireNoCycle(projectId, source, source))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cannot block itself");

        verify(dependencyRepository, atMost(0))
                .findEdgesBySourceIds(anyCollection(), any(), any());
    }

    @Test
    @DisplayName("An empty graph permits the edge")
    void emptyGraph_permitsEdge() {
        when(dependencyRepository.findEdgesBySourceIds(anyCollection(), eq(DependencyType.BLOCKS), eq(projectId)))
                .thenReturn(List.of());

        assertThatCode(() -> detector.requireNoCycle(projectId, source, target))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("A chain that never terminates is refused once it passes the depth ceiling")
    void unboundedDepth_isRefused() {
        // Every expansion yields exactly one previously unseen node, so the walk can continue
        // forever without ever exceeding the node ceiling. Only the depth limit stops it.
        when(dependencyRepository.findEdgesBySourceIds(anyCollection(), eq(DependencyType.BLOCKS), eq(projectId)))
                .thenAnswer(invocation -> {
                    Collection<UUID> frontier = invocation.getArgument(0);
                    UUID from = frontier.iterator().next();
                    return List.of(edge(from, UUID.randomUUID()));
                });

        assertThatThrownBy(() -> detector.requireNoCycle(projectId, source, target))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("deeper than " + DependencyCycleDetector.MAX_DEPTH);
    }

    @Test
    @DisplayName("A single enormous fan-out is refused once it passes the node ceiling")
    void unboundedBreadth_isRefused() {
        List<WorkItemDependencyRepository.EdgeView> huge = new ArrayList<>();
        for (int i = 0; i <= DependencyCycleDetector.MAX_VISITED_NODES; i++) {
            huge.add(edge(target, UUID.randomUUID()));
        }
        when(dependencyRepository.findEdgesBySourceIds(anyCollection(), eq(DependencyType.BLOCKS), eq(projectId)))
                .thenReturn(huge);

        assertThatThrownBy(() -> detector.requireNoCycle(projectId, source, target))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("too large to validate safely");
    }

    @Test
    @DisplayName("A cycle is found without re-expanding a node reached by two paths")
    void sharedSubgraph_isExpandedOnce() {
        UUID left = UUID.randomUUID();
        UUID right = UUID.randomUUID();
        UUID join = UUID.randomUUID();

        // target -> {left, right} -> join -> source, so the answer is "cycle", and `join` is
        // reachable two ways but must only be expanded once.
        when(dependencyRepository.findEdgesBySourceIds(anyCollection(), eq(DependencyType.BLOCKS), eq(projectId)))
                .thenAnswer(invocation -> {
                    Collection<UUID> frontier = invocation.getArgument(0);
                    List<WorkItemDependencyRepository.EdgeView> out = new ArrayList<>();
                    if (frontier.contains(target)) {
                        out.add(edge(target, left));
                        out.add(edge(target, right));
                    }
                    if (frontier.contains(left)) out.add(edge(left, join));
                    if (frontier.contains(right)) out.add(edge(right, join));
                    if (frontier.contains(join)) out.add(edge(join, source));
                    return out;
                });
        lenient().when(taskRepository.findAllById(anyCollection())).thenReturn(List.of());

        assertThatThrownBy(() -> detector.requireNoCycle(projectId, source, target))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cycle");

        // Four levels at most: {target}, {left,right}, {join}, {source}. One query per level, not
        // one per node, is the property that keeps traversal cheap on wide graphs.
        verify(dependencyRepository, atMost(4))
                .findEdgesBySourceIds(anyCollection(), eq(DependencyType.BLOCKS), eq(projectId));
    }

    @Test
    @DisplayName("A graph that already contains a loop still terminates")
    void preexistingLoop_terminates() {
        UUID x = UUID.randomUUID();
        UUID y = UUID.randomUUID();

        // target -> x -> y -> x ... a loop that does not include source, so the honest answer is
        // "no cycle would be created", and the visited set is what prevents an endless walk.
        when(dependencyRepository.findEdgesBySourceIds(anyCollection(), eq(DependencyType.BLOCKS), eq(projectId)))
                .thenAnswer(invocation -> {
                    Collection<UUID> frontier = invocation.getArgument(0);
                    List<WorkItemDependencyRepository.EdgeView> out = new ArrayList<>();
                    if (frontier.contains(target)) out.add(edge(target, x));
                    if (frontier.contains(x)) out.add(edge(x, y));
                    if (frontier.contains(y)) out.add(edge(y, x));
                    return out;
                });

        assertThatCode(() -> detector.requireNoCycle(projectId, source, target))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("The limits are set well above realistic graphs")
    void limitsAreGenerous() {
        assertThat(DependencyCycleDetector.MAX_DEPTH).isGreaterThanOrEqualTo(50);
        assertThat(DependencyCycleDetector.MAX_VISITED_NODES).isGreaterThanOrEqualTo(1_000);
    }
}
