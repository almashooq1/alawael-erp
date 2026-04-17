# Backend Duplication Audit — 2026-04-17

Catalog of overlapping/duplicate modules discovered during the
system-cleanliness pass. Used to prioritise consolidation work.

## Resolved in this session

| #   | Finding                                                                               | Status                                                           |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `backend/test-utils/` nested `test-utils/test-utils/` + not imported anywhere         | ✅ Moved to `backend/_archived/legacy-test-harness/test-utils/`  |
| 2   | `backend/tests/tests/` legacy second test tree (26 files), Jest-ignored, not imported | ✅ Moved to `backend/_archived/legacy-test-harness/tests-tests/` |
| 3   | Jest per-file `tests/tests/*` ignore patterns                                         | ✅ Removed — superseded by `_archived` ignore                    |

## Remaining findings (future work)

Each below needs a PR with careful review + test coverage before merging.

### P0 — Auth middleware proliferation

Files claiming "auth" responsibility:

- `backend/middleware/auth.js`
- `backend/middleware/auth.middleware.js`
- `backend/middleware/authenticate.js`
- `backend/middleware/authMiddleware.js`
- `backend/middleware/advancedAuth.js`
- `backend/middleware/branchAuth.middleware.js`
- `backend/middleware/dddAuth.middleware.js`
- `backend/middleware/sso-auth.middleware.js`
- `backend/api/middleware/auth.middleware.js`
- `backend/services/security/authService.js`

**Recommendation:** audit each for scope (basic JWT vs branch scope vs SSO vs advanced permission checks). Consolidate to ~4 focused modules:

- `auth.middleware.js` (JWT + session base)
- `branchScope.middleware.js` (already canonical)
- `sso-auth.middleware.js` (Nafath/SSO only)
- `advancedAuth.middleware.js` (MFA + break-glass hooks)

### P1 — Analytics service fragmentation (11 variants)

- `analyticsService.js` (core)
- `analyticsDashboard.js`
- `advancedAnalytics.service.js`
- `branchAnalytics.service.js`
- `mobileAnalytics.service.js`
- `performanceAnalyticsService.js`
- `trafficAccidentAnalytics.js`
- `workforce-analytics.service.js`
- `progress-analytics.js`
- `backup-analytics.service.js`
- `hr/analyticsAIService.js`

**Recommendation:** keep one base `analytics.service.js` + explicit domain-specific services. Drop "advanced/dashboard" naming.

### P1 — Role & RBAC configuration (4 files)

- `config/roles.js`
- `config/rbac.config.js`
- `config/constants/roles.constants.js` (canonical per ADR-005)
- `config/rehab-roles.js`

**Recommendation:** the canonical set lives in `config/constants/roles.constants.js` (ADR-005). Consolidate the other three into it or delete; migrate any referenced role aliases to the `ROLE_ALIASES` map already exported.

### P1 — Error handling split

- `backend/errors/errorHandler.js`
- `backend/utils/errorHandler.js`
- `backend/utils/safeError.js`

**Recommendation:** `errors/errorHandler.js` is the domain-primary global handler. `utils/safeError.js` is a response helper and complements it; keep. Delete `utils/errorHandler.js` once no route imports it.

### P1 — Redis configuration

- `backend/config/redis.config.js` (152 lines, `getRedisClient()` API)
- `backend/config/redis.js` (333 lines, exposes `redisClient`)

Both are imported by different files. They are NOT functionally identical despite similar names.

**Recommendation:** audit callers; extract common core to `config/redis.config.js`, make `config/redis.js` a thin backward-compat re-export, then deprecate it.

### P1 — Employee model proxy

- `backend/models/Employee.js` (29-line `@deprecated` proxy)
- `backend/models/HR/Employee.js` (253-line canonical)

23 call sites still import the proxy. Working correctly; safe to leave. Future: migrate imports to `./HR/Employee` directly, then delete the proxy.

### P2 — Route "enhanced/real/full" suffix proliferation

36 routes end in `.real.routes.js`, `-enhanced.routes.js`, or `-full.routes.js`. Many pairs share base names:

- `gosi.routes.js` + `gosi-full.routes.js`
- `muqeem.routes.js` + `muqeem-full.routes.js`
- `complaints.routes.js` + `complaints-enhanced.routes.js`
- `crm.routes.js` + `crm-enhanced.routes.js`
- plus 32 more

**Recommendation:** these accreted during generator phases. Audit each pair: if `-enhanced` supersedes base, delete base; if both are mounted with distinct prefixes, rename to reflect purpose (no "enhanced" suffix).

### P2 — Therapist tiered routes

- `therapistPro.routes.js`
- `therapistElite.routes.js`
- `therapistUltra.routes.js`
- `therapistExtended.routes.js`

**Recommendation:** collapse into one `therapist.routes.js` with role-level gating (ABAC policy) rather than separate files per tier.

### P2 — Document pro phases

`api/routes/documents-pro-phaseN.routes.js` for N ∈ {3..9}. Likely incremental generator output.

**Recommendation:** collapse into one `documents-pro.routes.js`; if phases expose distinct endpoint families, keep but rename to describe the family, not the phase number.

### P2 — Program model fan-out

- `models/Program.js`
- `domains/programs/models/Program.js`
- `models/rehabilitation/Program.js`
- `models/TherapyProgram.js`, `GroupProgram.js`, `DisabilityProgram.js`, `CommunityProgram.js`, `AwarenessProgram.js`
- `models/rehab-program/RehabilitationProgram.model.js`
- `domains/field-training/models/TrainingProgram.js`

**Recommendation:** use a discriminator or `type` field on a single `Program` model; move specific collections to inheritance.

### P2 — Naming convention

71 files `*Service.js` (camelCase) vs 164 files `*.service.js` (dot).

**Recommendation:** standardise on `*.service.js` (already the majority); bulk rename + update imports.

## Execution rule

No file should be renamed or deleted without:

1. Grep confirming no stale import paths in active code.
2. Running the authorization/infrastructure test suite (`jest authorization approvals break-glass sod alerts kpi privacy integrations routes roles`) to confirm core contracts still pass.
3. A dedicated commit with a narrow scope ("consolidate X") rather than mixing with unrelated changes.
