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

---

## 8. Change Governance Cut (Phase 2, D5)
- **What it does**: Removes the entire change-governance concept from the system: the `CHANGE` work item type, `risk_level` classifications, the `change_approvals` table and approval endpoints, and the `APPROVAL_REQUIRED` readiness gate. Work item types are now exactly `FEATURE`, `BUG`, `TECH_DEBT`, enforced by check constraint `ck_tasks_type`.
- **Why**: Scope cuts change governance to eliminate functional overlap with MedVault, which owns approvals and audits. A release's readiness is now purely a function of empty/incomplete/blocked work.
- **How it works**: Migration `V16__remove_change_governance.sql` converts first and drops second, with no `CASCADE`: `UPDATE tasks SET type='FEATURE', risk_level=NULL WHERE type='CHANGE'`, then drops `change_approvals`, `idx_tasks_risk_level`, `ck_tasks_change_risk`, `ck_tasks_risk_level`, and the `risk_level` column, then adds `ck_tasks_type`. Pre-migration inventory on a seeded database showed 4 `CHANGE` rows (all `HIGH` risk), 0 unexpected types, and 0 approval rows. V16 was executed against a disposable seeded scratch database (plus 4 legacy `CHANGE` fixtures spanning all risk levels and 2 approval fixtures): the 4 rows converted to `FEATURE` with statuses preserved, governance objects disappeared, row counts were otherwise unchanged, and a rolled-back `INSERT type='CHANGE'` probe confirmed the new constraint rejects the cut type.
- **Tests that prove it**:
  - `WorkItemTypeIntegrationTest.java:createTask_supportsEveryType()` (verified - `@EnumSource` now covers exactly 3 types)
  - `WorkItemTypeIntegrationTest.java:viewer_cannotChangeType()` (verified - auth on reclassification without `CHANGE`)
  - `ReadinessIntegrationTest.java:Gates.readyRelease()` (verified - READY with no governance gate)
  - `TaskBoard.test.tsx:offers every work item type in the create form` (verified - `['FEATURE', 'BUG', 'TECH_DEBT']`)
  - Deleted: `ApprovalIntegrationTest` (16), `ApprovalConcurrencyIntegrationTest` (3), `ChangeRiskPolicyTest` (5), `ReadinessIntegrationTest$ChangeGovernanceGate` (5), `ApprovalModal.test.tsx` (9), `approvalService.test.ts` (3) — each covered only removed behaviour.

---

## 9. Cancelled Release State Cut (Phase 3, D6)
- **What it does**: Restricts the release lifecycle to `PLANNED -> IN_PROGRESS -> RELEASED`. The `CANCELLED` state, its transitions, its UI actions/badges, and the `RELEASE_CANCELLED` readiness gate are gone; `RELEASED` is now the only terminal state. The three remaining gates are `EMPTY_RELEASE`, `INCOMPLETE_WORK`, `BLOCKED_WORK`, enforced in that ordinal order.
- **Why**: Scope defines the lifecycle strictly without cancellation. Deletion stays available, but only while a release is still `PLANNED`.
- **How it works**: `ReleaseLifecycleState.canTransitionTo()` allows only the two forward moves; `deleteRelease()` still rejects anything past `PLANNED`. Migration `V17__remove_cancelled_release_state.sql` applies the approved Option B handling first (`UPDATE releases SET lifecycle_state='PLANNED' WHERE lifecycle_state='CANCELLED'`), then adds the brand-new `ck_releases_lifecycle_state` constraint — no `CASCADE`, since no object depends on the removed value. Pre-migration inventory on a seeded database showed 1 `CANCELLED` release holding 1 task and 0 unexpected states. V17 was executed against a disposable seeded scratch database (plus 1 `CANCELLED` fixture release with 1 scoped task): the fixture converted to `PLANNED` with its task still scoped, 0 `CANCELLED` rows remain, and a rolled-back `CANCELLED` insert probe confirmed the new constraint rejects the cut state. Trade-off: records and associations survive, but recorded lifecycle history changes, making converted releases editable and deletable again.
- **Tests that prove it**:
  - `ReleaseIntegrationTest.java:Lifecycle.plannedToCancelled_isRejected()` (verified - unknown `CANCELLED` value fails with 400)
  - `ReleaseIntegrationTest.java:Crud.delete_afterStart_isRejected()` (verified - deletion stays PLANNED-only)
  - `ReadinessIntegrationTest.java:Determinism.gateReasonsFollowCodeOrder()` (verified - INCOMPLETE×3 sort ahead of BLOCKED×1)
  - `ReleaseDetail.test.tsx:offers only the transitions the server would accept` (verified - no Cancel action)
  - Deleted: `cancelledIsTerminal`, `cancelledRelease()`, `ReadinessPanel.test.tsx:explains a cancelled release` — each covered only removed behaviour.

---

## 10. Task Activity & Audit Trail Cut (Phase 4, D7)
- **What it does**: Removes all task-mutation history tracking: the `task_activities` table, the `TaskActivity` entity/recorder/repository/mapper/DTO, the `GET /tasks/{taskId}/activities` endpoint, every `activityRecorder` invocation in `TaskService`/`ReleaseService`/`DependencyService`, and the frontend `useTaskActivities` hook, `activityService`, and activity types. Mutations now change only domain state.
- **Why**: Scope cuts activity and audit trails because MedVault owns the auditing narrative; history side effects do not belong on the delivery write path.
- **How it works**: Services were de-instrumented (record calls and the helper deleted; `removeDependency` keeps its scoped edge lookup and task validation). Migration `V18__remove_task_activities.sql` is a single `DROP TABLE IF EXISTS task_activities` — verified safe without `CASCADE` since the table's foreign keys point outward only. Pre-migration inventory on a seeded database showed 0 activity rows. V18 was executed against a disposable seeded scratch database: the table is gone, v18 recorded successful, and domain rows are intact (12 tasks, 5 releases, 4 dependencies).
- **Tests that prove it**:
  - `ReleaseIntegrationTest.java:Scope.addAndRemove_updatesScope()` (verified - scope change asserted via API + DB, no history)
  - `DependencyIntegrationTest.java:EdgeCreation.removeEdge_deletesEdge()` (verified - deletion asserted via 204 + zero count)
  - `WorkItemTypeIntegrationTest.java:updateTask_changesType()` (verified - type change asserted via response + DB)
  - Deleted: `TaskActivityIntegrationTest` (2), `DependencyIntegrationTest.createEdge_isAudited` (1, redundant with `createEdge`) — each covered only removed behaviour.

---

## 12. Workspace Roles Cut (Phase 6, D9)
- **What it does**: Reduces workspace membership to `OWNER` (manages settings and members) and `MEMBER` (creates and edits work items, releases, dependencies). `ADMIN` and `VIEWER` are gone from the enum, the authorization checks, the member UI, and the database (via approved mappings + a new check constraint).
- **Why**: Scope cuts the Admin/Viewer split. The single-owner invariant (`workspaces.owner_id` + "cannot assign/remove OWNER") makes `ADMIN -> OWNER` invalid, so demotion to `MEMBER` is the least-privilege mapping; promoting `VIEWER` would silently expand read-only users to writers, so revocation was approved instead.
- **How it works**: `getWorkspaceForOwner` gates member management to `OWNER` only; `getWorkspaceForMutation` is now pure membership verification. Migration `V20__simplify_workspace_roles.sql` applies the approved Gate A (`UPDATE … SET role='MEMBER' WHERE role='ADMIN'`), Gate B (`DELETE … WHERE role='VIEWER'`), then adds the brand-new `ck_workspace_members_role`. Pre-migration inventory on a seeded database showed 0 `ADMIN`/`VIEWER`/unexpected roles. V20 was executed against a disposable seeded scratch database (plus 1 `ADMIN` + 1 `VIEWER` fixture): the admin demoted, the viewer row deleted, the owner untouched, and a rolled-back `VIEWER` insert probe confirmed the constraint.
- **Tests that prove it**:
  - `WorkspaceAuthorizationIntegrationTest.java:owner_inviteMember_isAllowed()` / `owner_removeMember_isAllowed()` (verified - OWNER-only management)
  - `WorkspaceAuthorizationIntegrationTest.java:member_deleteWorkspace_isForbidden()` (verified - non-owner cannot delete)
  - `TaskAuthorizationIntegrationTest.java:member_createTask_isAllowed()` (verified - MEMBER mutates)
  - `ReleaseDetail.test.tsx:a MEMBER gets the mutating controls` (verified - member-wide UI)
  - Deleted: 7 viewer task tests, 2 release viewer tests, 1 dependency viewer test, 1 work-item viewer test — each covered only removed behaviour.

---

## 13. Access-Token Lifetime (Phase 7)
- **What it does**: Pins down the stateless access-token lifetime now that silent renewal is gone: 15 minutes in `prod` (and compose), 24 hours in the dev default. Dead `JWT_REFRESH_EXPIRATION` properties were removed, and the README Security section states the no-refresh trade-off.
- **Why**: Without rotation, an intercepted token is usable until expiry while an expired token forces re-login — so the lifetime is the whole session-security posture, and it must be short in production.
- **How it works**: `JwtService` mints `exp = now + jwt.expiration`; validation rejects expired tokens at parse time. The 60-minute proposal was superseded: production already enforced a stricter 15 minutes, which was kept rather than weakened.
- **Tests that prove it**:
  - `JwtServiceTest.java:generatedTokenExpiresAfterConfiguredLifetime()` (verified - expiry honors configuration within JWT second-resolution)
  - `JwtServiceTest.java:negativeLifetimeTokenIsInvalid()` (verified - expired token rejected at parse)

---

## 16. Scope-Aligned Documentation (Phase 10)
- **What it does**: Rewrites the README to describe only what the system is: scoped delivery model, current V1–V20 schema diagram, three readiness gates, OWNER/MEMBER authorization, register/login-only auth, verified commands, and an explicit cut list.
- **Why**: The old README documented removed features (approvals, risk levels, refresh rotation, cancelled releases, activity trail, benchmark) as if they were current, which contradicts the factual-documentation rule.
- **How it works**: Every command was re-verified (compose ports/proxy, demo credentials over the API, `test:ci`, local ports); the workspace one-liner and token trade-off note are included verbatim; counts state the true totals (154 + 65).
- **Tests that prove it**:
  - Final green run: backend 154 passed, frontend 65 passed, production frontend build clean.

---

## 14. READY-Gated Release (Phase 8, D4)
- **What it does**: Ties the release state machine to the derived readiness engine: `IN_PROGRESS -> RELEASED` succeeds only when readiness evaluates `READY`, otherwise the server rejects with 400 and lists the blocking reasons. The UI mirrors the rule by disabling the Release action with a reason count while `NOT_READY`.
- **Why**: A release must not ship while any gate (empty release, incomplete work, unresolved blockers) is firing — this is the system's core value proposition, enforced for every caller, not just the UI.
- **How it works**: `updateLifecycle` resolves `ReadinessService` lazily (`ObjectProvider`, avoiding a constructor cycle since the engine depends back on `ReleaseService`) and evaluates the release before mutating state.
- **Tests that prove it**:
  - `ReleaseIntegrationTest.java:Lifecycle.inProgressToReleased_whileNotReady_isRejected()` (verified - 400 with NOT_READY reasons, state unchanged)
  - `ReleaseIntegrationTest.java:Lifecycle.inProgressToReleased_whenReady_succeeds()` (verified - 200, state RELEASED)
  - `ReleaseDetail.test.tsx:disables the Release action while readiness is NOT READY` (verified - button disabled with tooltip)

---

## 15. Seeded Demo Verdicts (Phase 9)
- **What it does**: The demo dataset makes every readiness verdict visible on a fresh database without any clicks: one `READY` release and `NOT_READY` releases covering each reason code.
- **Why**: The delivery engine is invisible until data exercises it; seeding both ends of the verdict spectrum proves the gates end to end on first boot.
- **How it works**: Verified over the live API against a seeded database — `Design System Baseline` returns `READY` (all `DONE`, unblocked); `Q3 UI Refresh` returns `NOT_READY` with `INCOMPLETE_WORK` + `BLOCKED_WORK`; `API v2.1 Planning` returns `NOT_READY` with `EMPTY_RELEASE`; `Native Mobile Shell` returns `NOT_READY` with `INCOMPLETE_WORK`.
- **Tests that prove it**:
  - `ReadinessIntegrationTest.java:Gates.*` (verified - each gate in isolation)
  - `ReadinessIntegrationTest.java:Determinism.*` (verified - combined gates with deterministic ordering)

---

## 11. Refresh-Token Rotation Cut (Phase 5, D8)
- **What it does**: Reduces auth to register/login plus stateless JWT access tokens: the `refresh_tokens` table, entity, repository, service, hasher, cleanup task, exception, refresh DTOs, `POST /refresh` and `POST /logout` endpoints, and the frontend rotation interceptor plus refresh storage are all gone. The Axios client now clears local auth on 401 instead of silently refreshing.
- **Why**: Scope mandates minimal auth; silent session renewal is cut, so an expired access token means re-authenticating with email/password.
- **How it works**: `AuthService` mints only the JWT; `AuthResponse` carries `token` + user. Migration `V19__remove_refresh_tokens.sql` is a single `DROP TABLE IF EXISTS refresh_tokens` — verified safe without `CASCADE` since the table's only foreign key points outward. Pre-migration inventory on a seeded database (count-based only, never selecting token material) showed 0 sessions. V19 was executed against a disposable seeded scratch database and API-verified: register/login return access-token-only bodies, removed endpoints have no mapping, and protected routes stay 200-with-token / 401-without.
- **Tests that prove it**:
  - `EndToEndIntegrationTest.java:registerAndLogin_work()` (verified - register/login contract without refresh fields)
  - `AuthServiceTest.java:login_returnsAuthResponseOnValidCredentials()` (verified - access-token-only response)
  - `TaskBoard`/`Dashboard` suites (verified - 64 frontend tests green against the pruned auth types)
  - Deleted: `RefreshTokenServiceTest` (9), `refreshRotatesTokenAndLogoutInvalidatesRefreshToken` (1), `AuthServiceTest` refresh/logout tests (3) — each covered only removed behaviour.
