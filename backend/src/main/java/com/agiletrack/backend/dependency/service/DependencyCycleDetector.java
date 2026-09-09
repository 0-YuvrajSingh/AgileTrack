package com.agiletrack.backend.dependency.service;

import com.agiletrack.backend.common.exception.BusinessRuleException;
import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Decides whether adding an edge would close a cycle in a project's BLOCKS graph.
 *
 * <p>To add {@code source -> target} we ask the reverse question: starting at {@code target} and
 * following existing outgoing edges, can we get back to {@code source}? If we can, then {@code
 * source} is already reachable from {@code target}, so the new edge would make each item
 * transitively wait for the other. A self-edge is the degenerate case of the same question.
 *
 * <p>The walk is a breadth-first search with a visited set, so shared sub-graphs are expanded once
 * and a graph that somehow already contains a cycle still terminates. It expands a whole frontier
 * per query rather than a node at a time, so the number of queries is bounded by the depth of the
 * graph, not by the number of nodes in it.
 *
 * <p>Traversal is bounded on both node count and depth. An unexpectedly large graph produces a
 * clear rejection rather than an open-ended scan holding a transaction open: refusing to answer is
 * safer than answering slowly.
 */
@Component
@RequiredArgsConstructor
public class DependencyCycleDetector {

    /**
     * Ceilings for a single check. A project whose dependency graph exceeds these has a modelling
     * problem rather than a scale problem, so the limits sit far above realistic use and exist
     * only to stop a pathological graph from stalling a request.
     */
    static final int MAX_VISITED_NODES = 10_000;
    static final int MAX_DEPTH = 100;

    private final WorkItemDependencyRepository dependencyRepository;
    private final TaskRepository taskRepository;

    /**
     * @throws BusinessRuleException if the edge would create a cycle, or if the graph is too large
     *                               or deep to verify within the configured bounds.
     */
    public void requireNoCycle(UUID projectId, UUID sourceId, UUID targetId) {
        if (sourceId.equals(targetId)) {
            throw new BusinessRuleException("A work item cannot block itself");
        }

        List<UUID> pathBack = findPath(projectId, targetId, sourceId);
        if (pathBack != null) {
            throw new BusinessRuleException(
                    "This dependency would create a cycle: " + describe(pathBack, targetId));
        }
    }

    /**
     * Breadth-first search from {@code from} to {@code to} over outgoing BLOCKS edges.
     *
     * @return node ids from {@code from} to {@code to} inclusive, or {@code null} if unreachable.
     */
    private List<UUID> findPath(UUID projectId, UUID from, UUID to) {
        Set<UUID> visited = new HashSet<>();
        Map<UUID, UUID> cameFrom = new HashMap<>();

        Set<UUID> frontier = new HashSet<>();
        frontier.add(from);
        visited.add(from);

        for (int depth = 0; depth < MAX_DEPTH; depth++) {
            if (frontier.isEmpty()) {
                return null;
            }

            List<WorkItemDependencyRepository.EdgeView> edges =
                    dependencyRepository.findEdgesBySourceIds(frontier, DependencyType.BLOCKS, projectId);

            Set<UUID> nextFrontier = new HashSet<>();
            for (WorkItemDependencyRepository.EdgeView edge : edges) {
                UUID candidate = edge.getTargetId();
                if (!visited.add(candidate)) {
                    continue;
                }
                cameFrom.put(candidate, edge.getSourceId());

                if (candidate.equals(to)) {
                    return reconstruct(cameFrom, from, to);
                }
                nextFrontier.add(candidate);
            }

            if (visited.size() > MAX_VISITED_NODES) {
                throw new BusinessRuleException(
                        "Dependency graph is too large to validate safely (more than "
                                + MAX_VISITED_NODES + " related work items). "
                                + "Reduce the number of dependencies before adding more.");
            }
            frontier = nextFrontier;
        }

        // The frontier was still advancing when the depth ceiling was reached, so the answer is
        // unknown. An unknown answer must not be treated as "no cycle".
        throw new BusinessRuleException(
                "Dependency chain is deeper than " + MAX_DEPTH
                        + " levels and cannot be validated safely.");
    }

    private List<UUID> reconstruct(Map<UUID, UUID> cameFrom, UUID from, UUID to) {
        Deque<UUID> path = new ArrayDeque<>();
        UUID cursor = to;
        // Bounded by the visited set, so a corrupt predecessor map cannot loop forever.
        for (int i = 0; i <= MAX_VISITED_NODES && cursor != null; i++) {
            path.addFirst(cursor);
            if (cursor.equals(from)) {
                break;
            }
            cursor = cameFrom.get(cursor);
        }
        return List.copyOf(path);
    }

    /**
     * Renders the offending loop using work item titles. Only runs on the rejection path, so the
     * extra lookup costs nothing in the normal case.
     */
    private String describe(List<UUID> pathBack, UUID closingNode) {
        List<UUID> loop = new ArrayList<>(pathBack);
        loop.add(closingNode);

        Map<UUID, String> titles = taskRepository.findAllById(loop).stream()
                .collect(Collectors.toMap(Task::getId, Task::getTitle, (a, b) -> a));

        return loop.stream()
                .map(id -> titles.getOrDefault(id, id.toString()))
                .collect(Collectors.joining(" blocks "));
    }
}
