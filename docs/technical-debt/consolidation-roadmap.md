# Consolidation Roadmap — Duplicate/Overlapping Systems

**Status as of 2026-04-21.** Structured inventory of duplicates discovered
during the 2026-04-21 consolidation audit. Each entry lists canonical
vs deprecated, current blast radius, and migration gate.

The rule: a duplicate stays in the codebase **only** until its legacy
frontend consumer migrates. Nothing is deleted silently; deprecation
markers (`@deprecated`) flag old modules so any new code picks the
canonical path, while existing consumers keep running.

---

## Phase 1 — Zero-risk cleanup (pending review)

### `_archived/` directory (~112 000 files, ~3 GB)

- Backend grep found zero active `require('_archived/...')` references.
- **Blocker**: before mass-deleting, verify no migration scripts or
  CI pipelines touch the path (e.g. `predeploy.js`, docker builds).
- **Gate**: run a full `rg -F '_archived'` across repo, scan deploy
  scripts, then one-shot delete in a dedicated commit so it can be
  reverted if CI breaks.

### `/api/v1` dual-mount (241 endpoint families mounted twice)

- `dualMount(app, path, handler)` in `routes/_registry.js` registers
  every route under both `/api/<path>` and `/api/v1/<path>`.
- Frontend uses `/api/v1/*` in only one non-archive file
  (`ReportsDashboard.jsx`). Mobile app consumers unknown.
- **Blocker**: mobile app may depend on `/api/v1`.
- **Gate**: audit mobile app + any third-party API consumers first,
  then replace `dualMount` with plain `mount` in one PR.

---

## Phase 2 — Document services (DEPRECATED, parallel live)

Five pairs of document services. The root-level EventEmitter-based
implementations are older; the `services/documents/*.service.js`
versions are Mongoose-backed and canonical. Both stay live because:

- **Old consumer**: `routes/documentAdvanced.routes.js` →
  mounted at `/api/documents-advanced` → used by
  `frontend/src/services/documentAdvancedService.js` (**73 calls**)
- **New consumer**: `routes/api/documents-pro-*.routes.js` (phases
  3–9) → mounted at `/api/documents-pro/*`

| Old (root, deprecated)        | Canonical (services/documents/)   | Consumer               |
| ----------------------------- | --------------------------------- | ---------------------- |
| `documentAuditService.js`     | `documentAudit.service.js`        | documents-pro-extended |
| `documentFavoritesService.js` | `documentFavorites.service.js`    | documents-pro-phase3   |
| `documentWatermarkService.js` | `documentWatermark.service.js`    | documents-pro-phase7   |
| `documentQRService.js`        | `documentQRCode.service.js`       | documents-pro-phase5   |
| `documentExportService.js`    | `documentImportExport.service.js` | documents-pro-phase7   |

**Migration path** (per pair, can be done independently):

1. Compare function signatures between old and canonical.
2. If compatible → swap `require()` path in `documentAdvanced.routes.js`,
   run `documentAdvanced.routes.test.js`, delete old service + old unit
   test.
3. If incompatible → write a thin adapter in
   `documentAdvanced.routes.js` or migrate the frontend to call
   `/api/documents-pro/*` endpoints directly, then delete the old
   route + old service together.

**Current action**: old services tagged `@deprecated` with pointer to
canonical. No runtime change. New code writes against canonical only.

---

## Phase 3 — Backup service family (5 files, unclear overlap)

| Service                         | Responsibility                             |
| ------------------------------- | ------------------------------------------ |
| `automated-backup.service.js`   | Orchestrator: MongoDB + files + S3 + TTL   |
| `database-backup-service.js`    | DB-specific backup (overlaps orchestrator) |
| `backup-analytics.service.js`   | Analytics on backup history                |
| `backup-security.service.js`    | Encryption + compliance                    |
| `backup-performance.service.js` | Throughput tuning                          |
| `backup-sync.service.js`        | Real-time sync / incremental               |

Four of these are legitimate aspect-oriented modules around the
orchestrator; they likely shouldn't merge. The ambiguous one is
`database-backup-service.js` vs `automated-backup.service.js` — both
handle scheduling, retention, compression.

**Migration path**: out of scope until we have a product owner call on
whether backup should be a single orchestrator with sub-modules or
continue as a 5-file fan-out. No deprecation markers yet.

---

## Phase 4 — "Enhanced" model variants (needs product decision)

- `Complaint.js` + `ComplaintEnhanced.js` (SLA config, workflow steps)
- `AdvancedTicket.js` + `TicketEnhanced.js` (escalation rules, attachments)

Unclear whether Enhanced variants are a migration-in-progress or a
deliberate dual schema. **Block until** product confirms whether
tickets and complaints are separate domains or unify into one
polymorphic `Issue` type.

---

## Phase 5 — Referral models (mostly by design, one ambiguous)

| Model                      | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `Referral.js`              | FHIR R4 clinical referral (kept — standard)    |
| `medicalReferral.model.js` | Clinical follow-up tracker — **check overlap** |
| `CommunityReferral.js`     | Community outreach (kept — distinct domain)    |
| `ReferralTracking.js`      | CRM analytics (kept — shipped this sprint)     |

**Migration path**: compare `medicalReferral.model.js` against the
`followUp` fields inside `Referral.js`. If fully redundant, merge.
Otherwise leave as-is.

---

## How to use this document

- **Adding a new service/model?** Check this file first — if there's a
  canonical version listed, use it. Don't create a sixth
  `document*Service` variant.
- **Removing a duplicate?** Update the relevant phase section to show
  the pair is resolved, then delete the `@deprecated` marker and the
  old file in the same commit.
- **Adding a new duplicate intentionally?** Add a new phase section
  here explaining why the duplication is load-bearing, so future-you
  doesn't merge them by mistake.
