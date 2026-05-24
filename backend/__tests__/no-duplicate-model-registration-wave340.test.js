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

// Two patterns we count as a registration:
//   mongoose.model('Name', schema)            — direct two-arg form
//   reg('Name', schemaName)                   — helper-wrapped (Enterprise PRO/Plus convention)
//   getOrCreate('Name', schemaName)
//   registerModel('Name', schemaName)
const REGISTRATION_RE = /mongoose\.model\s*\(\s*['"]([^'"]+)['"]\s*,/g;
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
  'AuditLog', // 4× — investigate audit infrastructure consolidation
  'ApprovalRequest', // 3× — discovered W340; schemas DIVERGE significantly (rich state-machine in authorization/approvals/ vs simple legacy in models/ — first-loaded wins silently)
  'ReportTemplate', // 3×
  'WorkflowInstance', // 3× (was undercount before W340 comment-stripping fix; surfaced in re-scan)
  'Beneficiary', // 2× — canonical models/Beneficiary.js + seeder copy; was 3 pre-strip, third was a doc-comment example

  // Tier 2 — registered in 2 files (lower risk but still drift-prone)
  'Correspondence',
  'EmailTemplate',
  'WhatsAppConversation',
  'WhatsAppTemplate',
  'User', // canonical staff entity per W327
  'Branch', // canonical org node per W326
  'Department',
  'Session', // distinct from clinical session models per W324 audit
  'Vehicle',
  'LifecyclePolicy',
  'GeneratedReport',
  'Employee',
  'LeaveRequest',
  'Attendance',
  'Payroll',
  'Event',
  'BranchSetting',
  'GlobalSetting',
  'NotificationLog',
  'Consent', // canonical PDPL entity
  'DocumentAccessLog',
  'DocumentShare',
  'DocumentVersion',
  'ComplianceAlert',
  'CalendarEvent',
  'RoomBooking',
  'Warehouse',
  'JobPosting',
  'JobApplication',
  'Facility',
  'Vendor',
  'VendorEvaluation',
  'ChangeRequest',
  'StrategicInitiative',
  'FormSubmission',
  'FormTemplate',
  'GoalBank',
  'ImportExportJob',
  'MDTMeeting',
  'Student', // domain fragmentation per ADR-020 (Student vs Beneficiary)
  'NotificationPreferences',
  'Referral',
  'Task',
  'DataSubjectRequest',
  'TherapyProtocol',
  'DigitalSignature',
  'WorkflowInstance',
  'WorkflowDefinition',
]);

// Models deliberately referenced but not Mongoose-owned. Inherited from W325c
// for consistency. Currently empty for this guard's scope.
const REGISTRATION_ALLOWLIST = new Set([
  // (none — for legitimate cross-system registrations like discriminators
  //  where multiple file would register the same base name)
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
});
