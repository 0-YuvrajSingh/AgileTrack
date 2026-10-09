# docs/PLAN.md — AgileTrack Scope Alignment Plan

This execution plan adapts the project brief to the findings of `docs/AUDIT.md`. Work proceeds strictly in sequential, reviewable phases on branch `scope-v1`.

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
  - [x] STOP and await user approval before proceeding to Phase 1.
- **Files Touched**:
  - `AGENTS.md`, `docs/SCOPE.md`, `DECISIONS.md`, `docs/AUDIT.md`, `docs/PLAN.md`, `docs/WALKTHROUGH.md`.
- **Tests Added/Removed**: None.
- **Risks**: None (no production or test code modified).
- **Status**: **COMPLETE (Awaiting approval to begin Phase 1)**.

---

## Phase 1: Cut Extraneous Files & Performance Benchmark
- **Goal**: Remove files explicitly excluded by Scope Section 7 (`INTERVIEW_PREP.md`, `CONTRIBUTING.md`, and `PerformanceBenchmarkTest.java`).
- **Checklist**:
  - [x] Delete `INTERVIEW_PREP.md`.
  - [x] Delete `CONTRIBUTING.md`.
  - [x] Delete `backend/src/test/java/com/agiletrack/backend/benchmark/PerformanceBenchmarkTest.java`.
  - [x] Verify test suite continues to pass with 284 tests (benchmark was excluded by default surefire).
  - [x] Update `docs/PLAN.md`, `DECISIONS.md`, `docs/AUDIT.md`.
- **Files Touched**:
  - Deleted: `INTERVIEW_PREP.md`, `CONTRIBUTING.md`, `backend/src/test/java/com/agiletrack/backend/benchmark/PerformanceBenchmarkTest.java`.
- **Tests Added/Removed**:
  - Removed: `PerformanceBenchmarkTest.java` (measurement harness, had no assertions).
- **Risks**: None. Zero application logic touched.
- **Status**: **COMPLETE**.

---

## Phase 2: Cut Change Governance & Approval Workflow
- **Goal**: Remove all change governance concepts (`CHANGE` task type, risk levels, approval models, approval gates, and frontend modals) to eliminate overlap with MedVault.
- **Checklist**:
  - [ ] Remove `com.agiletrack.backend.approval` package (`ChangeApproval`, `ChangeApprovalService`, `ChangeRiskPolicy`, `ChangeApprovalRepository`, `ApprovalController`, DTOs).
  - [ ] Remove `CHANGE` from `WorkItemType` enum (`FEATURE`, `BUG`, `TECH_DEBT` remain).
  - [ ] Remove `riskLevel` field and getter/setter from `Task` entity and DTOs (`TaskResponse`, `CreateTaskRequest`, `UpdateTaskRequest`).
  - [ ] Remove `APPROVAL_REQUIRED` from `ReadinessReasonCode` and `ReadinessService`.
  - [ ] Clean up `GlobalExceptionHandler` if approval exceptions are referenced.
  - [ ] Frontend: Remove `ApprovalModal.tsx`, `approvalService.ts`, and approval controls from `TaskBoard.tsx`, `TaskCard.tsx`, `ReleaseDetail.tsx`.
  - [ ] Delete approval test classes: `ApprovalIntegrationTest.java`, `ApprovalConcurrencyIntegrationTest.java`, `ChangeRiskPolicyTest.java`, `ApprovalModal.test.tsx`, `approvalService.test.ts`.
  - [ ] Update remaining tests that construct tasks with `CHANGE` or `riskLevel` (e.g. `EndToEndIntegrationTest`, `WorkItemTypeIntegrationTest`).
  - [ ] Verify test suite passes cleanly.
- **Files Likely Touched**:
  - Backend: `WorkItemType.java`, `Task.java`, `TaskResponse.java`, `CreateTaskRequest.java`, `UpdateTaskRequest.java`, `TaskMapper.java`, `ReadinessReasonCode.java`, `ReadinessService.java`, `DataSeeder.java`.
  - Frontend: `ApprovalModal.tsx`, `approvalService.ts`, `types/index.ts`, `TaskBoard.tsx`, `TaskCard.tsx`, `ReleaseDetail.tsx`.
  - Tests: Delete approval tests, update `WorkItemTypeIntegrationTest.java`, `ReadinessIntegrationTest.java`, `EndToEndIntegrationTest.java`.
- **Tests Added/Removed**:
  - Removed backend: `ApprovalIntegrationTest` (6), `ApprovalConcurrencyIntegrationTest` (2), `ChangeRiskPolicyTest` (6).
  - Removed frontend: `ApprovalModal.test.tsx` (9), `approvalService.test.ts` (3).
- **Risks**: Medium. Removing `CHANGE` and `riskLevel` touches multiple DTOs; must ensure all callers across tests and frontend are cleanly updated.
- **Status**: PENDING.

---

## Phase 3: Cut Cancelled Release State & RELEASE_CANCELLED Gate
- **Goal**: Align the release lifecycle strictly with the v1 scope (`PLANNED -> IN_PROGRESS -> RELEASED`). Remove `CANCELLED` state and `RELEASE_CANCELLED` gate.
- **Checklist**:
  - [ ] Remove `CANCELLED` from `ReleaseLifecycleState` enum.
  - [ ] Update `ReleaseLifecycleState.canTransitionTo()` to allow only `PLANNED -> IN_PROGRESS` and `IN_PROGRESS -> RELEASED`.
  - [ ] Remove `RELEASE_CANCELLED` from `ReadinessReasonCode` and `ReadinessService.calculateReadiness()`.
  - [ ] Update `ReleaseService.deleteRelease()` message and checks.
  - [ ] Frontend: Remove `CANCELLED` badge and filter handling from `ReleaseDetail.tsx` and `ReleaseList.tsx`.
  - [ ] Update `ReleaseIntegrationTest.java` and `ReadinessIntegrationTest.java` to remove cancelled state test cases.
  - [ ] Verify test suite passes cleanly.
- **Files Likely Touched**:
  - Backend: `ReleaseLifecycleState.java`, `ReadinessReasonCode.java`, `ReadinessService.java`, `ReleaseService.java`.
  - Frontend: `types/index.ts`, `ReleaseDetail.tsx`, `ReleaseList.tsx`.
  - Tests: `ReleaseIntegrationTest.java`, `ReadinessIntegrationTest.java`, `ReleaseDetail.test.tsx`.
- **Tests Added/Removed**:
  - Removed: Tests asserting `cancelledIsTerminal` and `RELEASE_CANCELLED` gate firing.
- **Risks**: Low. Clean enum reduction with straightforward transition table.
- **Status**: PENDING.

---

## Phase 4: Cut Task Activity & Audit Trail
- **Goal**: Remove task activity recording and the activity timeline endpoint, as MedVault owns auditing.
- **Checklist**:
  - [ ] Remove `TaskActivityRecorder` invocations from `TaskService` and `ReleaseService`.
  - [ ] Remove `GET /tasks/{taskId}/activities` endpoint from `TaskController`.
  - [ ] Delete `TaskActivity.java`, `TaskActivityRepository.java`, `TaskActivityRecorder.java`, `ActivityType.java`.
  - [ ] Delete `TaskActivityIntegrationTest.java`.
  - [ ] Frontend: Remove activity references or components if present.
  - [ ] Verify test suite passes cleanly.
- **Files Likely Touched**:
  - Backend: `TaskService.java`, `ReleaseService.java`, `TaskController.java`, `TaskActivityRecorder.java`, `TaskActivity.java`.
  - Tests: Delete `TaskActivityIntegrationTest.java`.
- **Tests Added/Removed**:
  - Removed: `TaskActivityIntegrationTest.java` (2 tests).
- **Risks**: Low. Decoupling activity logging from task mutation transactions simplifies `TaskService`.
- **Status**: PENDING.

---

## Phase 5: Cut Refresh Token Rotation
- **Goal**: Simplify authentication to stateless JWT access tokens + BCrypt passwords; remove refresh token rotation.
- **Checklist**:
  - [ ] Remove `/api/v1/auth/refresh` and `/api/v1/auth/logout` endpoints from `AuthController`.
  - [ ] Remove `RefreshTokenService.java`, `RefreshTokenRepository.java`, `RefreshToken.java`, `TokenRefreshException.java`.
  - [ ] Update `AuthService` and `AuthResponse` DTO to return only `accessToken` and user details.
  - [ ] Frontend: Remove token refresh logic and interceptors in `authService.ts`.
  - [ ] Delete `RefreshTokenServiceTest.java`.
  - [ ] Verify test suite passes cleanly.
- **Files Likely Touched**:
  - Backend: `AuthController.java`, `AuthService.java`, `AuthResponse.java`, `RefreshToken.java`, `RefreshTokenService.java`.
  - Frontend: `authService.ts`, `types/index.ts`.
  - Tests: Delete `RefreshTokenServiceTest.java` (5 tests).
- **Risks**: Low. Access tokens are already stateless JJWT tokens.
- **Status**: PENDING.

---

## Phase 6: Simplify Roles to Owner and Member
- **Goal**: Consolidate role model to `OWNER` (manages project/members) and `MEMBER` (creates/edits work); remove `ADMIN` and `VIEWER`.
- **Checklist**:
  - [ ] Update `WorkspaceRole` enum to contain only `OWNER` and `MEMBER`.
  - [ ] Update `WorkspaceService` authorization checks (`getWorkspaceForMutation` now simply requires membership).
  - [ ] Update member management: only `OWNER` can add or remove members.
  - [ ] Frontend: Remove `ADMIN` and `VIEWER` from role selectors and permission checks.
  - [ ] Update `WorkspaceAuthorizationIntegrationTest.java` and frontend role tests.
  - [ ] Verify test suite passes cleanly.
- **Files Likely Touched**:
  - Backend: `WorkspaceRole.java`, `WorkspaceService.java`, `WorkspaceController.java`.
  - Frontend: `types/index.ts`, member management modals.
  - Tests: `WorkspaceAuthorizationIntegrationTest.java`.
- **Tests Added/Removed**:
  - Updated/Removed: Tests specifically verifying `VIEWER` mutation rejection or `ADMIN` nuances.
- **Risks**: Low-Medium. Must ensure `OWNER` retains project management rights while `MEMBER` can mutate items/releases.
- **Status**: PENDING.

---

## Phase 7: Settle Open Decisions (D1 & D4)
- **Goal**: Implement explicitly accepted decisions from `DECISIONS.md`.
  - D1: Confirm workspace container retention (Option B recommended).
  - D4: Enforce `READY` verdict on transition from `IN_PROGRESS` to `RELEASED` (Option A recommended).
- **Checklist**:
  - [ ] Verify user instructions on D1 and D4.
  - [ ] If D4 accepted: In `ReleaseService.updateLifecycle`, before moving to `RELEASED`, invoke `ReadinessService.calculateReadiness()`. Throw `BusinessRuleException` if status is `NOT_READY`.
  - [ ] Add integration test proving `IN_PROGRESS -> RELEASED` is rejected when release is `NOT_READY`.
  - [ ] Verify test suite passes cleanly.
- **Files Likely Touched**:
  - Backend: `ReleaseService.java`, `ReleaseIntegrationTest.java`.
- **Tests Added/Removed**:
  - Added: Test proving release cannot ship while `NOT_READY`, and succeeds when `READY`.
- **Risks**: Low. High-value alignment between state machine and algorithms story.
- **Status**: PENDING.

---

## Phase 8: Final README & Interview Defense Walkthrough
- **Goal**: Rewrite `README.md` in plain, factual language with zero hype and an accurate entity diagram; complete `docs/WALKTHROUGH.md`.
- **Checklist**:
  - [ ] Rewrite `README.md`: short, accurate, clear entity diagram, verified commands, no cut features mentioned.
  - [ ] Finalize `docs/WALKTHROUGH.md` with plain-language explanations of:
    1. Cycle detection DFS and time/space complexity.
    2. Derived readiness calculation and the 3 gates.
    3. Release lifecycle and scope lock.
    4. Blocked work completion guard.
    5. Optimistic concurrency control.
  - [ ] Run full test suite end-to-end to confirm final clean build.
- **Files Likely Touched**:
  - `README.md`, `docs/WALKTHROUGH.md`.
- **Tests Added/Removed**: None.
- **Risks**: None.
- **Status**: PENDING.

