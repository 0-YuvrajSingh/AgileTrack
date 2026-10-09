# docs/WALKTHROUGH.md — Core Technical Mechanisms

This document explains the core technical mechanisms of AgileTrack in plain, interview-ready language: what each mechanism does, why it is designed that way, how it works under the hood, and which test proves it.

---

## 1. Dependency Cycle Detection (Breadth-First Search)
- **What it does**: Prevents cyclical "A blocks B" dependencies between work items within the same project. If adding an edge would close a loop, the operation is rejected and the path forming the cycle is returned.
- **Why**: A cyclical dependency creates an impossible deadlock where work items can never be completed.
- **How it works**: To add a proposed edge `source -> target`, [`DependencyCycleDetector`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/dependency/service/DependencyCycleDetector.java) performs a **Breadth-First Search (BFS)** starting from `target` following existing outgoing `BLOCKS` edges to see if `source` is reachable. The search maintains a `frontier` set and expands level-by-level up to `MAX_DEPTH = 100`. In each depth level, it issues a single batched query (`findEdgesBySourceIds(frontier, BLOCKS, projectId)`) across the database, bounding database round-trips to at most 100 queries rather than one query per node. If `source` is reached, the path is reconstructed from a `cameFrom` map and formatted into human-readable titles (e.g., `"Task A blocks Task B blocks Task A"`). If the search exceeds 10,000 visited nodes or 100 depth levels, it throws a [`BusinessRuleException`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/common/exception/BusinessRuleException.java) to fail closed. No third-party graph library is used.
- **Complexity**:
  - **In-memory Time**: $O(V + E)$ where $V$ is work items and $E$ is blocking edges visited, capped at $V \le 10,000$.
  - **Database Round-trips**: At most $\min(\text{depth}, 100)$ batched queries.
  - **In-memory Space**: $O(V)$ for `visited` set, `frontier` set, and `cameFrom` predecessor map.
- **Tests that prove it**:
  - `DependencyIntegrationTest.java:Cycles.cycleRejection_namesTheLoop()` (verified)
  - `DependencyIntegrationTest.java:Cycles.directCycle_isRejected()` (verified)
  - `DependencyIntegrationTest.java:Cycles.indirectCycle_isRejected()` (verified)
  - `DependencyCycleDetectorTest.java:unboundedDepth_isRefused()` (verified)
  - `DependencyCycleDetectorTest.java:unboundedBreadth_isRefused()` (verified)

---

## 2. Server-Enforced Blocked Completion Guard
- **What it does**: Prevents any work item from transitioning to status `DONE` if it has one or more unresolved blockers (blockers whose status is not `DONE`).
- **Why**: Client-side UI checks can be bypassed by direct API calls; the integrity of the delivery dependency graph must be guaranteed by the server.
- **How it works**: In [`TaskService.updateTaskStatus()`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/task/service/TaskService.java), before updating an item's status to `DONE`, the service queries `dependencyRepository.hasUnresolvedBlockers(taskId)`. If any blocking task exists with `status != 'DONE'`, a [`BusinessRuleException`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/common/exception/BusinessRuleException.java) is thrown, returning HTTP 400 Bad Request. When a blocker is completed, blocked items unblock automatically without requiring writes against the blocked items.
- **Tests that prove it**:
  - `DependencyIntegrationTest.java:BlockedCompletion.cannotCompleteWhileBlocked()` (verified)
  - `DependencyIntegrationTest.java:BlockedCompletion.resolvingBlocker_unblocksAutomatically()` (verified)
  - `BusinessRuleIntegrationTest.java:cannotMoveToDoneIfBlocked()` (verified)

---

## 3. Derived Release Readiness Engine
- **What it does**: Computes a real-time `READY` or `NOT_READY` verdict for a release along with a deterministic, sorted list of reasons.
- **Why**: Readiness is derived state. Persisting readiness in a database column invites cache invalidation bugs and stale data whenever work items or blockers change. Computing it fresh guarantees 100% data consistency without distributed transactions.
- **How it works**: [`ReadinessService.calculateReadiness()`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/readiness/service/ReadinessService.java) queries the release and its work items in a single read-only transaction and evaluates three pure gates:
  1. `EMPTY_RELEASE`: Fires if the release contains zero work items.
  2. `INCOMPLETE_WORK`: Fires if any work item in the release has `status != 'DONE'`.
  3. `BLOCKED_WORK`: Fires if any work item has an unfinished blocker.
  If all gates pass, the release is `READY`. Otherwise, it returns `NOT_READY` with reasons deterministically sorted by gate priority and item identifier.
- **Tests that prove it**:
  - `ReadinessIntegrationTest.java:emptyRelease()` (verified)
  - `ReadinessIntegrationTest.java:incompleteWork()` (verified)
  - `ReadinessIntegrationTest.java:blockedWork()` (verified)
  - `ReadinessIntegrationTest.java:readyRelease()` (verified)
  - `ReadinessIntegrationTest.java:reasonsAreSorted()` (verified)
  - `ReadinessIntegrationTest.java:evaluationIsSideEffectFree()` (verified)

---

## 4. Release Lifecycle & Scope Lock
- **What it does**: Manages release progression (`PLANNED -> IN_PROGRESS -> RELEASED`) and freezes release scope once execution begins.
- **Why**: In real-world software delivery, once a release enters active development, adding or dropping features invalidates planning and commitments. Metadata (target date, release notes) may shift, but the commitment scope is frozen.
- **How it works**: [`ReleaseService`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/release/service/ReleaseService.java) checks `release.getLifecycleState().allowsScopeChange()` before allowing `addWorkItem()` or `removeWorkItem()`. Only `PLANNED` allows scope mutations; attempts to modify scope during `IN_PROGRESS` or `RELEASED` throw a [`BusinessRuleException`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/common/exception/BusinessRuleException.java).
- **Tests that prove it**:
  - `ReleaseIntegrationTest.java:Scope.addAfterScopeLock_isRejected()` (verified)
  - `ReleaseIntegrationTest.java:Scope.removeAfterScopeLock_isRejected()` (verified)
  - `ReleaseIntegrationTest.java:Lifecycle.plannedToInProgress()` (verified)
  - `ReleaseIntegrationTest.java:Lifecycle.plannedToReleased_isRejected()` (verified)
  - `ReleaseIntegrationTest.java:Lifecycle.releasedIsTerminal()` (verified)

---

## 5. Optimistic Concurrency Control (HTTP 409)
- **What it does**: Prevents concurrent updates from silently overwriting one another by checking row version tags during updates.
- **Why**: In collaborative boards, two developers updating the same task or release at the same moment must not cause the last writer to silently overwrite the earlier changes without warning.
- **How it works**: JPA `@Version` column exists on `Task`, `Project`, and `Release`. Mutation requests supply the expected `version`. If another transaction increments the version before the write commits, Hibernate throws `OptimisticLockingFailureException`, which [`GlobalExceptionHandler`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/common/exception/GlobalExceptionHandler.java) maps to HTTP 409 Conflict with a clear message: `"This record was modified by someone else. Reload and try again."`
- **Tests that prove it**:
  - `ConflictResponseMappingTest.java:optimisticLockFailure_isMappedToConflict()` (verified)
  - `OptimisticLockingIntegrationTest.java:staleTaskWrite_failsInsteadOfOverwriting()` (verified)
  - `OptimisticLockingIntegrationTest.java:staleProjectWrite_failsInsteadOfOverwriting()` (verified)
  - `StaleWriteApiIntegrationTest.java:staleWorkItemUpdate_isRejected()` (verified)

---

## 6. Workspace & Project Tenant Boundary Isolation
- **What it does**: Enforces that users can only access and modify data within workspaces where they hold verified membership, and prevents cross-project dependencies or cross-project release assignments.
- **Why**: Prevents accidental data contamination and security boundary traversal across workspaces and projects.
- **How it works**: The resource hierarchy is `User -> Workspace -> Project -> Task/Release`.
  - Service methods resolve all resources through their full parent hierarchy. A UUID alone never authorizes access.
  - Direct access to another workspace where the user holds no membership returns **HTTP 403 Forbidden** (via [`WorkspaceService.getWorkspaceForUser`](file:///c:/Users/uvi58/OneDrive/Documents/AgileTrack/backend/src/main/java/com/agiletrack/backend/workspace/service/WorkspaceService.java)).
  - Requesting an entity (project, task, release) that does not exist within the caller's workspace or project returns **HTTP 404 Not Found** (via scoped queries e.g. `findByIdAndProjectId`).
  - Cross-project dependencies ("Item A in Project 1 blocks Item B in Project 2") and cross-project release assignments are rejected.
- **Tests that prove it**:
  - `TenantIsolationIntegrationTest.java:crossWorkspaceDirectAccess_returns403()` (verified)
  - `TenantIsolationIntegrationTest.java:crossWorkspaceProjectSpoofing_returns404()` (verified)
  - `TenantIsolationIntegrationTest.java:crossWorkspaceTaskSpoofing_returns404()` (verified)
  - `TenantIsolationIntegrationTest.java:taskProjectWorkspaceMismatch_returns404()` (verified)
  - `ReleaseIntegrationTest.java:Isolation.outsider_cannotRead()` (verified - returns 403)
  - `ReleaseIntegrationTest.java:Isolation.foreignReleaseThroughOwnProject_isNotFound()` (verified - returns 404)
  - `ReleaseIntegrationTest.java:Scope.crossProjectAssignment_isRejected()` (verified)
  - `DependencyIntegrationTest.java:crossProjectEdge_isRejected()` (verified)

---

## 7. Bounded Algorithmic Verification vs. Synthetic Row Bloat
- **What it does**: Verifies graph algorithm resilience (cycle detection, depth bounds, visited node thresholds) via deterministic synthetic topologies rather than million-row database insertions.
- **Why**: A 1.1-million row insertion harness (`PerformanceBenchmarkTest`) contained zero assertions, inserted un-cleaned rows into PostgreSQL, and caused downstream cascade deletes to hang. Real algorithmic defense requires asserting termination bounds, not generating multi-gigabyte database tables.
- **How it works**: `DependencyCycleDetector` enforces strict structural bounds (max depth 100, max visited 10,000 nodes). Unit tests construct artificial deep chains and wide subgraphs to assert that hitting either bound throws a `BusinessRuleException` rather than silently failing open.
- **Tests that prove it**:
  - `DependencyCycleDetectorTest.java:unboundedDepth_isRefused()` (verified)
  - `DependencyCycleDetectorTest.java:unboundedBreadth_isRefused()` (verified)
  - `DependencyCycleDetectorTest.java:preexistingLoop_terminates()` (verified)
  - `DependencyCycleDetectorTest.java:sharedSubgraph_isExpandedOnce()` (verified)
