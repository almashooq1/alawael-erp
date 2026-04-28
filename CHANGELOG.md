# CHANGELOG

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> Earlier entries (v4.0.0 → v4.0.113) are preserved in git history. The
> file was inadvertently truncated by a prettier hook during the v4.0.113
> deploy session and rebuilt fresh from this version onward.

---

## [Unreleased] — 2026-04-28 — Test-harness + auth-gate consolidation

Sprint suite: **1553 passing**.

### Fixed

- **Mongoose 9 hook compat shim** — patches `Schema.prototype.pre/post`
  in `backend/config/mongoose.plugins.js` so legacy
  `function(next) { ...; next(); }` document hooks keep working under
  mongoose 9 (which dropped `next` for document hooks). Single-file
  fix that protects 90+ models without touching them individually.
- **`Invoice.pre('save')`** rewritten to the modern no-arg shape.
- **`models/VitalSign.js`** populated — was a 0-byte placeholder
  from the v4.0.74 mass push, blocking the
  `clinical.pediatric.weight.drop_5pct` red-flag adapter.
- **`__tests__/acl-client-dlq.test.js`** populated with seven specs
  covering the AclClient → DLQ handoff (success no-park, retry
  exhaustion, parkOnFailure=false, PII redaction, DLQ-failure
  isolation, circuit-breaker short-circuit).
- **31 integration tests** (QMS + Red-Flag observations + admin
  API) add `jest.unmock('mongoose'); jest.resetModules();` so they
  exercise real mongoose instead of the global mock. Pass-rate
  uplift across these files: roughly +250 newly green.
- **Red-Flag admin RBAC gap** — `/api/v1/admin/red-flags/dashboard`
  was authenticate-only; any logged-in user could read it. Auth +
  role gate now baked into the factory (defense in depth).
- **`admin-routes-auth-wiring.test.js`** drift test recognizes
  `authorize` (the canonical role-checker in `middleware/auth.js`)
  and a global `router.use(...)` role gate.

### Added

- **`backend/__tests__/no-broken-requires.test.js`** — drift guard
  that walks every backend `.js` file and resolves every relative
  `require(...)` against the filesystem, failing the sprint gate
  if any new typo'd or stale require lands. Wired into both
  `npm run test:sprint` and `test:drift`. Allowlist for documented
  false positives (the migration script's string templates + a
  legacy auto-generated test stub).
- **`docs/blueprint/13-ops-control-tower-api-playbook.md`** —
  420-line curl-driven reference for all eight Phase-16 ops
  surfaces (was a 0-byte placeholder).
- **Phase 17 Care Platform UI** in
  `alawael-rehab-platform/apps/web-admin`: 7 subject pages live
  (`/care/{crm,social,home-visits,welfare,community,psych,independence}`)
  with cross-navigation back to `/care/360/[beneficiaryId]`.
- **Phase-13 QMS runbook** linked from `docs/runbooks/README.md`
  index.

---

## [4.0.114] — 2026-04-25 — Phase 19 Commit 1: Forms Catalog

Adds 32 ready-to-use form templates across three audiences so admins can
turn on a working form with one API call instead of building it from
scratch in `FormDesigner`.

### Added

- **`backend/config/forms-catalog.registry.js`** — frozen catalog of 32
  form templates: 12 beneficiary (intake, consent ×3, complaints,
  satisfaction, welfare, transfer, home-visit, info-update, cessation),
  12 HR (annual / sick / maternity leave, overtime, salary advance,
  salary / position / branch change, resignation, performance review,
  employee complaint, training request), 8 management (purchase, vendor
  onboarding, budget approval, capex approval, policy change, strategic
  decision memo, audit-finding response, risk acceptance).
- **`backend/services/formsCatalogService.js`** — DI-friendly service:
  `listAll({ audience, category })`, `getById(id)`, `summary()`,
  `instantiate(id, ctx)`, `instantiateAll(ctx, { audience })`.
  Idempotent on `(catalogId, tenantId, branchId)`.
- **`backend/routes/forms-catalog.routes.js`** — REST surface mounted at
  `/api/v1/forms/catalog` (read endpoints any-authed; instantiate gated
  to admin / forms_admin).
- **`backend/scripts/seed-forms-catalog.js`** — CLI runner with
  `--audience`, `--tenant`, `--branch`, `--dry-run`, `--reset`, `--json`,
  `--help`. Three new npm scripts: `seed:forms-catalog`,
  `seed:forms-catalog:dry`, `seed:forms-catalog:reset`.

### Tests

- `backend/__tests__/forms-catalog-registry.test.js` — 14 tests:
  unique IDs, audience/id alignment, valid field types, no duplicate
  field names, options for select/radio, section references resolve,
  approval workflow shape, summary correctness, minimum coverage per
  audience.
- `backend/__tests__/forms-catalog-service.test.js` — 15 tests: pure
  reads, idempotent instantiate, audience filter on `instantiateAll`,
  `CATALOG_NOT_FOUND` error code, `buildTemplateDoc` metadata stamp.
- New `npm run test:forms-catalog` runs both: 29 tests / 2 suites in ~1s.

### Documentation

- **`docs/blueprint/19-forms-catalog.md`** — full runbook listing every
  form, REST surface, CLI usage, idempotency semantics, extension
  guidelines.

### Non-goals

- No FormDesigner UI changes — catalog is consumed via REST; existing
  designer edits any FormTemplate (including catalog-instantiated ones).
- No FormSubmission changes — submissions use the same flow.
- No auto-seed on tenant create — onboarding policy decision per tenant.
