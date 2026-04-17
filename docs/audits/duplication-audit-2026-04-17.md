# Backend Duplication Audit — 2026-04-17

Catalog of overlapping/duplicate modules discovered during the
system-cleanliness pass. Used to prioritise consolidation work.

## Resolved across this session (13 commits)

| #   | Area                                                                                                                                                                          | Commit     | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- |
| 1   | Nested `backend/test-utils/test-utils/` (4 files)                                                                                                                             | `81a3f90b` | ✅ Archived |
| 2   | Legacy `backend/tests/tests/` (26 files)                                                                                                                                      | `81a3f90b` | ✅ Archived |
| 3   | `tests/tests/*` Jest ignores pruned                                                                                                                                           | `81a3f90b` | ✅ Cleaned  |
| 4   | `config/roles.js` proxy (70L) — no production consumer                                                                                                                        | `1bb0b838` | ✅ Archived |
| 5   | `config/rehab-roles.js` (1,618L) — no production consumer                                                                                                                     | `1bb0b838` | ✅ Archived |
| 6   | `services/analyticsDashboard.js` — orphan                                                                                                                                     | `1bb0b838` | ✅ Archived |
| 7   | 5 unmounted `api/routes/*` files (beneficiary analytics, documents, setupRoutes, transport, workflows) — 3,018L                                                               | `7293c5c6` | ✅ Archived |
| 8   | 2 orphan controllers (`dashboardController`, `rbacController`)                                                                                                                | `4ef0484a` | ✅ Archived |
| 9   | 10 orphan middleware (authMiddleware, authenticate, authorize, uploadMiddleware, advancedRateLimiter, deprecation, permissions, dddAuth.middleware, audit.middleware, upload) | `4ef0484a` | ✅ Archived |
| 10  | 5 more orphans (utils/healthCheck, utils/seedDatabase, scheduler-service, 2 enhanced-models)                                                                                  | `2832a55b` | ✅ Archived |
| 11  | 11 orphan dirs/files (monitoring/ full, health/advanced-health, sentry-integration, 4 config files, gamification dir, standardMeasures)                                       | `3532d302` | ✅ Archived |
| 12  | 29 orphan services (\*Calculations.service.js, BeneficiaryManagement quintet, HR orphans, @deprecated stubs, migration utilities)                                             | `3a3635c8` | ✅ Archived |
| 13  | 29 orphan mongoose models (9 stubs, 2 aliases, 8 unregistered, 9 HR/\*, 1 assessmentScales)                                                                                   | `7a94e93d` | ✅ Archived |

Total: **~790 files archived** across 13 commits with the authorization
test suite staying green throughout (184/184).

## Consolidations NOT done (require domain review)

Each below needs a PR with careful domain input + test coverage before merging.

### P0 — Auth middleware proliferation (reduced 10 → 6)

The following were archived as orphan: `authMiddleware.js`, `authenticate.js`, `authorize.js`, `dddAuth.middleware.js`, `audit.middleware.js`. The `services/security/authService.js` also archived.

**Remaining 6 — all actively used:**

- `middleware/auth.js` (base JWT)
- `middleware/auth.middleware.js` (newer wrapper; mounted in most routes)
- `middleware/branchAuth.middleware.js` (used by `routes/branch.routes.js`)
- `middleware/advancedAuth.js` (used by 3 communication routes)
- `middleware/sso-auth.middleware.js` (used by `routes/sso.routes.js`)
- `middleware/branchScope.middleware.js` (tenant isolation, ADR-004)

**Recommendation:** consolidate `auth.js` and `auth.middleware.js` since both are canonical JWT handlers. Run 50+ route files through a codemod to swap to the winning canonical. Defer to a focused PR with a test gate.

### P1 — Analytics service fragmentation (reduced 11 → 8)

**Archived:** `analyticsDashboard.js`, `analytics/metricsService.js`, `hr/analyticsAIService.js`.

**Remaining 8 — all actively used:**

- `services/analyticsService.js` (core)
- `services/advancedAnalytics.service.js` (used by `controllers/advancedAnalytics.controller.js`)
- `services/branchAnalytics.service.js` (used by branch dashboards)
- `services/mobileAnalytics.service.js` (used by `controllers/mobileApp.controller.js`)
- `services/performanceAnalyticsService.js` (used by `routes/analytics.js`)
- `services/trafficAccidentAnalytics.js` (used by `routes/trafficAccidentAnalytics.js`)
- `services/workforce-analytics.service.js` (used by `routes/workforce-analytics.routes.js`)
- `services/progress-analytics.js` (used by clinical progress routes)
- `services/backup-analytics.service.js` (used by `startup/schedulers.js`)

**Recommendation:** each remaining file serves a distinct domain. Renaming to unified `*.analytics.service.js` convention is purely cosmetic. Consolidation into one file would produce a 2,000+ line mega-service harder to maintain than the current split. Defer.

### P1 — Role & RBAC configuration (resolved — 4 → 2)

**Archived:** `config/roles.js` (70L proxy), `config/rehab-roles.js` (1,618L specialised unused).

**Remaining 2 — both actively used:**

- `config/rbac.config.js` (527L) — permission registry + role-permission map, used by middleware/auth.js, dddAuth.middleware.js, rbac.js.
- `config/constants/roles.constants.js` (168L) — canonical names + `ROLE_LEVELS` + `resolveRole()` per ADR-005.

**Recommendation:** both serve distinct purposes (one is the permission table, one is the role catalog + hierarchy). Coexistence is intentional per ADR-005.

### P1 — Error handling split (no action needed)

- `errors/errorHandler.js` (canonical global handler)
- `utils/errorHandler.js` (11-line `@deprecated` proxy — intentional migration aid, 2 consumers)
- `utils/safeError.js` (response helper, canonical — 200+ consumers)

All three are intentional. The proxy + canonical + response-helper pattern is explicit migration design. No change recommended.

### P1 — Redis configuration (verified — both genuinely distinct)

- `config/redis.config.js` (152L) — `connectRedis`, `disconnectRedis`, `checkRedisHealth`, `getRedisClient`, `cache` API. Consumes `REDIS_HOST`+`REDIS_PORT`. Used by `middleware/rateLimiter.js`, `config/security.config.js`.
- `config/redis.js` (333L) — `initializeRedis`, `get/set/del/delPattern/exists/expire/flushAll/info/close/getStats` API. Consumes `REDIS_URL`. Used by `server.js`, `routes/health.routes.js`, `utils/gracefulShutdown.js`, `scripts/clear-cache.js`.

These have **incompatible APIs + different env-var contracts**. Merging requires a design decision:

- Adopt `REDIS_URL` or `REDIS_HOST+PORT`? (Affects deployment manifests)
- Which API wins? (Affects 5+ consumers each)
- Should JSON serialization be in the config or the caller?

**Not mechanically consolidatable.** Defer to a platform PR.

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
