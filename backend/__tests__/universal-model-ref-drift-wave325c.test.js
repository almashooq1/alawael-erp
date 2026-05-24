'use strict';

/**
 * W325 Pass 3 universal phantom-ref drift guard.
 *
 * Extension of the W324 audit pattern from one field (beneficiaryId) to ALL
 * Mongoose `ref:` declarations across the codebase. Catches the same bug
 * class as W324 (5 × 'BeneficiaryProfile' + 1 × 'Patient' targeted models
 * that were never registered → silent populate() returning null) but for
 * every field, not just beneficiaryId.
 *
 * Algorithm:
 *   1. Scan backend/models/**\/*.js + backend/domains/**\/*.js for all
 *      `mongoose.model('Name', schema, ...)` REGISTRATIONS (two-arg form,
 *      schema as second positional indicates registration vs lookup).
 *   2. Scan the SAME source set for every `ref: 'Name'` declaration.
 *   3. Assert: every ref target exists in the registration set, OR is in
 *      ALLOWLIST (for legitimate external / cross-system refs).
 *
 * Static analysis only — does NOT load mongoose (which is mocked under
 * backend/jest.setup.js).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const BACKEND_ROOT = path.join(__dirname, '..');

// Refs only live inside Mongoose schema definitions — scan models + domains.
const REF_ROOTS = [path.join(BACKEND_ROOT, 'models'), path.join(BACKEND_ROOT, 'domains')];

// Registrations can live anywhere in backend/ (we've seen them in models/,
// domains/, workflow/, services/, database/seeders/). Scan all of backend/
// except __tests__, node_modules, scripts (CLI helpers).
const REGISTRATION_ROOT = BACKEND_ROOT;
const REGISTRATION_SKIP_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'tests',
  'node_modules',
  '.jest-cache',
  'coverage',
]);

// Models deliberately referenced but not Mongoose-owned (pseudo-refs in
// documentation, external/system refs). Add with one-line // justification.
const REF_ALLOWLIST = new Set([
  'MeasurementType.targetDisabilities', // pseudo-ref for documentation inside MeasurementMaster
  // W335 — Driver.employer refs 'Company': drivers may be employed by external transport
  // companies (third-party operators). Not a Mongoose-owned entity; deliberate external ref.
  'Company',
]);

// ─── Baseline ratchet: phantom refs that EXIST as of W325 Pass 3 ────────────
// Each is a real bug from the W324 class (ref pointing to a model that was
// never registered with mongoose.model — populate() silently returns null).
// Total: 58 occurrences across 26 unique targets, snapshot 2026-05-24.
//
// CONTRACT: NEVER add a new entry to this set. NEW phantoms must be fixed at
// source (change the ref to the canonical registered model, OR register the
// missing model). Existing entries get REMOVED as their owners are fixed in
// future waves (one entry per wave is a reasonable pace).
//
// Remaining top fix candidates after W326+W327+W328:
//   CapaItem (4×)     → investigate quality/ models for the canonical name
//   Class (2×)        → smart-attendance domain, investigate
//
// Ratchet-DOWN history (newest first):
//   W327+W328 (commit pending) — 'Admin' (8×) + 'AdminUser' (4×) + 'Patient' (1×) all → canonical:
//     'Admin'      → 'User' across 8 smart-attendance models (verifiedBy/registeredBy/generatedBy/reviewedBy fields)
//     'AdminUser'  → 'User' across 3 transport models (recordedBy/approvedBy/assignedTo fields)
//     'Patient'    → 'Beneficiary' in ResourceBooking.js (mirrors W324's CommunityReferral fix exactly)
//   W326 — 'Center' (10×) → 'Branch' fixed across crisis.model.js + laundry.model.js + kitchen.model.js
const KNOWN_PHANTOM_BASELINE_W325C = new Set([
  // Quality-domain refs to a DEFERRED (planned but not-yet-built) model.
  // Investigation 2026-05-24: predictiveRisk.service.js:191 uses
  // `tryRequire('../../models/CapaItem')` for graceful degradation, and all 4
  // `linkedCapaId` fields (Audit/FMEA×2/RCA) default null. The CAPA workflow
  // exists conceptually but the entity has not been formalized as a Mongoose
  // model yet. Stay in baseline; remove when CapaItem.js is added to models/.
  'CapaItem', // 4× — DEFERRED model; tryRequire + null-default = no runtime breakage
  // ── W334 SCANNER FIX ────────────────────────────────────────────────────────
  // Previously listed as "Enterprise-Pro speculative refs" but were ALL real,
  // registered models — the W325c REGISTRATION_RE only matched the direct
  // `mongoose.model('X', schema)` form, missing helper-wrapped registrations
  // used by EnterprisePro.js (`reg('X', schema)`) and EnterpriseProPlus.js
  // (`getOrCreate('X', schema)`). Scanner extended to detect both wrappers via
  // HELPER_REGISTRATION_RE; 10 entries pruned in one go:
  //   WarehouseBin (3×) ProjectPro (3×) ProjectTask (3×) CRMContact (2×)
  //   CRMPipeline (1×) CRMDeal (1×) Candidate (1×) ITAsset (1×)
  //   StrategicObjective (2×) ComplianceChecklist (1×)
  // ───────────────────────────────────────────────────────────────────────────
  // 'Company' moved to REF_ALLOWLIST (W335 — external 3rd-party transport employer, deliberate)
  // ── W335 RATCHET-DOWN ──────────────────────────────────────────────────────
  // 'Attachment' (2×) → 'Document' across FinancialJournalEntry + RiskAssessment
  // 'Class'      (2×) → 'Classroom' across smart-attendance/AttendanceViaCamera + SmartAttendanceRecord
  // 'Folder'           → 'FileFolder' in Document.parentFolderId
  //   (existing models/documents/FileFolder.js was the canonical; rename only)
  // 'SatisfactionSurvey' → 'RehabCenterSatisfactionSurvey' in rehab-center/survey-response.model.js
  //   (canonical was registered with the RehabCenter prefix at quality/SatisfactionSurvey.model.js
  //    no — actually registered as RehabCenterSatisfactionSurvey at rehab-center/satisfaction-survey.model.js:66)
  // 'SurveyTemplate' → 'FamilySurveyTemplate' in familySatisfaction.models.js
  //   (canonical lives in the same file at line 292; renamed in the response ref)
  // ──────────────────────────────────────────────────────────────────────────
  // 'Counselor' — RATCHET-DOWN W333: fixed to 'User' (counselor is a staff role, not entity).
  'Violation', // 1× — investigate
  'ComplianceControl', // 1× — only registered in supply-chain-management/ sub-project (out of backend/ scope)
  'DisabilityRehabilitation', // 1× — investigate rehab-center model alternatives
  'SupportTicket', // 1× — never-built; UserSubscription.supportTickets[] design decision pending
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

// `mongoose.model('Name', schema, ...)` — two-arg form indicates REGISTRATION.
// Single-arg `mongoose.model('Name')` is a LOOKUP (used by 100+ services).
const REGISTRATION_RE = /mongoose\.model\s*\(\s*['"]([^'"]+)['"]\s*,/g;
// Helper-wrapped registrations used by Enterprise vertical files
// (EnterprisePro.js uses `reg(name, schema)`; EnterpriseProPlus.js uses
// `getOrCreate(name, schema)` — both wrap `mongoose.models[name] || mongoose.model(name, schema)`).
// The `\w+Schema\b` second-arg qualifier prevents false positives on arbitrary 2-arg helpers.
const HELPER_REGISTRATION_RE =
  /\b(?:reg|getOrCreate|registerModel|ensureModel|defineModel)\s*\(\s*['"]([^'"]+)['"]\s*,\s*\w+Schema\b/g;
const REF_RE = /\bref\s*:\s*['"]([^'"]+)['"]/g;

function collectRegistrations() {
  const files = walkJs(REGISTRATION_ROOT, REGISTRATION_SKIP_DIRS);
  const set = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(REGISTRATION_RE)) set.add(m[1]);
    for (const m of src.matchAll(HELPER_REGISTRATION_RE)) set.add(m[1]);
  }
  return set;
}

function collectRefs() {
  const refs = []; // [{ file, ref }]
  for (const root of REF_ROOTS) {
    for (const f of walkJs(root)) {
      const src = fs.readFileSync(f, 'utf8');
      const rel = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
      for (const m of src.matchAll(REF_RE)) refs.push({ file: rel, ref: m[1] });
    }
  }
  return refs;
}

describe('W325 Pass 3 universal phantom-ref drift guard', () => {
  it('every Mongoose `ref:` target MUST resolve to a registered model (or be allow-listed)', () => {
    const registrations = collectRegistrations();
    expect(registrations.size).toBeGreaterThan(100); // sanity floor — codebase has 200+ registered models

    const refs = collectRefs();
    expect(refs.length).toBeGreaterThan(100); // sanity floor — codebase has hundreds of refs

    const newPhantoms = [];
    for (const { file, ref } of refs) {
      if (registrations.has(ref)) continue;
      if (REF_ALLOWLIST.has(ref)) continue;
      if (KNOWN_PHANTOM_BASELINE_W325C.has(ref)) continue; // tolerated tech debt
      newPhantoms.push({ file, ref });
    }

    if (newPhantoms.length > 0) {
      const byTarget = new Map();
      for (const v of newPhantoms) {
        if (!byTarget.has(v.ref)) byTarget.set(v.ref, []);
        byTarget.get(v.ref).push(v.file);
      }
      const lines = [];
      for (const [target, callers] of byTarget) {
        lines.push(`  - "${target}" referenced by ${callers.length} file(s):`);
        for (const c of callers.slice(0, 5)) lines.push(`      ${c}`);
        if (callers.length > 5) lines.push(`      ... and ${callers.length - 5} more`);
      }
      throw new Error(
        `Found ${newPhantoms.length} NEW Mongoose ref(s) pointing to unregistered model(s):\n` +
          lines.join('\n') +
          `\n\nFix options:\n` +
          `  (a) Change the ref to the canonical registered model name.\n` +
          `  (b) Register the missing model with mongoose.model('Name', schema).\n` +
          `  (c) Add the target to REF_ALLOWLIST in this test with a one-line justification ` +
          `(only if it's a deliberate external/cross-system ref).\n\n` +
          `Do NOT add to KNOWN_PHANTOM_BASELINE_W325C — that set is frozen and ratchets DOWN ` +
          `as existing entries are fixed.`
      );
    }
  });

  it('every entry in KNOWN_PHANTOM_BASELINE_W325C MUST still exist as a real phantom (ratchet-down check)', () => {
    // When a wave fixes a phantom, its caller must also remove it from the
    // baseline set in the same commit. This test catches stale entries — i.e.
    // names that are no longer referenced anywhere (fixed but not pruned).
    const registrations = collectRegistrations();
    const refs = collectRefs();
    const referencedSet = new Set(refs.map(r => r.ref));

    const stale = [];
    for (const name of KNOWN_PHANTOM_BASELINE_W325C) {
      // Stale if either: (a) no longer referenced, or (b) now registered.
      if (!referencedSet.has(name) || registrations.has(name)) {
        stale.push(name);
      }
    }

    if (stale.length > 0) {
      throw new Error(
        `${stale.length} entry/entries in KNOWN_PHANTOM_BASELINE_W325C are stale ` +
          `(fixed or never referenced). Remove them from the baseline set:\n` +
          stale.map(s => `  - "${s}"`).join('\n')
      );
    }
  });
});
