# DECISIONS.md

This document records the architectural and scope decisions for AgileTrack v1.
Every entry contains an ID, date, status (`ACCEPTED`, `OPEN`, `REJECTED`), the decision, reason, and consequences.

---

### D1: Workspace Layer Above Projects
- **Date**: 2026-10-09
- **Status**: OPEN
- **Decision**: Determine whether to retain or remove the top-level `Workspace` entity container.
  - **Option A (Remove)**: Refactor entities, controllers, URLs, security checks, and frontend to make `Project` the top-level container owned directly by a user.
    - *Effort*: Very High (>40 files touched across backend, frontend, migrations, and test suites).
    - *Risk*: High risk of introducing subtle regressions in tenant authorization and routing.
  - **Option B (Retain - Recommended)**: Retain the `Workspace` layer as an organizational boundary. Describe it in one line in the README as a multi-project container and do not market it.
    - *Effort*: Zero code changes.
    - *Risk*: Low. Complies directly with the Scope Freeze rule: *"If the refactor is too big, keep the layer, describe it in one line in the README, and do not market it."*
- **Recommendation**: ACCEPT Option B. Retaining the existing entity model avoids destabilizing working tenant authorization while keeping v1 clean.
- **Consequences**: Awaits user approval.

---

### D2: Optimistic Locking on Stale Saves (HTTP 409)
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Keep optimistic locking via JPA `@Version` on `Task`, `Project`, and `Release` entities, returning HTTP 409 Conflict when a stale write is attempted.
- **Reason**: The scope rule states: *"Keep only if it works today. You must be able to explain in two minutes how the version travels from the client to the database check."* Verification confirmed that `@Version` columns exist across entities, `OptimisticLockGuard` enforces explicit version checks, `GlobalExceptionHandler` maps `OptimisticLockingFailureException` to HTTP 409, and automated integration tests (`OptimisticLockingIntegrationTest`, `StaleWriteApiIntegrationTest`) are green.
- **Consequences**: Optimistic concurrency control remains an active, defended technical highlight of AgileTrack.

---

### D3: Portfolio Dashboard Page
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Freeze the Portfolio Dashboard page (`Dashboard.tsx`); conduct no further feature development on it.
- **Reason**: The release detail page is the primary focal screen for delivery readiness and scope tracking. The scope document mandates: *"Freeze it. No further work. The release page is the main screen."*
- **Consequences**: The dashboard remains read-only as implemented, and future focus stays entirely on the release cockpit.

---

### D4: Release Requires READY Status to Become RELEASED
- **Date**: 2026-10-09
- **Status**: OPEN
- **Decision**: Determine whether the state machine should strictly reject transitions to `RELEASED` if the release's derived readiness status is `NOT_READY`.
  - **Option A (Enforce - Recommended)**: In `ReleaseService.updateLifecycle`, before transitioning a release from `IN_PROGRESS` to `RELEASED`, invoke `ReadinessService.calculateReadiness`. If the verdict is `NOT_READY`, reject the transition with `BusinessRuleException` listing the blocking reasons.
    - *Effort*: Low (~15 lines of code in `ReleaseService`, plus integration test).
    - *Risk*: Low. Integrates the state machine directly with the readiness engine.
  - **Option B (Do Not Enforce)**: Keep state transition decoupled from the readiness verdict (readiness remains purely informational).
    - *Effort*: Zero code changes.
    - *Risk*: Misses the opportunity to make the release state machine enforce the core domain calculation.
- **Recommendation**: ACCEPT Option A. Enforcing `READY` on `RELEASED` firmly ties the release state machine and readiness calculation together into a single cohesive story.
- **Consequences**: Awaits user approval.

---

### D5: Cut Change Governance and Approvals
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Remove the `CHANGE` work item type, risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), change approval workflows, `APPROVAL_REQUIRED` readiness gate, and associated frontend UI components.
- **Reason**: Scope document Section 7 explicitly cuts change governance to eliminate functional overlap with MedVault (which owns access control, approvals, and audits).
- **Consequences**: Work item types are limited strictly to `FEATURE`, `BUG`, and `TECH_DEBT`. `ApprovalModal`, `approvalService`, `ChangeApproval*` classes, and corresponding tests are scheduled for clean removal.

---

### D6: Cut CANCELLED Release State and RELEASE_CANCELLED Gate
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Remove the `CANCELLED` enum value from `ReleaseLifecycleState`, remove `RELEASE_CANCELLED` from `ReadinessReasonCode`, and eliminate all related transition paths.
- **Reason**: Scope document Section 5 defines the valid lifecycle strictly as `PLANNED -> IN_PROGRESS -> RELEASED`. Section 7 explicitly cuts `CANCELLED`.
- **Consequences**: Release lifecycle is strictly linear. Deletion is permitted only while `PLANNED`; shipped releases remain `RELEASED`.

---

### D7: Cut Task Activity and Audit Trail
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Remove `task_activities` entity, recorder, repository, and `/tasks/{taskId}/activities` endpoint.
- **Reason**: Scope document Section 7 cuts activity and audit trails because MedVault owns the auditing and compliance narrative.
- **Consequences**: `TaskActivityRecorder` and related tests (`TaskActivityIntegrationTest`) will be removed. Mutations focus solely on domain entity state changes.

---

### D8: Cut Refresh-Token Rotation
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Remove refresh tokens (`refresh_tokens` table, `RefreshTokenService`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`) and retain only stateless JWT access tokens with BCrypt password authentication.
- **Reason**: Scope document Section 7 cuts refresh-token rotation to keep authentication minimal, delegating authentication depth to MedVault.
- **Consequences**: Auth endpoints are restricted to `POST /register` and `POST /login`.

---

### D9: Simplify Roles to Owner and Member
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Eliminate the `ADMIN` and `VIEWER` roles, consolidating authorization to `OWNER` and `MEMBER`.
- **Reason**: Scope document Section 3 & 7 cuts the Admin/Viewer split. `OWNER` manages the project and membership; `MEMBER` creates and edits work items, releases, and dependencies.
- **Consequences**: `WorkspaceRole` enum simplified to `OWNER` and `MEMBER`. Security checks updated accordingly.

---

### D10: Remove Million-Row Benchmark and Non-Core Documentation
- **Date**: 2026-10-09
- **Status**: ACCEPTED
- **Decision**: Delete `PerformanceBenchmarkTest.java`, `INTERVIEW_PREP.md`, and `CONTRIBUTING.md`.
- **Reason**: Mandated by scope cut list Section 7. These files either represent artificial benchmark measurement harnesses or extraneous metadata files not belonging in the repository.
- **Consequences**: Removes 48KB of unverified or redundant text and cleans up test suite boundaries. Executed in Phase 1 (commit `a1ee052`). Test suite verified at 284 passing.

