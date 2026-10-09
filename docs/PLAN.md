# docs/PLAN.md — AgileTrack Scope Alignment Plan

This execution plan adapts the project brief to the findings of `docs/AUDIT.md` and approved decisions (`D1` through `D4`).
Work proceeds strictly in sequential, reviewable phases on branch `scope-v1`.

---

## Global Phase Gate & Review Protocol

Every phase in this plan must strictly adhere to this protocol before any subsequent phase begins:

1. **Explicit Goal & Scope**: Restate the phase goal and enumerate the exact files to be added, modified, or deleted before making changes.
2. **Atomic Commits on `scope-v1`**: Changes committed with descriptive, factual messages on branch `scope-v1`. No history rewriting.
3. **Green Test Suite & Build Verification**: Full test suite executed with zero regressions. All non-cut tests continue to pass.
4. **Migration Safety & Approval**: Never execute a destructive migration without prior explicit user approval. Always convert data before dropping schema elements. Present data inventory and proposed SQL beforehand.
5. **Documentation Synchronization**: Update `docs/PLAN.md`, `DECISIONS.md`, `docs/AUDIT.md`, and add the relevant section to `docs/WALKTHROUGH.md`.
6. **Phase Review Report**: Report:
   - What changed (files touched, commits).
   - Test and build results.
   - Database migration status and data impact.
   - Unverified items and remaining risks.
   - 3 interview questions you should be able to answer defending the phase.
7. **STOP and Wait**: **Cease execution immediately and await explicit user approval before proceeding to the next phase**.

> [!CRITICAL]
> **Hard Rules on Database Migrations**:
> 1. **Never edit existing Flyway migrations (`V1`..`V15`)**. All schema modifications are added as new sequential Flyway migrations (`V16`, `V17`, etc.).
> 2. **Never execute a destructive migration without explicit user approval**.
> 3. **Always inventory and convert existing data before dropping constraints, columns, or tables**.
> 4. **Verified schema constraints**:
>    - `releases.lifecycle_state`: Verified that across `V1`..`V15`, **no check constraint exists** on `lifecycle_state`. Only `VARCHAR(50) NOT NULL DEFAULT 'PLANNED'` was created in `V13`. Adding `ck_releases_lifecycle_state` in Phase 3 is a brand-new constraint.
>    - `workspace_members.role`: Verified that across `V1`..`V15`, **no check constraint exists** on `role`. Only `VARCHAR(50) NOT NULL` was created in `V2`. Adding `ck_workspace_members_role` in Phase 6 is a brand-new constraint.
> 5. **Avoid `CASCADE` drops** unless the full dependency graph is verified, documented, and approved.

---

## Phase 0: Baseline Freeze & Documentation First
- **Goal**: Establish verified test baseline and generate core project governance and gap documentation without any application code modifications.
- **Checklist**:
  - [x] Extract and verify `AgileTrack_Scope_v1.docx`.
  - [x] Create branch `scope-v1`.
  - [x] Run full backend and frontend test suites and verify baseline counts (208 backend, 76 frontend, 284 total).
  - [x] Create `AGENTS.md` at repository root.
  - [x] Create `docs/SCOPE.md`.
  - [x] Create `DECISIONS.md`.
  - [x] Create `docs/AUDIT.md`.
  - [x] Create `docs/PLAN.md`.
  - [x] Create `docs/WALKTHROUGH.md` outline.
  - [x] Mark `docs/BASELINE.md` as historical archive.
  - [x] STOP and await user approval before proceeding to Phase 1.
- **Files Touched**:
  - `AGENTS.md`, `docs/SCOPE.md`, `DECISIONS.md`, `docs/AUDIT.md`, `docs/PLAN.md`, `docs/WALKTHROUGH.md`, `docs/BASELINE.md`.
- **Tests Added/Removed**: None.
- **Risks**: None (no production or test code modified).
- **Status**: **COMPLETE (Approved with corrections incorporated)**.

---

## Phase 1: Cut Extraneous Files & Performance Benchmark
- **Goal**: Remove files explicitly excluded by Scope Section 7 (`INTERVIEW_PREP.md`, `CONTRIBUTING.md`, and `PerformanceBenchmarkTest.java`).
- **Checklist**:
  - [x] Delete `INTERVIEW_PREP.md`.
  - [x] Delete `CONTRIBUTING.md`.
  - [x] Delete `backend/src/test/java/com/agiletrack/backend/benchmark/PerformanceBenchmarkTest.java`.
  - [x] Verify test suite continues to pass with 284 tests (benchmark was excluded by default surefire).
  - [x] Update `docs/PLAN.md`, `DECISIONS.md`, `docs/AUDIT.md`, and add Section 7 to `docs/WALKTHROUGH.md`.
- **Files Touched**:
  - Deleted: `INTERVIEW_PREP.md`, `CONTRIBUTING.md`, `backend/src/test/java/com/agiletrack/backend/benchmark/PerformanceBenchmarkTest.java`.
- **Tests Added/Removed**:
  - Removed: `PerformanceBenchmarkTest.java` (measurement harness, had no assertions).
- **Historical Deviation Note**:
  - Phase 1 was executed earlier due to an automatic review policy stop hook before interactive approval was given. The phase was subsequently audited and confirmed harmless (deleting 2 extraneous doc files and 1 excluded benchmark test with zero regressions across 284 passing tests). The protocol now strictly enforces awaiting explicit user text approval before starting Phase 2.
- **Status**: **COMPLETE**.

---

## Phase 2: Cut Change Governance & Approval Workflow
- **Goal**: Remove all change governance concepts (`CHANGE` task type, risk levels, approval models, approval gates, and frontend modals) to eliminate overlap with MedVault.
- **Verified Schema Context (from `V12` and `V15`)**:
  - `V12`: Added column `type VARCHAR(50) NOT NULL DEFAULT 'FEATURE'` to `tasks`. (No check constraint added in `V12`).
  - `V15`: Added column `risk_level VARCHAR(50)` to `tasks`.
  - `V15`: Added check constraint `ck_tasks_risk_level CHECK (risk_level IS NULL OR risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))` on `tasks`.
  - `V15`: Added check constraint `ck_tasks_change_risk CHECK (type = 'CHANGE' OR risk_level IS NULL)` on `tasks`.
  - `V15`: Added index `idx_tasks_risk_level ON tasks(risk_level)`.
  - `V15`: Created table `change_approvals` with foreign keys to `tasks` and `users` (ON DELETE CASCADE), and constraint `ck_change_approval_decision CHECK (decision IN ('APPROVED', 'REJECTED'))`.
- **Mandatory Pre-Migration Data Inventory & Data Loss Impact**:
  1. **Work Items Inventory (`type = 'CHANGE'`)**:
     ```sql
     SELECT id, project_id, title, status, risk_level FROM tasks WHERE type = 'CHANGE';
     ```
  2. **Unexpected Task Types Inventory**:
     ```sql
     SELECT DISTINCT type FROM tasks WHERE type NOT IN ('FEATURE', 'BUG', 'TECH_DEBT');
     ```
  3. **`change_approvals` Table Inventory (Count & Decision Breakdown)**:
     ```sql
     SELECT COUNT(*) AS total_approvals,
            COUNT(*) FILTER (WHERE decision = 'APPROVED') AS approved_count,
            COUNT(*) FILTER (WHERE decision = 'REJECTED') AS rejected_count,
            COUNT(DISTINCT work_item_id) AS distinct_tasks_affected,
            COUNT(DISTINCT approver_id) AS distinct_approvers
     FROM change_approvals;
     ```
  4. **Documented Data Loss Impact**:
     Dropping `change_approvals` permanently and irreversibly deletes all historical approval decisions, rejection records, and reviewer sign-off history across all work items. Resetting `risk_level` on `tasks` removes all recorded risk categorization data.
  5. Report inventory counts and data loss summary to user before proceeding.
  6. **Stop Rule**: If the work-item type inventory finds values other than `CHANGE` that are outside the approved types (`FEATURE`, `BUG`, `TECH_DEBT`), **explicitly stop immediately** and present the findings to the user. Obtain an approved mapping from the user before finalizing or running the `V16` migration.
- **Database & Flyway Migration Plan (`V16__remove_change_governance.sql`)**:
  1. **Combined Data Conversion & Cleanup First**:
     - Convert all existing `CHANGE` tasks to `FEATURE` and reset `risk_level` to `NULL` in the **same atomic update**:
       ```sql
       UPDATE tasks SET type = 'FEATURE', risk_level = NULL WHERE type = 'CHANGE';
       ```
  2. **Schema & Constraint Drops (Ordered by Dependency, No CASCADE on `tasks`)**:
     - Drop dependent table `change_approvals` (no other tables reference it):
       ```sql
       DROP TABLE IF EXISTS change_approvals;
       ```
     - Drop index `idx_tasks_risk_level` on `tasks`:
       ```sql
       DROP INDEX IF EXISTS idx_tasks_risk_level;
       ```
     - Drop check constraint `ck_tasks_change_risk` from `tasks`:
       ```sql
       ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_change_risk;
       ```
     - Drop check constraint `ck_tasks_risk_level` from `tasks`:
       ```sql
       ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_risk_level;
       ```
     - Drop column `risk_level` from `tasks`:
       ```sql
       ALTER TABLE tasks DROP COLUMN IF EXISTS risk_level;
       ```
  3. **Add Enforcing Check Constraint for In-Scope Types**:
     - Enforce only valid types (`FEATURE`, `BUG`, `TECH_DEBT`) on `tasks`:
       ```sql
       ALTER TABLE tasks ADD CONSTRAINT ck_tasks_type CHECK (type IN ('FEATURE', 'BUG', 'TECH_DEBT'));
       ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V16__remove_change_governance.sql`, pre-migration inventory counts, and documented data loss impact. Await explicit user approval before execution.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of work items with `type = WorkItemType.CHANGE`, remove `riskLevel` configurations, and remove `change_approvals` seeding.
- **Application Code Changes**:
  - Backend:
    - Remove package `com.agiletrack.backend.approval` (`ChangeApproval`, `ChangeApprovalService`, `ChangeRiskPolicy`, `ChangeApprovalRepository`, `ApprovalController`, DTOs).
    - Remove `CHANGE` from `WorkItemType` enum (`FEATURE`, `BUG`, `TECH_DEBT` remain).
    - Remove `riskLevel` from `Task` entity and DTOs (`TaskResponse`, `CreateTaskRequest`, `UpdateTaskRequest`, `TaskMapper`).
    - Remove `APPROVAL_REQUIRED` from `ReadinessReasonCode` and `ReadinessService.calculateReadiness()`.
  - Frontend:
    - Delete `ApprovalModal.tsx` and `approvalService.ts`.
    - Remove approval buttons and badges from `TaskBoard.tsx`, `TaskCard.tsx`, `ReleaseDetail.tsx`.
    - Update TypeScript definitions in `types/index.ts` to remove `CHANGE`, `RiskLevel`, and `ChangeApproval`.
- **Tests Added/Removed**:
  - Removed backend: `ApprovalIntegrationTest` (16), `ApprovalConcurrencyIntegrationTest` (3), `ChangeRiskPolicyTest` (5) = 24 tests (correction: `docs/PLAN.md` previously estimated 6/2/6 = 14; actual annotation counts verified from git history).
  - Removed frontend: `ApprovalModal.test.tsx` (9), `approvalService.test.ts` (3) = 12 tests.
  - Removed from `ReadinessIntegrationTest`: entire `ChangeGovernanceGate` nested class = 5 tests.
  - Shrunk: `WorkItemTypeIntegrationTest.createTask_supportsEveryType` `@EnumSource` 4 invocations -> 3.
  - Updated (no count change): `WorkItemTypeIntegrationTest` (2 auth tests now attempt `TECH_DEBT`), `EndToEndIntegrationTest` (3 request constructors minus `riskLevel`), `TaskBoard.test.tsx`, `Dashboard.test.tsx`, `taskService.test.ts`.
  - Backend suite: **178 passed, 0 failed** (baseline 208 - 30 removed = 178, reconciled exactly). Frontend suite: **64 passed, 0 failed** (baseline 76 - 12 = 64).
  - V16 was additionally exercised by the backend suite itself: Testcontainers applied all 16 migrations and Hibernate `validate` passed with 9 repositories.
- **Risks**: Medium. Multiple DTO signatures modified; all construction sites across integration tests must be updated cleanly.
- **Status**: **COMPLETE (executed 2026-10-09; commits `086f648` backend, `6c3027f` frontend)**.
- **Execution Record (verified, seeded scratch database)**:
  - Pre-migration inventory (read-only): 4 `CHANGE` tasks (all `HIGH` risk in the original seed; fixture re-run covered all four risk levels), 0 unexpected task types, 0 `change_approvals` rows in seed data.
  - V16 executed via Flyway on a disposable scratch database (`postgres:15-alpine`, V1–V15 + seed, then 4 legacy `CHANGE` fixture rows + 2 approval fixture rows inserted to prove conversion and deletion paths).
  - Post-migration verification: 4 legacy rows converted to `FEATURE` with statuses preserved; `change_approvals` table, `risk_level` column, `idx_tasks_risk_level`, `ck_tasks_change_risk`, `ck_tasks_risk_level` all gone; only `ck_tasks_type` remains; `INSERT type='CHANGE'` rejected by the new constraint (probe rolled back, 0 rows left behind); total row count unchanged apart from the 2 intentionally deleted approval fixtures.
  - Limitation: figures quantify a freshly seeded environment (plus disclosed fixtures). A database holding real AgileTrack data must be inventoried before V16 runs against it.
  - Deviations from the plan recorded during implementation: no `TaskCard.tsx` exists (cards are inline in `TaskBoard`/`ReleaseDetail`); the service class is `ApprovalService`, not `ChangeApprovalService`; `ReadinessService.evaluate`, not `calculateReadiness`; `Dashboard.tsx`, `useApproval.ts`, `ReadinessPanel.tsx` and three frontend test files needed edits beyond the plan for compile-safety; `ActivityType` members (`RISK_CHANGED`, `APPROVAL_*`) intentionally left for Phase 4.

---

## Phase 3: Cut Cancelled Release State & RELEASE_CANCELLED Gate
- **Goal**: Align release lifecycle strictly with v1 scope (`PLANNED -> IN_PROGRESS -> RELEASED`). Remove `CANCELLED` state and `RELEASE_CANCELLED` gate.
- **Verified Schema Context (from `V13`)**:
  - `V13`: Table `releases` created with columns:
    - `id UUID PRIMARY KEY`, `project_id UUID NOT NULL`, `name VARCHAR(150) NOT NULL`, `release_version VARCHAR(50)`, `lifecycle_state VARCHAR(50) NOT NULL DEFAULT 'PLANNED'`, `target_date DATE`, `created_at TIMESTAMP`, `updated_at TIMESTAMP`, `version BIGINT NOT NULL DEFAULT 0`.
    - Constraint `fk_release_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`.
    - Constraint `uq_release_name_per_project UNIQUE (project_id, name)`.
    - Index `idx_releases_lifecycle_state ON releases(lifecycle_state)`.
  - `V13`: Table `tasks` has foreign key `fk_task_release FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL`.
  - **Verification Finding**: Verified that across `V1`..`V15`, **no check constraint exists** on `releases.lifecycle_state`.
- **Mandatory Pre-Migration Data Inventory & Decision Gate**:
  - **Step 1: Inventory Existing Cancelled Releases**:
    Execute verified query matching the exact `V13` schema:
    ```sql
    SELECT id, project_id, name, release_version, lifecycle_state, target_date, created_at, version FROM releases WHERE lifecycle_state = 'CANCELLED';
    ```
  - **Step 2: Explicit User Decision Required on Cancelled Releases**:
    Present the exact count and details of cancelled releases to the user. **Do not make deletion the automatic default**. Wait for user's explicit decision:
    - *Decision Option A (Delete)*:
      `DELETE FROM releases WHERE lifecycle_state = 'CANCELLED';`
      (Foreign key `fk_task_release` sets `tasks.release_id = NULL` safely via `ON DELETE SET NULL`).
    - *Decision Option B (Transition to PLANNED)*:
      `UPDATE releases SET lifecycle_state = 'PLANNED' WHERE lifecycle_state = 'CANCELLED';`
    - *Decision Option C (Abort / Manual Handling)*: Halt migration until user performs custom data migration.
  - **Step 3: Inventory Unexpected Lifecycle States**:
    Execute query to identify any release lifecycle states outside `PLANNED`, `IN_PROGRESS`, `RELEASED`, and `CANCELLED`:
    ```sql
    SELECT DISTINCT lifecycle_state FROM releases WHERE lifecycle_state NOT IN ('PLANNED', 'IN_PROGRESS', 'RELEASED', 'CANCELLED');
    ```
    If unexpected lifecycle states exist, **explicitly stop** and resolve them with the user before adding the check constraint `ck_releases_lifecycle_state`.
- **Database & Flyway Migration Plan (`V17__remove_cancelled_release_state.sql`)**:
  1. Execute approved data handling SQL based on explicit user decisions for `CANCELLED` releases and any resolved unexpected states.
  2. Add new check constraint to enforce strictly the 3 in-scope states:
     ```sql
     ALTER TABLE releases ADD CONSTRAINT ck_releases_lifecycle_state CHECK (lifecycle_state IN ('PLANNED', 'IN_PROGRESS', 'RELEASED'));
     ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V17__remove_cancelled_release_state.sql` and inventory results. Await explicit user approval before execution.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of any release in `CANCELLED` state (seed only `PLANNED`, `IN_PROGRESS`, and `RELEASED`).
- **Application Code Changes**:
  - Backend:
    - Remove `CANCELLED` from `ReleaseLifecycleState` enum.
    - Update `ReleaseLifecycleState.canTransitionTo()`: allow only `PLANNED -> IN_PROGRESS` and `IN_PROGRESS -> RELEASED`.
    - Remove `RELEASE_CANCELLED` from `ReadinessReasonCode` and `ReadinessService.calculateReadiness()`.
    - Update `ReleaseService.deleteRelease()`: deletion strictly allowed while `PLANNED`.
  - Frontend:
    - Remove `CANCELLED` state handling and badges from `ReleaseDetail.tsx`, `ReleaseList.tsx`, `types/index.ts`.
- **Tests Added/Removed**:
  - Removed: `cancelledIsTerminal` in `ReleaseIntegrationTest.java`, `cancelledRelease()` in `ReadinessIntegrationTest.java`.
  - Added: `plannedToCancelled_isRejected` in `ReleaseIntegrationTest.java` (raw `"CANCELLED"` now fails deserialization with 400).
  - Reworked: `releaseLevelReasonsComeFirst` -> `gateReasonsFollowCodeOrder` in `ReadinessIntegrationTest.java` (explicit INCOMPLETE×3 + BLOCKED×1 code ordering; the old release-level-pairing scenario is impossible with only `EMPTY_RELEASE` left).
  - Reworked frontend: `ReleaseDetail.test.tsx` (Cancel button gone, asserted absent), `ReadinessPanel.test.tsx` (`RELEASE_CANCELLED` case -> `EMPTY_RELEASE` case).
  - Backend suite: **177 passed, 0 failed** (178 - 2 removed + 1 added = 177, reconciled). Frontend suite: **64 passed, 0 failed** (count unchanged).
  - V17 additionally exercised by the backend suite: Testcontainers validated and applied all 17 migrations.
- **Risks**: Low. State machine reduction simplifies lifecycle transitions.
- **Status**: **COMPLETE (executed 2026-10-09; approved handling Option B)**.
- **Execution Record (verified, seeded scratch database)**:
  - Pre-migration inventory (read-only): 1 `CANCELLED` release (`Native Mobile Shell`, holding 1 task), 0 unexpected lifecycle states.
  - Approved handling Option B applied via Flyway V17 on a disposable scratch database (plus 1 `CANCELLED` fixture release + 1 scoped fixture task): fixture converted to `PLANNED` with the task association preserved; 0 `CANCELLED` rows remain; `ck_releases_lifecycle_state` present with the exact 3-state definition; a rolled-back `CANCELLED` insert probe was rejected (0 rows left behind).
  - Trade-off (Option B): release records and task associations are preserved, but recorded lifecycle history changes (`CANCELLED -> PLANNED`), making converted releases editable and deletable again.
  - Limitation: figures quantify a freshly seeded environment (plus disclosed fixtures). A database holding real AgileTrack data must be inventoried before V17 runs against it.
  - Deviations: `ReadinessService.evaluate`, not `calculateReadiness`; `ReleaseController` OpenAPI description also scrubbed; `deleteRelease` PLANNED-only rule already held (only its message changed).

---

## Phase 4: Cut Task Activity & Audit Trail
- **Goal**: Remove task activity history tracking and the activity timeline endpoint, as MedVault owns the auditing narrative.
- **Verified Schema Context (from `V10`)**:
  - `V10`: Table `task_activities` created with:
    - Foreign key `task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE`.
    - Foreign key `user_id UUID NOT NULL REFERENCES users(id)`.
    - Index `idx_task_activities_task_id ON task_activities(task_id)`.
  - **Verification Finding**: No other tables in `V1`..`V15` reference `task_activities`.
- **Mandatory Pre-Migration Data Inventory & Data Loss Impact**:
  1. **`task_activities` Table Inventory (Count & Activity Summary)**:
     - Total record count and affected entities:
       ```sql
       SELECT COUNT(*) AS total_activities,
              COUNT(DISTINCT task_id) AS distinct_tasks_affected,
              COUNT(DISTINCT user_id) AS distinct_actor_users
       FROM task_activities;
       ```
     - Breakdown by activity type:
       ```sql
       SELECT activity_type, COUNT(*) AS count
       FROM task_activities
       GROUP BY activity_type
       ORDER BY count DESC;
       ```
  2. **Documented Data Loss Impact**:
     Dropping `task_activities` permanently and irreversibly deletes all historical task change logs, status mutation timestamps, assignment audit histories, and user activity timelines across all projects. (Note: MedVault retains the authoritative compliance and audit narrative).
  3. Report activity inventory counts and data loss summary to user before proceeding.
- **Database & Flyway Migration Plan (`V18__remove_task_activities.sql`)**:
  1. Drop table `task_activities` without CASCADE:
     ```sql
     DROP TABLE IF EXISTS task_activities;
     ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V18__remove_task_activities.sql`, pre-drop activity inventory counts, and documented data loss impact. Await explicit user approval before execution.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of task activity records.
- **Application Code Changes**:
  - Backend:
    - Remove `TaskActivityRecorder` invocations in `TaskService` and `ReleaseService`.
    - Delete `TaskActivity.java`, `TaskActivityRepository.java`, `TaskActivityRecorder.java`, `ActivityType.java`.
    - Remove `GET /tasks/{taskId}/activities` endpoint from `TaskController`.
  - Frontend:
    - Remove activity history components and views if present.
- **Tests Added/Removed**:
  - Removed: `TaskActivityIntegrationTest.java` (2 tests).
  - Removed: `DependencyIntegrationTest.createEdge_isAudited` (1 test; its surviving assertions duplicated `createEdge`, which still passes).
  - Reworked (no count change): `removeEdge_isAudited` -> `removeEdge_deletesEdge`, `addAndRemove_areAudited` -> `addAndRemove_updatesScope` (plus a DB-level scope assertion), `updateTask_recordsTypeChangeActivity` -> `updateTask_changesType` (response + DB assertions).
  - Backend suite: **174 passed, 0 failed** (177 - 3 removed = 174, reconciled). Frontend suite: **64 passed, 0 failed** (no frontend test changes; no test files covered the deleted hook/service).
  - V18 additionally exercised by the backend suite: Testcontainers validated and applied all 18 migrations (repositories 10 -> 8).
- **Risks**: Low. Removes non-domain side effects from task mutations.
- **Status**: **COMPLETE (executed 2026-10-09 under standing authorization)**.
- **Execution Record (verified, seeded scratch database)**:
  - Pre-migration inventory (read-only): 0 rows in `task_activities` (0 tasks, 0 actors), empty per-type breakdown. The seeder writes through repositories and never records history.
  - Verified drop-safe without `CASCADE`: `task_activities` FKs point outward only (`task_id -> tasks ON DELETE CASCADE`, `user_id -> users`); no inbound references from any other table.
  - V18 executed via Flyway on a disposable scratch database: table gone, v18 recorded successful, domain rows intact (12 tasks, 5 releases, 4 dependencies), backend started healthy on the migrated schema.
  - Data-loss impact (seeded env): 0 rows deleted. A database holding real activity history would lose it irreversibly — such a database must be inventoried before V18 runs against it.
  - Deviations: `DependencyService` recorder invocations, `TaskActivityMapper`, `TaskActivityResponse`, frontend `useTaskActivities`/`activityService`/`ActivityType` types, and three extra test reworks went beyond the plan's file list (found by reference sweep); `DataSeeder` needed no change (it never seeded activities).

---

## Phase 5: Cut Refresh Token Rotation
- **Goal**: Keep authentication strictly minimal (stateless access tokens + BCrypt passwords), eliminating refresh tokens and rotation endpoints.
- **Verified Schema Context (from `V7` and `V9`)**:
  - `V7`: Table `refresh_tokens` created with foreign key `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`.
  - `V9`: Cleared existing refresh tokens.
  - **Verification Finding**: No other tables in `V1`..`V15` reference `refresh_tokens`.
- **Mandatory Pre-Migration Data Inventory & Session Invalidation Impact**:
  1. **`refresh_tokens` Table Inventory (Count-Based, No Secrets Exposed)**:
     - Execute strictly count-based inventory query:
       ```sql
       SELECT COUNT(*) AS total_tokens,
              COUNT(DISTINCT user_id) AS distinct_users_with_sessions,
              COUNT(*) FILTER (WHERE expiry_date > CURRENT_TIMESTAMP) AS active_unexpired_tokens,
              COUNT(*) FILTER (WHERE expiry_date <= CURRENT_TIMESTAMP) AS expired_tokens
       FROM refresh_tokens;
       ```
     - **Security Invariant**: Never query, select, or log actual token strings (`token`), token hashes, or session secrets.
  2. **Documented Session Invalidation & Data Loss Impact**:
     Dropping `refresh_tokens` permanently removes stored refresh session records and immediately invalidates all active persistent sessions. Users can no longer silently refresh expired access tokens and will be required to re-authenticate with their primary credentials (email/password) as soon as their current stateless JWT access token expires.
  3. Report session counts and invalidation impact to user before proceeding.
- **Database & Flyway Migration Plan (`V19__remove_refresh_tokens.sql`)**:
  1. Drop table `refresh_tokens` without CASCADE:
     ```sql
     DROP TABLE IF EXISTS refresh_tokens;
     ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V19__remove_refresh_tokens.sql`, pre-drop session count inventory, and documented session invalidation impact. Await explicit user approval before execution.
- **Seed Data Changes**: None (refresh tokens are runtime session entities).
- **Application Code Changes**:
  - Backend:
    - Delete `RefreshToken.java`, `RefreshTokenRepository.java`, `RefreshTokenService.java`, `TokenRefreshException.java`.
    - Remove `POST /refresh` and `POST /logout` from `AuthController`.
    - Update `AuthService` and `AuthResponse` DTO to return only `accessToken` and user information.
  - Frontend:
    - Remove refresh token storage and token rotation interceptors from `authService.ts` and Axios client.
- **Tests Added/Removed**:
  - Removed: `RefreshTokenServiceTest.java` (9 tests; correction: the plan estimated 5, actual annotation count verified from git history).
  - Removed: `EndToEndIntegrationTest.refreshRotatesTokenAndLogoutInvalidatesRefreshToken` (1 test).
  - Reworked: `AuthServiceTest` (removed 3 refresh/logout tests + mock; register/login assertions now access-token-only).
  - Backend suite: **161 passed, 0 failed** (174 - 13 removed = 161, reconciled). Frontend suite: **64 passed, 0 failed** (no frontend test changes; logic covered by type-check + suite).
  - V19 additionally exercised by the backend suite: Testcontainers validated and applied all 19 migrations (repositories 9 -> 7).
- **Risks**: Low. Access tokens are already stateless JJWT tokens.
- **Status**: **COMPLETE (executed 2026-10-09 under standing authorization)**.
- **Execution Record (verified, seeded scratch database)**:
  - Pre-migration inventory, count-based only (no token material ever selected): 0 stored sessions, 0 users, 0 unexpired, 0 expired. Sessions are runtime entities; the seeder creates none.
  - Drop verified safe without `CASCADE`: only outward FK (`user_id -> users`); no inbound references.
  - V19 executed via Flyway on a disposable scratch database: table gone, v19 recorded successful.
  - API-verified post-state (tokens never printed): register 201 + login 200 return access-token-only bodies (`token`, `user` keys; no `refreshToken`); `POST /auth/refresh` and `POST /auth/logout` have no mapping (`NoResourceFoundException` in logs); protected route 200 with token / 401 without.
  - Observed pre-existing behavior (not a regression, out of scope): unmapped routes fall through to the generic handler and return 500 since no `NoResourceFoundException` mapping exists in `GlobalExceptionHandler` (absent in HEAD too).
  - Session-invalidation impact (seeded env): 0 sessions invalidated. A live database with logged-in users would invalidate active persistent sessions at V19 — such a database must be inventoried count-only before V19 runs against it.
  - Deviations: `RefreshTokenHasher`, `RefreshTokenCleanupTask`, `TokenRefreshRequest/Response`, `@EnableScheduling`, `AuthServiceTest`/`EndToEndIntegrationTest` reworks, and frontend `authStorage`/`AuthContext`/`Login`/`Register`/`Header` changes went beyond the plan's file list; `JWT_REFRESH_EXPIRATION` yaml properties deliberately left for Phase 7 (unbound, harmless).

---

## Phase 6: Simplify Roles to Owner and Member
- **Goal**: Consolidate roles to `OWNER` (manages workspace settings and members) and `MEMBER` (creates and edits work items, releases, dependencies), eliminating `ADMIN` and `VIEWER`.
- **Verified Schema & Business Logic Invariants (from `V2` and `WorkspaceService`)**:
  - `V2`: Table `workspaces` has `owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`.
  - `V2`: Table `workspace_members` has `role VARCHAR(50) NOT NULL` and `uk_workspace_user UNIQUE (workspace_id, user_id)`.
  - **Verification Finding**: Verified that across `V1`..`V15`, **no check constraint exists** on `workspace_members.role`.
  - **Single Owner Invariant Verified**: In `WorkspaceService.java`:
    - `workspaces.owner_id` uniquely identifies the workspace owner.
    - `inviteMember()` explicitly throws `BusinessRuleException("Cannot assign OWNER role via invitation")`.
    - `removeMember()` explicitly throws `BusinessRuleException("Cannot remove the workspace owner")`.
    - **Conclusion**: Multiple `OWNER` memberships per workspace are **INVALID** in AgileTrack's domain model.
- **Privilege Consequences of Role Mappings**:
  1. **Mapping `ADMIN`**:
     - *If `ADMIN -> OWNER`*: **Rejected**. Violates the single-owner invariant and causes multiple owner rows per workspace.
     - *If `ADMIN -> MEMBER` (Recommended)*: **Adheres to least privilege**. `ADMIN` users lose the ability to manage workspace members and settings, but retain full permissions to create and edit work items, releases, and dependencies as `MEMBER`.
  2. **Mapping `VIEWER`**:
     - *If `VIEWER -> MEMBER`*: **Privilege Expansion Warning**. Promotes previously read-only users to full write access (can create, modify, and delete work items, releases, and dependencies).
     - *Alternative*: Revoke/delete `VIEWER` memberships to preserve read-only restrictions, requiring workspace owners to deliberately grant `MEMBER` access if desired.
- **Mandatory Pre-Migration Data Inventory & Decision Gates**:
  1. **Role Counts & Member Inventory**:
     - Aggregate counts of existing roles outside `OWNER` and `MEMBER`:
       ```sql
       SELECT role, COUNT(*) AS count
       FROM workspace_members
       WHERE role NOT IN ('OWNER', 'MEMBER')
       GROUP BY role;
       ```
     - List detailed members with `ADMIN` and `VIEWER` roles:
       ```sql
       SELECT wm.id, wm.workspace_id, u.email, wm.role
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.role IN ('ADMIN', 'VIEWER')
       ORDER BY wm.role, wm.workspace_id;
       ```
     - Inventory any unexpected roles:
       ```sql
       SELECT DISTINCT role FROM workspace_members WHERE role NOT IN ('OWNER', 'MEMBER', 'ADMIN', 'VIEWER');
       ```
  2. **Present inventory results to the user**.
  3. **Dual Decision Gates (Explicit User Approval Required for Both)**:
     - **Gate A: Explicit Approval Required for `ADMIN` Mapping**:
       Although `ADMIN -> MEMBER` is recommended to adhere to least privilege, **it must not be treated as approved merely because it is recommended**. The user must review the inventory and explicitly approve the `ADMIN -> MEMBER` mapping (or specify an alternative) before it can be finalized.
     - **Gate B: Explicit Approval Required for `VIEWER` Handling**:
       The user must review the inventory and explicitly decide between:
       - *Option A (Privilege Expansion)*: `UPDATE workspace_members SET role = 'MEMBER' WHERE role = 'VIEWER';`
       - *Option B (Revocation)*: `DELETE FROM workspace_members WHERE role = 'VIEWER';`
       - *Option C (Manual Resolution)*: Custom handling specified by user.
  4. **Strict Non-Executable Draft Status**:
     `V20__simplify_workspace_roles.sql` remains strictly a non-executable draft template. No mapping or constraint SQL will be finalized or executed until the user has reviewed the inventory and given explicit approval for **both** the `ADMIN` decision and the `VIEWER` decision.
- **Database & Flyway Migration Plan (`V20__simplify_workspace_roles.sql`) (Draft Template)**:
  ```sql
  -- ==============================================================================
  -- V20__simplify_workspace_roles.sql (NON-EXECUTABLE DRAFT TEMPLATE)
  -- DO NOT EXECUTE UNTIL BOTH ADMIN AND VIEWER DECISIONS ARE EXPLICITLY APPROVED
  -- ==============================================================================

  -- 1. ADMIN mapping (REQUIRES EXPLICIT USER APPROVAL; NOT PRE-APPROVED):
  -- Option A (Recommended): UPDATE workspace_members SET role = 'MEMBER' WHERE role = 'ADMIN';

  -- 2. VIEWER mapping (REQUIRES EXPLICIT USER DECISION):
  -- Option A (Approved Expansion): UPDATE workspace_members SET role = 'MEMBER' WHERE role = 'VIEWER';
  -- Option B (Revocation): DELETE FROM workspace_members WHERE role = 'VIEWER';

  -- 3. Add brand-new check constraint enforcing strictly in-scope roles:
  -- ALTER TABLE workspace_members ADD CONSTRAINT ck_workspace_members_role CHECK (role IN ('OWNER', 'MEMBER'));
  ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V20__simplify_workspace_roles.sql` draft and role inventory results. The migration remains completely non-executable until explicit user approval is granted for both the `ADMIN` mapping and the selected `VIEWER` handling.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Seed only `OWNER` and `MEMBER` roles.
- **Application Code Changes**:
  - Backend:
    - Update `WorkspaceRole` enum to contain only `OWNER` and `MEMBER`.
    - Simplify `WorkspaceService` authorization checks:
      - `getWorkspaceForUser()`: verifies membership (`OWNER` or `MEMBER`).
      - `getWorkspaceForMutation()`: all verified members can mutate tasks, releases, dependencies.
      - Member management (`inviteMember`, `removeMember`, `updateWorkspace`): strictly restricted to `OWNER`.
  - Frontend:
    - Update member management modals and role selectors to display only `OWNER` and `MEMBER`.
- **Tests Added/Removed**:
  - Updated: `WorkspaceAuthorizationIntegrationTest.java` (ADMIN matrix -> OWNER-positive matrix, 6 tests: 3 ADMIN removed, 3 OWNER added) and `ReleaseIntegrationTest.java` (2 VIEWER tests removed).
  - Removed viewer coverage: `TaskAuthorizationIntegrationTest` (7 viewer tests; 4 member tests kept), `DependencyIntegrationTest.viewer_isReadOnly` (1), `WorkItemTypeIntegrationTest.viewer_cannotChangeType` (1). Reworked: `WorkspaceServiceTest` viewer fixture -> member; `ProjectServiceTest`/`TaskServiceTest` stub messages.
  - Updated frontend: TaskBoard/ReleaseDetail VIEWER tests -> MEMBER-positive; ADMIN fixtures -> MEMBER.
  - Backend suite: **150 passed, 0 failed** (161 - 11 removed = 150, reconciled). Frontend suite: **64 passed, 0 failed** (count unchanged).
  - V20 additionally exercised by the backend suite: Testcontainers validated and applied all 20 migrations.
- **Risks**: Medium. Must verify that `OWNER` retains exclusive membership management rights while `MEMBER` can edit work items and releases.
- **Status**: **COMPLETE (executed 2026-10-09 under standing authorization; dual gates explicitly approved)**.
- **Execution Record (verified, seeded scratch database + approved gates)**:
  - Pre-migration inventory (read-only): 0 `ADMIN`, 0 `VIEWER`, 0 unexpected roles (1 `OWNER` + 1 `MEMBER` seeded).
  - Gate A approved: `ADMIN -> MEMBER` (least privilege; `ADMIN -> OWNER` rejected on the single-owner invariant). Gate B approved: VIEWER revocation (`DELETE`; promotion rejected as privilege expansion).
  - V20 executed via Flyway on a disposable scratch database (plus 1 `ADMIN` + 1 `VIEWER` fixtures): ADMIN demoted to MEMBER, VIEWER row deleted, OWNER untouched; `ck_workspace_members_role` present with the exact 2-role definition; a rolled-back `VIEWER` insert probe was rejected (0 residue).
  - Limitation: figures quantify a freshly seeded environment (plus disclosed fixtures). A database holding real ADMIN/VIEWER rows applies the same approved mappings.
  - Deviations: `getWorkspaceForAdmin` renamed to `getWorkspaceForOwner` (OWNER-only); `getWorkspaceForMutation` is now pure membership verification; `ReleaseDetail/ReleaseList/WorkspaceDetail/TaskBoard` role gates simplified to member-wide mutation; `WorkspaceMembers` invite offers MEMBER only and removal is OWNER-only; app-level `user.Role` (ADMIN/USER) deliberately untouched as out of scope.

---

## Phase 7: Access-Token Lifetime Configuration
- **Goal**: Configure the stateless access-token lifetime following refresh-token removal, documenting the security vs. usability trade-off.
- **Proposed Lifetime**:
  - **60 minutes (1 hour)** for production deployments (`JWT_EXPIRATION=3600000`).
  - (Default development profile retains 24 hours for developer ergonomics).
- **Checklist**:
  - [ ] Set default production JWT expiration to 1 hour in `application.yaml` / Docker environment.
  - [ ] Add architectural trade-off note to `README.md`:
    > *Trade-off*: Without refresh-token rotation, access tokens are stateless and cannot be revoked before expiry. Setting a 60-minute lifetime balances user convenience (avoiding re-login interruptions during active delivery planning) against bounded exposure in the event of token interception.
  - [ ] Verify `JwtService` and `AuthServiceTest` test cases for token issuance and expiration.
- **Files Likely Touched**:
  - `backend/src/main/resources/application.yaml`, `README.md`, `AuthServiceTest.java`.
- **Tests Added/Removed**:
  - Added: `JwtServiceTest` (2 tests: configured-lifetime expiry bound honoring JWT second-resolution; expired token rejected at parse).
  - Backend suite: **152 passed, 0 failed** (150 + 2 = 152, reconciled). Frontend suite: **64 passed, 0 failed** (no changes).
- **Risks**: None. Pure configuration and documentation.
- **Status**: **COMPLETE (executed 2026-10-09 under standing authorization)**.
- **Execution Record**:
  - Verified the production default was already 15 minutes (`application-prod.yaml`, `docker-compose.yml`), stricter than the proposed 60 — kept as-is rather than weakening it; dev default stays 24 hours.
  - Removed dead `JWT_REFRESH_EXPIRATION` properties (`application.yaml`, `application-prod.yaml`, `docker-compose.yml`, `.env.example`; deferred D8 cleanup) — unbound since Phase 5, harmless but misleading.
  - README Security section: replaced the now-false refresh-token bullet with a no-refresh statement and added the trade-off note (full README rewrite stays Phase 10).
  - Deviation: test added as new `JwtServiceTest` (lifetime is `JwtService` configuration) rather than in `AuthServiceTest`.

---

## Phase 8: Settle D4 (Enforce READY Before RELEASED)
- **Goal**: Tie the release state machine directly to the derived readiness engine by requiring a `READY` status before moving from `IN_PROGRESS` to `RELEASED`.
- **Checklist**:
  - [ ] In `ReleaseService.updateLifecycle`:
    ```java
    if (request.lifecycleState() == ReleaseLifecycleState.RELEASED) {
        ReleaseReadinessResponse readiness =
            readinessService.calculateReadiness(workspaceId, projectId, releaseId);
        if (readiness.status() != ReadinessStatus.READY) {
            throw new BusinessRuleException(
                "Cannot release: release is NOT_READY. Reasons: " +
                readiness.reasons().stream()
                    .map(ReadinessReason::detail)
                    .collect(Collectors.joining("; ")));
        }
    }
    ```
  - [ ] Inject `ReadinessService` into `ReleaseService`.
  - [ ] Frontend: In `ReleaseDetail.tsx`, disable or warn on the "Release" action button if readiness is not `READY`.
  - [ ] Add integration tests in `ReleaseIntegrationTest.java`:
    1. Proving transition to `RELEASED` is rejected with HTTP 400 when release has incomplete tasks, blockers, or is empty.
    2. Proving transition to `RELEASED` succeeds with HTTP 200 when all work items are `DONE` and unblocked.
- **Files Likely Touched**:
  - Backend: `ReleaseService.java`, `ReleaseIntegrationTest.java`.
  - Frontend: `ReleaseDetail.tsx`.
- **Tests Added/Removed**:
  - Added: 2 integration tests verifying D4 enforcement on direct API calls (`inProgressToReleased_whileNotReady_isRejected` 400 with NOT_READY reasons; `inProgressToReleased_whenReady_succeeds` 200).
  - Added: 1 frontend test (`disables the Release action while readiness is NOT READY`).
  - Backend suite: **154 passed, 0 failed** (152 + 2 = 154, reconciled). Frontend suite: **65 passed, 0 failed** (64 + 1).
- **Risks**: Low. Direct enforcement of the system's core technical value proposition.
- **Status**: **COMPLETE (executed 2026-10-09 under standing authorization)**.
- **Execution Record**:
  - `ReleaseService.updateLifecycle` evaluates readiness via the engine and rejects `IN_PROGRESS -> RELEASED` with 400 listing blocking reasons when NOT_READY.
  - Deviations: `ReadinessService` is resolved through `ObjectProvider` (lazy) rather than direct constructor injection — direct injection would be circular since `ReadinessService` depends on `ReleaseService`; the engine method is `evaluate`, not `calculateReadiness`.
  - Frontend mirrors the rule: the Release action disables with a reason-count tooltip while NOT_READY.

---

## Phase 9: Core Tests Verification, Seed Data & Definition of Done
- **Goal**: Consolidate and execute the definitive core test suite verifying all 6 system invariants, update seed data to demonstrate live readiness states, and complete the Definition of Done.
- **Checklist**:
  - [ ] Verify comprehensive test suite coverage for the core matrix:
    1. **Cycle Rejection with Path**: BFS detects cycles and returns loop description (`DependencyIntegrationTest`).
    2. **Blocked Completion Guard**: Server blocks moving to `DONE` via direct API request (`DependencyIntegrationTest`).
    3. **Three Readiness Gates**: `EMPTY_RELEASE`, `INCOMPLETE_WORK`, `BLOCKED_WORK` produce deterministic sorted reasons (`ReadinessIntegrationTest`).
    4. **Release Scope Lock**: Adding/removing items after leaving `PLANNED` rejected (`ReleaseIntegrationTest`).
    5. **Workspace & Tenant Isolation**: Membership guards return 403 on foreign workspace, 404 on unmapped resources (`TenantIsolationIntegrationTest`, `ReleaseIntegrationTest`).
    6. **D4 Enforcement**: `IN_PROGRESS -> RELEASED` strictly requires `READY` (`ReleaseIntegrationTest`).
  - [ ] Update `DataSeeder.java` to seed two clean reference releases in demo data:
    - **Release 1 (READY)**: Contains work items that are all `DONE` with no unresolved blockers. Displays green `READY` verdict.
    - **Release 2 (NOT_READY)**: Contains work items in `TODO`/`IN_PROGRESS` and an active blocking dependency. Displays amber `NOT_READY` verdict with clear reasons.
  - [ ] Verify Definition-of-Done checklist:
    - [ ] Cycle closing dependency rejected with path shown.
    - [ ] Blocked work item cannot move to `DONE` via direct API request.
    - [ ] Empty release returns `NOT_READY` with reason.
    - [ ] Multiple failing gates produce deterministic, sorted reasons.
    - [ ] Release scope locked after leaving `PLANNED`.
    - [ ] Non-member cannot access foreign workspace (403) or unmapped project data (404).
    - [ ] Release cannot transition to `RELEASED` while `NOT_READY`.
- **Files Likely Touched**:
  - `DataSeeder.java`, test files.
- **Tests Added/Removed**: Core assertions validated.
- **Risks**: Low.
- **Status**: **COMPLETE (executed 2026-10-09 under standing authorization)**.
- **Execution Record**:
  - Invariant matrix verified against the green suites (backend 154, frontend 65 — executed for Phase 8 with zero code changes since): cycle rejection with path (`DependencyIntegrationTest.Cycles`), blocked-completion guard (`DependencyIntegrationTest.BlockedCompletion`, `BusinessRuleIntegrationTest`), three sorted gates (`ReadinessIntegrationTest` Gates/Determinism), scope lock (`ReleaseIntegrationTest.Scope`), 403/404 isolation (`TenantIsolationIntegrationTest`, `ReleaseIntegrationTest.Isolation`), D4 (`ReleaseIntegrationTest.Lifecycle`).
  - Seeded demo verdicts verified over the live API on a disposable V20 database (no seeder changes needed): `Design System Baseline` READY (Release 1); `Q3 UI Refresh` NOT_READY [INCOMPLETE_WORK, BLOCKED_WORK] (Release 2); plus `API v2.1 Planning` NOT_READY [EMPTY_RELEASE], `Native Mobile Shell` NOT_READY [INCOMPLETE_WORK], `API v2.0 Cutover` NOT_READY [INCOMPLETE_WORK, BLOCKED_WORK].
  - DoD checklist: all six items hold (listed above); no code modifications were required to satisfy them.

---

## Phase 10: Final README & Interview Defense Polish
- **Goal**: Rewrite `README.md` to be plain, factual, and strictly aligned with the v1 scope; finalize `docs/WALKTHROUGH.md`.
- **Checklist**:
  - [x] Add README one-liner for workspaces:
    > *"Projects belong to workspaces, which serve as multi-project collaboration containers."*
  - [x] Document access-token expiration trade-off (15-minute prod default kept as stricter-than-proposed; done in Phase 7, retained verbatim).
  - [x] Include clear ASCII / Mermaid entity relationship diagram (`User -> Workspace -> Project -> Task/Release`, `Dependency`).
  - [x] Remove all marketing claims, 7-point lists, and references to cut features (approvals, risk levels, 1.1M benchmark, refresh tokens).
  - [x] Ensure every command in README is verified against Docker and local runtimes (compose paths, ports, ports/proxy and demo credentials verified; `test:ci` used instead of watch-mode `test`).
  - [x] Final end-to-end green run of full test suite across backend and frontend.
- **Files Likely Touched**:
  - `README.md`, `docs/WALKTHROUGH.md`.
- **Tests Added/Removed**: None.
- **Risks**: None.
- **Status**: **COMPLETE (executed 2026-10-09 under standing authorization)**.
- **Execution Record**:
  - README rewritten wholesale: scoped delivery model, current ERD (V1–V20 schema), 3-gate readiness, OWNER/MEMBER RBAC, register/login-only auth, 219-test totals (154 + 65), verified commands, "What is not built" cut list.
  - Final green run: backend **154 passed**, frontend **65 passed**, production frontend build (`tsc -b && vite build`) clean.
