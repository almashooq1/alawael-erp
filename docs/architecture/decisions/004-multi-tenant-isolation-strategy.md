# 4. Multi-Tenant Isolation Strategy

Date: 2026-04-16

## Status

✅ Accepted

## Context

Al-Awael platform serves a group of 12+ rehabilitation branches (centers) plus a Head Office (HQ). Each branch operates day-to-day autonomously (staff, beneficiaries, finances), while HQ needs cross-branch strategic, financial, quality, and compliance oversight.

We had to choose how to isolate tenant (branch) data while supporting controlled cross-branch access for specific roles.

Options considered:

1. **Database-per-branch** — full physical isolation, but operationally expensive (backups, schema changes, 12+ copies).
2. **Schema-per-branch** (MongoDB: database name = branch) — medium isolation, still expensive for cross-branch queries.
3. **Row-level isolation with `branchId` discriminator** — single shared database, every operational document has `branchId`, application layer enforces isolation.

## Decision

We adopt **row-level multi-tenant isolation** with the following contract:

1. **Canonical field:** Every operational (non-global) model has a required `branchId: ObjectId` field referencing `Branch._id`. The field name is locked via `backend/config/constants/tenant.constants.js` (`TENANT_FIELD = 'branchId'`).
2. **Middleware enforcement:** `branchScope.middleware.js` reads `req.user.defaultBranchId` and attaches tenant context to requests. All mutating routes must pass through it.
3. **Query-time auto-filter:** `multi-tenant-isolator.js` injects `{ branchId: userBranchId }` into Mongoose queries at the model-plugin level, unless the user's role is in `TENANT_BYPASS_ROLES` (`SUPER_ADMIN`, `HEAD_OFFICE_ADMIN`, `ADMIN`).
4. **Excluded (global) models:** `User`, `Branch`, `Setting`, `SystemConfig`, `AuditLog`, `BackupMeta`, `MigrationRecord`, `ArchiveMeta`, `Counter`.
5. **Cross-branch roles:** `SUPER_ADMIN`, `HEAD_OFFICE_ADMIN`, `ADMIN` (defined in `CROSS_BRANCH_ROLES`).
6. **Audit:** Every cross-branch read by bypass roles is logged to `AuditLog` with the tenant boundary crossed.

## Rules

- **New models MUST** declare `branchId` unless they appear in `TENANT_EXCLUDED_MODELS`.
- **No direct MongoDB access** bypassing Mongoose models (`collection.find` forbidden in business code).
- **No untrusted input** may set `branchId` on write; it is derived from `req.user` or explicit cross-branch workflow.
- **Cross-branch transfers** use a saga that atomically updates `branchId` across related aggregates.
- **Tests** must cover the isolation guarantee — an integration test per new model verifies a user in Branch A cannot read Branch B's records.

## Consequences

### Positive

- Single database simplifies backups, migrations, schema evolution.
- Cross-branch queries (HQ reports) are natural — no joins across databases.
- Easier to add a 13th branch — no infrastructure change.
- Plays well with Node.js/Mongoose existing stack.

### Negative

- All isolation is application-enforced — a developer skipping the middleware could leak data. Mitigated by:
  - Mongoose plugin applied globally at app boot.
  - Lint rule forbidding direct `collection.*` access.
  - CI integration test: "tenant isolation" suite covers every operational model.
- Large branches share hardware resources; must monitor hot spots. Mitigation: sharding by `branchId` when collection size warrants.

### Risks

- See R-03 in [docs/blueprint/08-risks-controls.md](../../blueprint/08-risks-controls.md).

## References

- Canonical field: `backend/config/constants/tenant.constants.js`
- Middleware: `backend/middleware/branchScope.middleware.js`
- Isolator: `backend/middleware/multi-tenant-isolator.js`
- Context: [blueprint/02-bounded-contexts.md](../../blueprint/02-bounded-contexts.md) § BC-02
- Commit introducing HEAD_OFFICE_ADMIN: `47d17268`
