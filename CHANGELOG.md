# CHANGELOG

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> Earlier entries (v4.0.0 → v4.0.113) are preserved in git history. The
> file was inadvertently truncated by a prettier hook during the v4.0.113
> deploy session and rebuilt fresh from this version onward.

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
