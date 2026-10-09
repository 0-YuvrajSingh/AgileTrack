# docs/WALKTHROUGH.md — Core Technical Mechanisms

This document explains the core technical mechanisms of AgileTrack in plain, interview-ready language: what each mechanism does, why it is designed that way, how it works under the hood, and which test proves it.

---

## 1. Dependency Cycle Detection
- **What it does**: Prevents cyclical "A blocks B" dependencies between work items within the same project. If adding an edge would close a loop, the operation is rejected and the path forming the cycle is returned.
- **Why**: A cyclical dependency creates an impossible deadlock where work items can never be completed.
- **How it works**: Before saving a proposed dependency where `target` is blocked by `source`, a Depth-First Search (DFS) traverses backwards from `source` following existing blocking edges. If the traversal reaches `target`, the new edge would close a cycle. The algorithm is bounded by depth (100) and max visited nodes (10,000) to protect against denial-of-service. No third-party graph library is used.
- **Complexity**: Time complexity is $O(V + E)$ where $V$ is work items and $E$ is blocking edges visited; space complexity is $O(V)$ for the recursion stack and visited set.
- **Test that proves it**: `DependencyCycleDetectorTest.java` and `DependencyIntegrationTest.java:addDependency_cycleDetected_returns400WithPath`.

---

## 2. Server-Enforced Blocked Completion Guard
- **What it does**: Prevents any work item from transitioning to status `DONE` if it has one or more unresolved blockers (blockers whose status is not `DONE`).
- **Why**: Client-side UI checks can be bypassed by direct API calls; the integrity of the delivery dependency graph must be guaranteed by the server.
- **How it works**: In `TaskService.updateTaskStatus()`, before updating an item's status to `DONE`, the service queries `dependencyRepository.hasUnresolvedBlockers(taskId)`. If any blocking task exists with `status != 'DONE'`, a `BusinessRuleException` is thrown, returning HTTP 400 Bad Request.
- **Test that proves it**: `BusinessRuleIntegrationTest.java:cannotMoveToDoneIfBlocked`.

---

## 3. Derived Release Readiness Engine
- **What it does**: Computes a real-time `READY` or `NOT_READY` verdict for a release along with a deterministic, sorted list of reasons.
- **Why**: Readiness is derived state. Persisting readiness in a database column invites cache invalidation bugs and stale data whenever work items or blockers change. Computing it fresh guarantees 100% data consistency without distributed transactions.
- **How it works**: `ReadinessService.calculateReadiness()` queries the release and its work items in a single read-only transaction and evaluates three pure gates:
  1. `EMPTY_RELEASE`: Fires if the release contains zero work items.
  2. `INCOMPLETE_WORK`: Fires if any work item in the release has `status != 'DONE'`.
  3. `BLOCKED_WORK`: Fires if any work item has an unfinished blocker.
  If all gates pass, the release is `READY`. Otherwise, it returns `NOT_READY` with reasons deterministically sorted by gate priority and item identifier.
- **Test that proves it**: `ReadinessIntegrationTest.java`.

---

## 4. Release Lifecycle & Scope Lock
- **What it does**: Manages release progression (`PLANNED -> IN_PROGRESS -> RELEASED`) and freezes release scope once execution begins.
- **Why**: In real-world software delivery, once a release enters active development, adding or dropping features invalidates planning and commitments. Metadata (target date, release notes) may shift, but the commitment scope is frozen.
- **How it works**: `ReleaseService` checks `release.getLifecycleState().allowsScopeChange()` before allowing `addWorkItem()` or `removeWorkItem()`. Only `PLANNED` allows scope mutations; attempts to modify scope during `IN_PROGRESS` or `RELEASED` throw a `BusinessRuleException`.
- **Test that proves it**: `ReleaseIntegrationTest.java:addAfterScopeLock_isRejected` and `removeAfterScopeLock_isRejected`.

---

## 5. Optimistic Concurrency Control (HTTP 409)
- **What it does**: Prevents concurrent updates from silently overwriting one another by checking row version tags during updates.
- **Why**: In collaborative boards, two developers updating the same task or release at the same moment must not cause the last writer to silently overwrite the earlier changes without warning.
- **How it works**: JPA `@Version` column exists on `Task`, `Project`, and `Release`. Mutation requests supply the expected `version`. If another transaction increments the version before the write commits, Hibernate throws `OptimisticLockingFailureException`, which `GlobalExceptionHandler` maps to HTTP 409 Conflict with a clear message: `"This record was modified by someone else. Reload and try again."`
- **Test that proves it**: `OptimisticLockingIntegrationTest.java` and `StaleWriteApiIntegrationTest.java`.

---

## 6. Project & Tenant Boundary Isolation
- **What it does**: Enforces that users can only access and modify data within projects where they hold verified membership, and prevents cross-project dependencies or cross-project release assignments.
- **Why**: Prevents accidental data contamination and security boundary traversal across projects.
- **How it works**: Service methods resolve all resources through their full parent hierarchy (`User -> Project -> Task/Release`). A UUID alone never authorizes access; if a project or task does not belong to the user's project, the repository returns empty, yielding HTTP 404 Not Found.
- **Test that proves it**: `TenantIsolationIntegrationTest.java` and `ReleaseIntegrationTest.java:Isolation`.

---

## 7. Bounded Algorithmic Verification vs. Synthetic Row Bloat
- **What it does**: Verifies graph algorithm resilience (cycle detection, depth bounds, visited node thresholds) via deterministic synthetic topologies rather than million-row database insertions.
- **Why**: A 1.1-million row insertion harness (`PerformanceBenchmarkTest`) contained zero assertions, inserted un-cleaned rows into PostgreSQL, and caused downstream cascade deletes to hang. Real algorithmic defense requires asserting termination bounds, not generating multi-gigabyte database tables.
- **How it works**: `DependencyCycleDetector` enforces strict structural bounds (max depth 100, max visited 10,000 nodes). Instead of a slow benchmark harness, unit tests construct artificial deep chains and wide subgraphs to assert that hitting either bound throws a `BusinessRuleException` rather than silently failing open.
- **Test that proves it**: `DependencyCycleDetectorTest.java:deepChainReachingDepthBound_throwsException` and `wideGraphReachingNodeBound_throwsException`.


