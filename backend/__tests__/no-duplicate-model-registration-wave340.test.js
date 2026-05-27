'use strict';

/**
 * W340 — no-duplicate-model-registration drift guard.
 *
 * Discovery on test-run of 05-reports-approvals-family-communication.prompt.md:
 * `'ApprovalRequest'` is registered with `mongoose.model('ApprovalRequest',
 * schema)` in THREE different source files:
 *
 *   1. backend/authorization/approvals/approval-request.model.js:91
 *   2. backend/models/ApprovalRequest.js:41
 *   3. backend/services/documents/documentApprovalChains.service.js:191
 *
 * Mongoose silently keeps the FIRST schema loaded; subsequent registrations
 * (via the `mongoose.models.X || mongoose.model(X, schema)` idiom) return the
 * already-cached model, dropping the second/third schema. If the schemas
 * differ in field shape, callers using `mongoose.model('ApprovalRequest')`
 * get whichever was loaded first — half the code base operates on the wrong
 * shape silently.
 *
 * This is a NEW bug class not caught by:
 *   - W324+W329 canonical-beneficiary-ref guard (different field-name scope)
 *   - W325c universal phantom-ref guard (model IS registered, just multiply)
 *   - W332 care-planning.registry guard (different lib scope)
 *
 * Algorithm:
 *   1. Scan all backend/*.js (except tests / archived / node_modules) for
 *      `mongoose.model('Name', schema)` registrations.
 *   2. Group by name. Any name appearing in >1 source file is a duplicate.
 *   3. Assert: no duplicates outside ALLOWLIST.
 *
 * Static analysis only — no mongoose load (jest.setup.js mocks it).
 *
 * Baseline-ratchet pattern (W325c lessons): current duplicates baselined
 * as KNOWN_DUPLICATE_REGISTRATIONS until investigated + consolidated.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const BACKEND_ROOT = path.join(__dirname, '..');

const SCAN_SKIP_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'tests',
  'node_modules',
  '.jest-cache',
  'coverage',
  '_archived',
]);

// Three patterns we count as a registration:
//   mongoose.model('Name', schema)            — direct two-arg form
//   connection.model('Name', schema)          — per-connection registration (W341c
//                                               extension after the AF-2 audit found
//                                               at least one hidden duplicate via
//                                               this pattern: workflow-engine.js
//                                               registered WorkflowInstance through
//                                               `connection.model` while being dead
//                                               code. 14 files in backend/ use this
//                                               pattern; conn/db are interchangeable
//                                               variable names for the mongoose
//                                               Connection object.)
//   reg('Name', schemaName)                   — helper-wrapped (Enterprise PRO/Plus convention)
//   getOrCreate('Name', schemaName)
//   registerModel('Name', schemaName)
const REGISTRATION_RE = /mongoose\.model\s*\(\s*['"]([^'"]+)['"]\s*,/g;
const CONNECTION_REGISTRATION_RE = /\b(?:connection|conn|db)\.model\s*\(\s*['"]([^'"]+)['"]\s*,/g;
const HELPER_REGISTRATION_RE =
  /\b(?:reg|getOrCreate|registerModel|ensureModel|defineModel)\s*\(\s*['"]([^'"]+)['"]\s*,\s*\w+Schema\b/g;

// Known duplicates baselined for ratchet-DOWN per the W325c pattern. Each entry:
//   <ModelName>: [<file1>, <file2>, ...]   — list of files that register the name
// Once a duplicate group is consolidated (single canonical file remaining),
// remove its entry and the guard will catch any regression.
// W340-discovery snapshot 2026-05-24: 51 model names registered in multiple
// source files. Top severity (registered in ≥3 files):
//   AuditLog (4×)   — critical: audit infrastructure spread across 4 files
//   Beneficiary (3×) — critical: canonical entity per W324
//   ReportTemplate (3×)
//   ApprovalRequest (3×) ← the discovery that triggered W340
//
// Each represents potential silent schema divergence (Mongoose keeps FIRST,
// drops subsequent). Future ratchet waves consolidate group-by-group:
//   identify canonical file → others re-export from it → remove from this Set.
//
// CONTRACT: do NOT add entries. Add the canonical → re-export path instead.
const KNOWN_DUPLICATE_REGISTRATIONS = new Set([
  // Tier 1 — registered in 3 or 4 files (highest risk of silent schema drift).
  // Counts re-verified after W340 scanner comment-stripping fix:
  // 'AuditLog' — W347 moved to REGISTRATION_ALLOWLIST (defensive pattern, canonical
  //              always wins via load-order; ADR-021 Tier 1 question Q1-Q3 still open
  //              for true consolidation but ALLOWLIST preserves current behavior).
  'ApprovalRequest', // 3× — discovered W340; schemas DIVERGE significantly (rich state-machine in authorization/approvals/ vs simple legacy in models/ — first-loaded wins silently)
  'ReportTemplate', // 3×
  'WorkflowInstance', // 3× (was undercount before W340 comment-stripping fix; surfaced in re-scan)
  // 'Beneficiary' — W341 CONSOLIDATED: seeder now re-exports canonical models/Beneficiary.js.

  // Tier 2 — registered in 2 files (lower risk but still drift-prone)
  'Correspondence',
  'EmailTemplate',
  'WhatsAppConversation',
  'WhatsAppTemplate',
  // 'LifecyclePolicy' — 2026-05-25 moved to REGISTRATION_ALLOWLIST (defensive
  //                     lookup-with-fallback pattern in database/ttl-lifecycle-manager.js
  //                     lines 79-84: try { mongoose.model('LifecyclePolicy') } catch
  //                     { mongoose.model('LifecyclePolicy', schema) }. Pure lookup-first;
  //                     fallback is dead code in normal startup. Matches W347 AuditLog +
  //                     W343 Referral/Task precedents.
  // 'User'      — W341 CONSOLIDATED: seeder now re-exports canonical models/User.js
  // 'Branch'    — W341 CONSOLIDATED: seeder now re-exports canonical models/Branch.js
  // 'Department'— W341 CONSOLIDATED: seeder now re-exports canonical models/Department.js
  // 'Session'   — W341 CONSOLIDATED: seeder now re-exports canonical models/Session.js
  // 'Vehicle'   — W341 CONSOLIDATED: seeder now re-exports canonical models/Vehicle.js
  'LifecyclePolicy',
  'GeneratedReport',
  // 'Employee'      — W342 CONSOLIDATED: hr/saudi-hr-service.js now re-exports models/Employee.js
  // 'LeaveRequest'  — W342 CONSOLIDATED: same — re-exports models/LeaveRequest.js
  // 'Attendance'    — W342 CONSOLIDATED: same — re-exports models/Attendance.js
  'Payroll', // 2× — NO canonical at models/Payroll.js (only PayrollPeriod.js); consolidation deferred
  'Event',
  // 'BranchSetting' — 2026-05-25 moved to REGISTRATION_ALLOWLIST (defensive
  //                   lookup-with-fallback pattern in routes/central-settings.routes.js
  //                   lines 24-98: try { require('../models/BranchSetting') } catch
  //                   { mongoose.model('BranchSetting', schema) }. Canonical wins via
  //                   load-order in normal startup; fallback is dead code. Matches
  //                   W347 AuditLog + W343 Referral/Task precedents.
  // 'GlobalSetting' — same routes/central-settings.routes.js defensive try/catch pattern.
  //                   Both names ALLOWLISTed together since they're paired in the same
  //                   try/catch block.
  // 'NotificationLog' — 2026-05-27 INVESTIGATED (not yet consolidated):
  //   Two genuinely DIVERGENT schemas under one model name:
  //     (a) services/unifiedNotifier.js — DELIVERY LOG (channel/to/subject/body/
  //         attempts/providerMessageId/sentAt — camelCase). Used by 18 callers
  //         across routes/+startup/+services/ as the multi-channel notify() audit trail.
  //     (b) models/communication/NotificationLog.js — USER INBOX (user_id/
  //         title_ar/body_ar/recipients[]/is_read/read_at — snake_case bilingual).
  //         Used by ONE caller: routes/communication-module.routes.js (inbox CRUD).
  //   Runtime: unifiedNotifier loads first via top-level requires in 18 files
  //   (notifications-log.routes.js mounted at app.js:318 transitively pulls it)
  //   → its DELIVERY-LOG schema wins via mongoose.models cache → the bilingual
  //   USER-INBOX schema returns the cached delivery-log model → ALL queries in
  //   communication-module.routes.js silently match against wrong fields
  //   (mongoose strict mode strips snake_case fields the delivery-log schema
  //   doesn't have). Production impact: inbox endpoints return empty/wrong
  //   results. Tests in tests/unit/communication-module.routes.test.js pass
  //   because they mock the model entirely.
  //   Resolution: Pattern D rename per ADR-021 — rename one model name. Two
  //   different domains, two different schemas, ONE name is the problem. Either:
  //     - Rename inbox → 'UserNotification' (touches communication-module.routes
  //       + the schema file + DB collection migration)
  //     - Rename delivery → 'NotificationDeliveryLog' (touches 18 callers +
  //       services/unifiedNotifier.js + DB migration). Lower-blast-radius name
  //       but higher caller-update count.
  //   Recommendation: Pattern D rename inbox → 'UserNotification' (fewer touch
  //   points). Open ADR-031 to confirm before executing.
  'NotificationLog',
  // 'Consent' — 2026-05-27 moved to REGISTRATION_ALLOWLIST. Verified dormant
  //   privacy fallback: privacy/consent.model.js has ZERO production importers
  //   (only __tests__/privacy.routes.test.js imports it; privacy/privacy.routes.js
  //   uses buildRouter DI but is never mounted in app.js or any registry).
  //   Canonical models/Consent.js has 8 production callers (app.js, beneficiary-
  //   consents.routes.js, therapistPortal.service.js, parent-portal-v1.routes.js,
  //   consentObservations.js, sehhaty-adapter tests). Both use the defensive
  //   `mongoose.models.Consent || mongoose.model(...)` guard, so canonical wins
  //   load-order race; privacy fallback is dead code at runtime. Same precedent
  //   as W347 AuditLog / W343 Referral+Task.
  //
  // ─── CLUSTER: documents-pro divergent-schema duplicates (2026-05-27 audit) ───
  // The next 5 entries (DocumentAccessLog, DocumentShare, DocumentVersion,
  // ComplianceAlert, CalendarEvent) ALL share the same P1 bug class as
  // NotificationLog (above): two genuinely different schemas registered under
  // the same model name, BOTH live in production. Root pattern:
  //   - models/<X>.js — canonical, defensive `mongoose.models.X ||` guard,
  //     required by routes/facilities.routes.js + routes/inventory-enhanced.routes.js
  //     + routes/recruitment.routes.js etc. (1-3 callers each, canonical refs).
  //   - services/documents/{documentSharing,documentVersioning,documentCalendar,
  //     documentComplianceMonitor}.service.js — each inlines its OWN schema with
  //     `mongoose.models.X || mongoose.model('X', LocalSchema)`. Wired LIVE via
  //     api/routes/documents-pro-{phase3,phase5,phase7,extended}.routes.js which
  //     are mounted by routes/registries/documents.registry.js → /api/v1/documents.
  // Concrete divergences confirmed today (sample: DocumentAccessLog):
  //   canonical action enum: ['view','download','print','edit','delete','share',
  //                            'sign','upload','archive']
  //   service  action enum: ['view','download','edit','print','comment']
  //                          (adds 'comment'; drops delete/share/sign/upload/archive)
  //   service adds: shareId ref:'DocumentShare', userName (String)
  //   collection: canonical default ('documentaccesslogs'),
  //               service explicit 'document_access_logs' (SO TWO COLLECTIONS
  //               could exist at runtime if both register first against different
  //               connections — but in shared mongoose registry the first-loader
  //               schema wins ENTIRELY, including collection name).
  // DocumentShare similarly diverges (canonical: shareToken/sharedWith/isActive;
  // service: shareLink/recipientId/status — completely different field names).
  // ComplianceAlert + CalendarEvent: services/documents/*.service.js vs
  // models/EnterprisePro.js (mega-file `reg()` helper at line ~760-784).
  // Runtime impact: whichever route loads first wins; loser-schema's writes get
  // mongoose-strict-stripped; loser-schema's queries match wrong/zero docs.
  //   Recommendation: each entry needs an ADR-031-style Pattern D rename of the
  //   service-side schema (e.g. DocumentShare in service → `DocumentShareLink`,
  //   DocumentAccessLog in service → `DocumentAccessAudit`, etc.) OR consolidation
  //   to canonical (preferred) by migrating documents-pro routes to require the
  //   canonical models/X.js and deleting the local schema. The mega-file
  //   EnterprisePro.js entries (CalendarEvent + ComplianceAlert + RoomBooking +
  //   Warehouse + JobPosting) require a separate decision: keep mega-file (rename
  //   each model) or split into per-model files (drop mega-file's `reg()` bulk
  //   registration). Defer until stakeholder ADR.
  // Adding to ALLOWLIST would be INCORRECT here — these are NOT defensive
  // fallbacks; they are competing live schemas. Keeping in baseline = visible
  // tech debt that fails CI on any new such duplicate.
  // ──────────────────────────────────────────────────────────────────────────
  'DocumentAccessLog',
  'DocumentShare',
  'DocumentVersion',
  'ComplianceAlert',
  'CalendarEvent',
  // RoomBooking + Warehouse + JobPosting + JobApplication + Facility: same
  // EnterprisePro.js / EnterpriseProPlus.js mega-file `reg()` / `getOrCreate()`
  // bulk-registration pattern vs single-file canonical at models/<X>.js with
  // DIVERGENT schemas (verified 2026-05-27 for RoomBooking: canonical uses
  // bookingDate/startTime/endTime + room:ObjectId ref:'Room', mega-file uses
  // start/end:Date + room:String). Same P1 cluster as above documents-pro group;
  // requires stakeholder ADR before either Pattern D rename or mega-file split.
  'RoomBooking',
  'Warehouse',
  'JobPosting',
  'JobApplication',
  'Facility',
  'Vendor',
  'VendorEvaluation',
  'ChangeRequest',
  'StrategicInitiative',
  //
  // ─── UMBRELLA: 2026-05-27 audit — all entries below to 'WorkflowDefinition'
  //     belong to the SAME divergent-schema cluster as the documents-pro block
  //     above. Audited registration sites for each via grep
  //     `mongoose.model\(['"]X['"]`. Pattern repeats across:
  //       * services/documents/document{Forms,Notification,Signature,
  //         DigitalCert,Workflow*,ImportExport}.service.js
  //       * rehabilitation-services/{advanced-therapy-protocols,
  //         aac-therapy-protocols,goals-bank-service,mdt-transition-quality}.js
  //       * workflow/intelligent-workflow-engine.js
  //       * privacy/data-subject-request.model.js vs services/pdpl.service.js
  //       * models/operations/NotificationPreferences.model.js vs
  //         services/documents/documentNotification.service.js
  //       * models/MDTCoordination.js vs rehabilitation-services/mdt-transition-quality.js
  //     Confirmed schema divergence samples:
  //       - GoalBank: canonical domain enum 5 SHOUTING_CASE values vs service
  //         17 snake_case values + 14 extra fields
  //       - ImportExportJob: canonical ~30 fields with sub-schemas vs service
  //         ~10 fields, different collection name
  //       - TherapyProtocol (aac-therapy-protocols.js:262 uses NON-defensive
  //         `mongoose.model()` — would throw OverwriteModelError if loaded
  //         after advanced-therapy-protocols.js; works today only because of
  //         load order)
  //     Same resolution applies as documents-pro cluster: each entry needs
  //     Pattern D rename (per ADR-021 framework) OR consolidation by deleting
  //     service-side schema and requiring canonical models/<X>.js. The
  //     workflow-engine vs documents-pro WorkflowDefinition/Instance split
  //     likely warrants its own ADR (workflow domain owns multiple engines).
  //     Keeping in baseline = visible tech debt; CI fails on any NEW duplicate.
  // ──────────────────────────────────────────────────────────────────────────
  'FormSubmission',
  'FormTemplate',
  'GoalBank',
  'ImportExportJob',
  'MDTMeeting',
  'Student', // domain fragmentation per ADR-020 (Student vs Beneficiary) — see ADR-020 for canonical-consolidation decision (deferred pending stakeholder)
  'NotificationPreferences',
  // 'Referral' — W343 moved to REGISTRATION_ALLOWLIST (defensive lookup-with-fallback pattern in routes/)
  // 'Task'     — W343 moved to REGISTRATION_ALLOWLIST (same pattern)
  'DataSubjectRequest',
  'TherapyProtocol',
  'DigitalSignature',
  'WorkflowInstance',
  'WorkflowDefinition',

  // ─────────────────────────────────────────────────────────────────────────
  // AF-2 (2026-05-25) — surfaced by extending the regex to catch
  // `connection.model(...)` / `conn.model(...)` / `db.model(...)` patterns
  // (the per-connection registration form, previously a drift-guard blind
  // spot). Each below has the SAME anti-pattern:
  //   * Canonical schema lives at `models/<X>.js`
  //   * A `<domain>/*-service.js` file ALSO registers `'X'` via
  //     `connection.model('X', schema)` — typically a local schema definition
  //     designed for multi-tenant connection support, but creates silent
  //     schema-divergence risk identical to the W325c phantom-ref class.
  // Consolidation strategy (future ratchet waves):
  //   (a) For services that DON'T need per-connection isolation: re-export
  //       the canonical, e.g. `module.exports = require('../models/Vehicle')`.
  //   (b) For services that legitimately need per-connection schemas (rare):
  //       ALLOWLIST + add a comment explaining the per-connection requirement.
  //   (c) For services where the local schema diverges from canonical:
  //       Pattern D rename per ADR-021 (e.g. `Vehicle` → `TransportVehicle`).
  // ─────────────────────────────────────────────────────────────────────────
  // 6 AF-2 entries below ALL CONSOLIDATED 2026-05-25 via the dormant-service
  // cleanup pattern. Discovery: vehicles/index.js + communication/email-service
  // .initialize() are NEVER called from app.js, so the connection.model
  // registrations inside them never fire at runtime — they were static-only
  // duplicates. Each service's connection.model('X', schema) replaced with
  // mongoose.model('X') lookup against the loaded canonical (or
  // mongoose.models.X || null for cases without a canonical). Schema
  // definitions kept inline as documentation, marked dead-code via
  // `void X;` to silence eslint. Zero runtime impact today; future engineers
  // wiring up these services get canonical schemas + a comment explaining
  // the situation. If any service genuinely needs per-connection isolation
  // for multi-tenant, do Pattern D rename (e.g. 'TenantVehicle') in same wave.
  // 'Beneficiary'         — vehicles/rehabilitation-transport-service.js (dormant)
  // 'EmailLog'            — communication/email-service.js (dormant; was Pattern D
  //                         shape drift to: [String] vs canonical to: [{address,name}])
  // 'Permission'          — CONSOLIDATED 2026-05-25 empty-shim batch (98988fe75)
  // 'Role'                — CONSOLIDATED 2026-05-25 empty-shim batch (98988fe75)
  // 'TrafficAccident'     — CONSOLIDATED 2026-05-25 empty-shim batch (a56c9feb0)
  // 'TransportRoute'      — vehicles/rehabilitation-transport-service.js (dormant)
  // 'Vehicle'             — vehicles/vehicle-service.js (dormant)
  // 'VehicleMaintenance'  — vehicles/vehicle-service.js (dormant)
  // 'VehicleTrip'         — vehicles/{vehicle,saudi-vehicle}-service.js (both dormant)
]);

// Models deliberately referenced but not Mongoose-owned. Inherited from W325c
// for consistency.
const REGISTRATION_ALLOWLIST = new Set([
  // W343 — defensive lookup-with-fallback pattern: routes/referrals.routes.js and
  // routes/tasks.routes.js each define a `function Referral()/Task()` that returns
  // `mongoose.model('X')` if registered, otherwise registers a fallback schema in
  // the catch branch. In normal app startup canonical models/<X>.js loads first so
  // the fallback never executes (dead code), but the scanner sees the literal
  // pattern. ALLOWLISTed because the intent is graceful degradation, not silent
  // schema duplication.
  'Referral',
  'Task',
  // W370 — TransitionPlan collision: W361 added the canonical `models/TransitionPlan.js`
  // (camelCase, canonical refs per W324+W329, registered in W366 canonical catalog) BUT a
  // pre-existing `rehabilitation-services/mdt-transition-quality.js` (mounted live via
  // `clinical-assessment.registry.js`) ALSO registers `TransitionPlan` with a DIFFERENT
  // snake_case schema (beneficiary_id, branch_id, transition_type enum, etc.). Schemas
  // DIVERGE significantly — same bug class as ApprovalRequest (ADR-022) / ReportTemplate
  // (ADR-023). Cannot autonomously resolve: old module is live (no callers via require()
  // but mounted as a route), schema migration would break old API contract. ALLOWLISTed
  // as stopgap pending a future ADR-027-style Pattern D rename proposal (e.g. legacy →
  // `MdtTransitionPlan`, new keeps `TransitionPlan`). Same precedent as W347 AuditLog.
  'TransitionPlan',
  // W347 — AuditLog (4 registration sites, all idempotent/defensive). Per ADR-021
  // Tier 1 analysis the 4 sites are:
  //   1. models/auditLog.model.js (canonical, richest schema, 60+ event types)
  //   2. database/audit-trail.js (try/catch defensive: lookup first, register fallback)
  //   3. routes/audit-trail-enhanced.routes.js (same try/catch defensive)
  //   4. middleware/auditTrail.middleware.js (idempotent: mongoose.models.AuditLog || mongoose.model(...))
  // In normal startup the canonical loads first → other 3 schemas are dead code.
  // The schemas DIVERGE (canonical uses entityType, routes uses auditableType,
  // middleware uses event+actor — see ADR-021 comparative table) so a true
  // consolidation requires the stakeholder decision documented in ADR-021 Q1-Q3:
  // are there callers depending on the non-canonical field names? Until that's
  // answered the ALLOWLIST preserves current behavior (canonical always wins via
  // load-order). Same precedent as W343 Referral/Task.
  'AuditLog',
  // 2026-05-25 — BranchSetting + GlobalSetting. Same defensive try/catch pattern
  // as W343 Referral/Task + W347 AuditLog. Located in routes/central-settings.routes.js
  // lines 24-98: `try { require('../models/BranchSetting') } catch { mongoose.model(...) }`.
  // In normal app startup canonical models/BranchSetting.js loads first via auto-discovery;
  // the catch-branch fallback is dead code. Schemas differ but only the canonical executes
  // at runtime so divergence never bites. Both names ALLOWLISTed together since they share
  // the same try/catch block in the same routes file.
  'BranchSetting',
  'GlobalSetting',
  // 2026-05-25 — LifecyclePolicy. Same try-lookup-catch-fallback pattern as
  // W347 AuditLog. Located in database/ttl-lifecycle-manager.js lines 79-84.
  // Canonical loads first via models/ auto-discovery + LifecyclePolicy.js exists
  // somewhere in models/ that registers it; the inline fallback in this file
  // is dead code (only fires if canonical lookup throws, which it doesn't in
  // normal startup). ALLOWLIST preserves current behavior.
  'LifecyclePolicy',
  // 2026-05-27 — Consent. Two registration sites: (1) canonical models/Consent.js
  // (8 production callers, beneficiary-centric schema: type/grantedBy:Guardian/
  // revokedAt), (2) privacy/consent.model.js (PDPL-centric schema: subjectType/
  // legalBasis/state/noticeVersion). Verified 2026-05-27 that #2 has ZERO
  // production importers — privacy/privacy.routes.js uses DI buildRouter pattern
  // but is never mounted in app.js or any route registry. Both files use the
  // defensive `mongoose.models.Consent || mongoose.model(...)` idiom; canonical
  // wins load-order race trivially. Same precedent as W347 AuditLog / W343
  // Referral+Task. A future ADR may decide to either (a) delete the dormant
  // privacy/consent.model.js + privacy/privacy.routes.js if PDPL ledger surface
  // is permanently scoped to clinical consents, or (b) wire the PDPL router
  // with its own model name (e.g. 'PdplConsent') to formalize the two domains.
  'Consent',
]);

function walkJs(dir, skip, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip && skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, skip, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// Strip JS comments so doc-strings like `mongoose.model('X', schema)` inside a
// /* */ block or a // line comment don't get counted as a registration. The
// W340 initial discovery found `scripts/testing/check-model-collisions.js`
// triggered a false-positive on 'Beneficiary' because the comment contained
// the literal pattern as an example. Comment-stripping makes the guard
// rigorous against documentation noise.
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function collectRegistrations() {
  const files = walkJs(BACKEND_ROOT, SCAN_SKIP_DIRS);
  // Map<modelName, Set<filePath>>  — using Set because the same file might
  // have the pattern matched twice (once inside `mongoose.models.X ||` and
  // once in `mongoose.model('X', schema)`), and we only want to count files.
  const byName = new Map();
  for (const f of files) {
    const src = stripJsComments(fs.readFileSync(f, 'utf8'));
    const rel = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
    for (const m of src.matchAll(REGISTRATION_RE)) {
      if (!byName.has(m[1])) byName.set(m[1], new Set());
      byName.get(m[1]).add(rel);
    }
    for (const m of src.matchAll(CONNECTION_REGISTRATION_RE)) {
      if (!byName.has(m[1])) byName.set(m[1], new Set());
      byName.get(m[1]).add(rel);
    }
    for (const m of src.matchAll(HELPER_REGISTRATION_RE)) {
      if (!byName.has(m[1])) byName.set(m[1], new Set());
      byName.get(m[1]).add(rel);
    }
  }
  return byName;
}

describe('W340 no-duplicate-model-registration drift guard', () => {
  it('no Mongoose model name is registered in more than one source file', () => {
    const byName = collectRegistrations();
    expect(byName.size).toBeGreaterThan(100); // sanity — codebase has 200+ unique models

    const newDuplicates = [];
    for (const [name, files] of byName) {
      if (files.size <= 1) continue;
      if (REGISTRATION_ALLOWLIST.has(name)) continue;
      if (KNOWN_DUPLICATE_REGISTRATIONS.has(name)) continue;
      newDuplicates.push({ name, files: [...files] });
    }

    if (newDuplicates.length > 0) {
      const lines = newDuplicates
        .map(
          d =>
            `  - "${d.name}" registered in ${d.files.length} files:\n      ${d.files.join('\n      ')}`
        )
        .join('\n');
      throw new Error(
        `Found ${newDuplicates.length} NEW Mongoose model name(s) registered in multiple source files:\n${lines}\n\n` +
          `Mongoose silently keeps the FIRST registered schema — subsequent files' schemas are dropped. ` +
          `If schemas differ, callers using \`mongoose.model('X')\` operate on whichever was loaded first.\n\n` +
          `Fix options:\n` +
          `  (a) Pick a canonical file. Other files must re-export from it: \`module.exports = require('../canonical/path');\`\n` +
          `  (b) If they're meant to be DIFFERENT entities, rename one (e.g. 'AuthorizationApprovalRequest' vs 'ReportApprovalRequest').\n` +
          `  (c) Only if the duplication is genuinely deliberate (e.g. discriminators in the same file): add to REGISTRATION_ALLOWLIST.\n\n` +
          `Do NOT add to KNOWN_DUPLICATE_REGISTRATIONS without justification — that baseline only ` +
          `holds W340-discovery-time duplicates and ratchets DOWN as each is consolidated.`
      );
    }
  });

  it('every entry in KNOWN_DUPLICATE_REGISTRATIONS still has >1 registering file (ratchet-down check)', () => {
    const byName = collectRegistrations();
    const stale = [];
    for (const name of KNOWN_DUPLICATE_REGISTRATIONS) {
      const files = byName.get(name);
      if (!files || files.size <= 1) {
        stale.push(name);
      }
    }
    if (stale.length > 0) {
      throw new Error(
        `${stale.length} entry/entries in KNOWN_DUPLICATE_REGISTRATIONS are stale ` +
          `(now registered in ≤1 file). Remove them from the set in the same commit ` +
          `that consolidated their registrations:\n` +
          stale.map(s => `  - "${s}"`).join('\n')
      );
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2026-05-27 — case-insensitive cross-check pass (ADR-032 sub-cluster 5).
  // Mongoose model-name registry is CASE-SENSITIVE: 'AacProfile' and 'AACProfile'
  // are two distinct cache entries, so the duplicate-name guards above don't
  // flag them. But Mongoose pluralizes both to the SAME MongoDB collection
  // name (`aacprofiles`), so two casings of one logical name = two schemas
  // writing to one collection — silent schema/data collision.
  //
  // This guard groups all registrations by `name.toLowerCase()`; any group
  // with >1 distinct casing is flagged. Either a typo (rename to canonical)
  // or a legitimate-but-divergent legacy variant (ALLOWLIST + ADR).
  // ─────────────────────────────────────────────────────────────────────────
  const KNOWN_CASE_VARIANTS = new Set([
    // 'aacprofile' — 'AacProfile' (canonical W263, models/AacProfile.js) +
    // 'AACProfile' (legacy P9/P10, rehabilitation-services/aac-therapy-protocols.js).
    // Both pluralize to the `aacprofiles` MongoDB collection. ADR-032 sub-cluster 5
    // open question Q4 — pending stakeholder behavior-equivalence audit of the
    // 13-endpoint legacy router before deletion or Pattern D rename.
    'aacprofile',
    // ─────────────────────────────────────────────────────────────────────────
    // 2026-05-27 case-variant guard initial discovery — 7 additional entries.
    // All are the same P1 bug class as 'aacprofile': two casings of one logical
    // name → same Mongo collection → silent schema collision. Each deferred to
    // ADR-032 sub-cluster 5 disposition (per-entry stakeholder decision needed).
    // ─────────────────────────────────────────────────────────────────────────
    // 'kpidefinition' — KPIDefinition (domains/dashboards/models/) vs
    //   KpiDefinition (models/KpiDefinition.js). Both → `kpidefinitions` collection.
    'kpidefinition',
    // 'aiprediction' — AiPrediction (models/AiPrediction.js) vs AIPrediction
    //   (models/organization.model.js mega-file). Both → `aipredictions` collection.
    'aiprediction',
    // 'mdtmeeting' — MdtMeeting (models/care/MdtMeeting.model.js) vs MDTMeeting
    //   (models/MDTCoordination.js + rehabilitation-services/mdt-transition-quality.js;
    //   the latter pair is already in KNOWN_DUPLICATE_REGISTRATIONS as 'MDTMeeting').
    //   Triple-collision: 3 files, 2 casings, 1 Mongo collection (`mdtmeetings`).
    'mdtmeeting',
    // 'elearningcourse' — ELearningCourse (models/ELearning/Course.js) vs
    //   ElearningCourse (models/ElearningCourse.js). Both → `elearningcourses`.
    'elearningcourse',
    // 'hrpolicy' — HRPolicy (models/HR/HRPolicy.js) vs HrPolicy (models/HR/Policy.js).
    //   Both → `hrpolicies` collection.
    'hrpolicy',
    // 'icfassessment' — ICFAssessment (models/icf/ICFAssessment.model.js canonical)
    //   vs IcfAssessment (routes/icf-assessments.routes.js inlines a local schema).
    //   Route-side inline schema is a strong Pattern D rename or delete candidate.
    'icfassessment',
    // 'zktecodevice' — ZktecoDevice (models/ZktecoDevice.js) vs ZKTecoDevice
    //   (models/zktecoDevice.model.js). Note also filename casing differs.
    //   Both → `zktecodevices` collection.
    'zktecodevice',
  ]);

  it('no model name has multiple case variants registered (silent collection-collision check)', () => {
    const byName = collectRegistrations();
    const byLower = new Map(); // Map<lowerName, Map<exactName, Set<file>>>
    for (const [name, files] of byName) {
      const lower = name.toLowerCase();
      if (!byLower.has(lower)) byLower.set(lower, new Map());
      byLower.get(lower).set(name, files);
    }

    const newCaseVariants = [];
    for (const [lower, variants] of byLower) {
      if (variants.size <= 1) continue;
      if (KNOWN_CASE_VARIANTS.has(lower)) continue;
      newCaseVariants.push({
        lower,
        variants: [...variants.entries()].map(([name, files]) => ({
          name,
          files: [...files],
        })),
      });
    }

    if (newCaseVariants.length > 0) {
      const lines = newCaseVariants
        .map(v => {
          const variantLines = v.variants
            .map(x => `      "${x.name}" in: ${x.files.join(', ')}`)
            .join('\n');
          return `  - lowercase("${v.lower}") has ${v.variants.length} distinct casings:\n${variantLines}`;
        })
        .join('\n');
      throw new Error(
        `Found ${newCaseVariants.length} model name(s) registered in multiple case variants:\n${lines}\n\n` +
          `Both casings pluralize to the SAME MongoDB collection — silent schema collision on writes.\n\n` +
          `Fix options:\n` +
          `  (a) Rename one to match the canonical (preferred when it's a typo).\n` +
          `  (b) Pattern D rename (ADR-021) when the two are genuinely different entities.\n` +
          `  (c) Delete the dormant variant if it has no production callers.\n` +
          `  (d) Add to KNOWN_CASE_VARIANTS + open an ADR (ADR-032 sub-cluster 5 precedent).`
      );
    }
  });

  it('every entry in KNOWN_CASE_VARIANTS still has >1 casing registered (ratchet-down check)', () => {
    const byName = collectRegistrations();
    const byLower = new Map();
    for (const name of byName.keys()) {
      const lower = name.toLowerCase();
      if (!byLower.has(lower)) byLower.set(lower, new Set());
      byLower.get(lower).add(name);
    }
    const stale = [];
    for (const lower of KNOWN_CASE_VARIANTS) {
      const variants = byLower.get(lower);
      if (!variants || variants.size <= 1) stale.push(lower);
    }
    if (stale.length > 0) {
      throw new Error(
        `${stale.length} entry/entries in KNOWN_CASE_VARIANTS are stale ` +
          `(now have ≤1 casing registered). Remove them from the set in the same ` +
          `commit that consolidated the variants:\n` +
          stale.map(s => `  - "${s}"`).join('\n')
      );
    }
  });
});
