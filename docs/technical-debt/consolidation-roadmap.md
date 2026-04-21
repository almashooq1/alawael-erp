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

### `/api/v1` dual-mount (241 endpoint families mounted twice) — **BLOCKED**

- `dualMount(app, path, handler)` in `routes/_registry.js` registers
  every route under both `/api/<path>` and `/api/v1/<path>`.
- **Frontend**: uses `/api/v1/*` in one file (`ReportsDashboard.jsx`).
- **Mobile app**: `mobile/src/services/ApiService.ts` hard-codes
  `API_BASE_URL = 'https://api.alawael.com/api/v1'` — every mobile
  call routes through `/api/v1`. Removing the dual-mount would break
  the entire mobile client.
- **Status**: BLOCKED until the mobile app ships a release that
  switches `API_BASE_URL` to `/api`. After that release is in the
  field for at least one full mobile release cycle (so users actually
  update), the dual-mount can be removed.
- **Do not** attempt to remove `dualMount` before then — verified
  live mobile dependency.

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

| Old (root, deprecated)         | Canonical (services/documents/)   | Consumer               |
| ------------------------------ | --------------------------------- | ---------------------- |
| `documentAuditService.js`      | `documentAudit.service.js`        | documents-pro-extended |
| `documentComparisonService.js` | `documentComparison.service.js`   | documents-pro (phase)  |
| `documentFavoritesService.js`  | `documentFavorites.service.js`    | documents-pro-phase3   |
| `documentWatermarkService.js`  | `documentWatermark.service.js`    | documents-pro-phase7   |
| `documentQRService.js`         | `documentQRCode.service.js`       | documents-pro-phase5   |
| `documentExportService.js`     | `documentImportExport.service.js` | documents-pro-phase7   |

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

## Phase 6 — Model duplicates (only 3 are genuine, 9 are already unified)

When the `no-duplicate-model-pairs` drift test was first added during
the 2026-04-21 ZKTeco audit it surfaced 12 filename-level duplicate
pairs across `backend/models/`. The 2026-04-21 deep audit showed
**only 3 of those are genuine data-fragmentation bugs** — the other 9
are already code-level unified via the proxy re-export pattern (e.g.
`Employee.js` contains `module.exports = require('./HR/Employee')`,
so both file paths resolve to the same Mongoose model on the same
collection).

The drift test was tightened on the same day: it now inspects whether
a file genuinely registers a Mongoose model (`mongoose.Schema(` or
`mongoose.model(`) vs merely re-exporting a sibling. A future pair is
only flagged as a split when both files register their own schema.

### The 9 pairs that are ALREADY unified via proxy (no action needed)

| Filename pair                                   | How it's unified                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `Employee.js` + `employee.model.js`             | `Employee.js` → `HR/Employee`, `employee.model.js` → `Employee.js` |
| `Attendance.js` + `attendance.model.js`         | `attendance.model.js` → `Attendance.js`                            |
| `AuditLog.js` + `auditLog.model.js`             | `AuditLog.js` → `auditLog.model.js.AuditLog`                       |
| `InsuranceClaim.js` + `insuranceClaim.model.js` | `InsuranceClaim.js` → `insuranceClaim.model.js.InsuranceClaim`     |
| `Leave.js` + `leave.model.js`                   | `Leave.js` → `leave.model.js`                                      |
| `Notification.js` + `notification.model.js`     | `notification.model.js` → `Notification.js`                        |
| `WorkShift.js` + `workShift.model.js`           | `WorkShift.js` → `workShift.model.js`                              |
| `Analytics.js` + `analytics.model.js`           | `analytics.model.js` → `Analytics.js` (with test-mock wrapper)     |
| `Payment.js` + `payment.model.js`               | `payment.model.js` → `Payment.js` (with test-mock wrapper)         |

No migration needed — Mongoose's `mongoose.models.X || mongoose.model('X', schema)`
pattern + the proxy chain ensures both require paths land on the same
model instance and collection.

### The 3 GENUINE splits (need real migration)

| File                                        |                                                                 Mongoose registers? |     Lines | Notes                                                                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------: | --------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Project.js` + `project.model.js`           | `Project.js` = plain JS class (NOT Mongoose) · `project.model.js` = Mongoose schema |   63 / 45 | Likely `Project.js` was a POC class; actual persisted model is `project.model.js`. Legacy class is probably dead code — grep consumers to confirm then delete. |
| `Training.js` + `training.model.js`         |                                                      Both register Mongoose schemas | 120 / 122 | Schemas diverge on field names. Needs natural-key merge (likely `courseCode` vs `title`).                                                                      |
| `ZktecoDevice.js` + `zktecoDevice.model.js` |                                                      Both register Mongoose schemas |  53 / 308 | Different registered names (`ZktecoDevice` vs `ZKTecoDevice`). Different collections, same physical devices.                                                   |

### ZKTeco pair (initial case study)

| File                           | Mongoose name  | Lines | Consumer                                                                   |
| ------------------------------ | -------------- | ----- | -------------------------------------------------------------------------- |
| `models/ZktecoDevice.js`       | `ZktecoDevice` | 53    | routes/biometric-attendance + zktecoSdk.service + kpi-attendance.scheduler |
| `models/zktecoDevice.model.js` | `ZKTecoDevice` | 308   | services/hr/zktecoService (1024-line enterprise service)                   |

Schemas diverge:

- Legacy: `name`, `ipAddress`, `lastSyncAt`, `enrolledCount`
- Canonical: `deviceName`, `port`, `consecutiveFailures`,
  `deviceInfo`, `deviceUsers`, `syncLogs`

### Migration path (per pair, same template)

1. Audit which model each consumer currently uses and which collection
   has more recent/richer data.
2. Pick canonical — usually the one with more fields, more
   relationships, and the larger consumer base. For most of the 12
   pairs the `.model.js` version is canonical (newer convention); the
   legacy `.js` version is earlier scaffolding.
3. Write a migration script that reads both collections, merges rows
   by natural key (`serialNumber` for ZKTeco, `employeeNumber` for
   Employee, etc.), writes to the canonical collection, dedupes.
4. Migrate consumers one at a time from legacy require path to
   canonical require path.
5. Drop the legacy collection once all consumers are migrated.
6. Delete the legacy file; remove its entry from
   `GRANDFATHERED_MODEL_PAIRS` in `no-duplicate-service-pairs.test.js`.

### Priority order (only 3 pairs, ranked)

1. **Project** — likely safest to resolve first. `Project.js` is a
   plain JS class (not Mongoose), so deleting it only affects code
   that `new Project()`-s in memory. Grep consumers, migrate any
   usages to read from `project.model.js`, delete `Project.js`.
2. **ZktecoDevice** — enterprise `zktecoService` (1024L) already
   consumes canonical `zktecoDevice.model.js`. Migration: have
   `biometric-attendance.routes`, `zktecoSdk.service`, and
   `kpi-attendance.scheduler` switch to the canonical model; write
   a collection-merge script keyed on `serialNumber`; delete the
   legacy.
3. **Training** — both Mongoose schemas, both presumably have
   historical data. Needs the most careful migration: schema-map
   the divergent fields, merge by natural key (`courseCode` or
   `title+year`), then rewire consumers.

### Current action

- `@deprecated` marker on `models/ZktecoDevice.js` (the pair that
  triggered this section).
- Drift test `no-duplicate-model-pairs` grandfathers only the 3
  genuine splits. The test uses an AST-ish heuristic (`is this file
registering a Mongoose schema, or re-exporting a sibling?`) so it
  won't false-positive on proxy pairs and won't false-negative on
  new splits.
- Nothing data-migrated yet. Migration needs DB access + product
  input on which collection has the authoritative historical data
  for each of the 3 pairs.

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
