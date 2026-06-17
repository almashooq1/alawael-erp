/**
 * dead-scope-axis-read-filter-wave1408.test.js — security drift guard.
 *
 * WHY (incident): W1407 adversarial audit found a CRITICAL cross-tenant PII
 * leak on the WhatsApp admin surface. `routes/whatsapp.routes.js` isolates
 * reads by `req.user.organizationId` — a field this BRANCH-scoped platform
 * NEVER sets (not in the JWT payload, not enriched by any middleware). The
 * isolation predicate is a permanent no-op that FAILS OPEN: any authenticated
 * user reads every branch's conversations. See
 * `docs/security/FINDING_W1407_WHATSAPP_CROSS_TENANT_LEAK.md` and
 * `docs/security/AUDIT_W1408_DEAD_SCOPE_AXIS.md`.
 *
 * The bug class is "dead scope axis": code relies on a `req.user.<field>`
 * tenancy field that no middleware ever populates. The canonical tenant axis
 * on this platform is `branchId` (populated by the W930 enrichment middleware
 * when `ENABLE_USER_BRANCH_ENRICH=true`), enforced via the W269 helpers
 * (`effectiveBranchScope`, `branchFilter`, `assertBranchMatch`). Any OTHER
 * axis — `organizationId`, `orgId`, `tenantId`, `companyId` — is dead.
 *
 * W269h (`no-broken-req-branchid-wave269h`) catches reads of `req.branchId`
 * (a different never-set spelling) but does NOT match these dead axes — that
 * is exactly why W1407 slipped past it. This guard closes that gap.
 *
 * HOW IT WORKS (W340 ratchet-down pattern):
 *   - Scans the route-layer source dirs for every `req.user(?.).<deadAxis>`.
 *   - Asserts the per-file occurrence map EXACTLY equals the frozen BASELINE.
 *   - A NEW occurrence (or a new file) fails CI: the author must scope by
 *     `branchId` via the W269 helpers instead, or — if the use is provably
 *     benign (e.g. stamping a vestigial field, a rate-limit bucket key) —
 *     consciously bump the baseline with a one-line classification.
 *   - A REMOVED occurrence also fails: when W1407 (or any other site) is
 *     fixed, the baseline must ratchet DOWN in the same commit. This keeps the
 *     baseline equal to source-truth and drives the leak surface toward zero.
 *
 * HOW TO FIX a failure:
 *   - Added a dead-axis read filter? Replace with the W269 pattern:
 *       const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
 *       const branchId = effectiveBranchScope(req);
 *       const filter = { ...(branchId && { branchId }) };
 *   - Fixed an existing site? Decrement / remove its BASELINE entry here.
 *   - Genuinely-benign new use? Add/bump the entry with a `// benign: <why>`.
 *
 * Static-source only (no DB, no boot). Comment-stripped before matching so a
 * dead axis named in a JSDoc block does not false-match.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');

// Route-layer dirs where `req.user.<axis>` is used to scope HTTP requests.
const SCAN_DIRS = [
  'routes',
  'domains',
  'controllers',
  'vehicles',
  'communication',
  'permissions',
  'students',
];

// Tenancy fields that NO middleware populates on this branch-scoped platform.
// `branchId` is deliberately EXCLUDED — it is the live, canonical axis.
const DEAD_AXIS_RE =
  /req\.user\s*\??\.\s*(organizationId|orgId|tenantId|companyId)\b/g;

const EXCLUDED_DIRS = new Set([
  '_archived',
  'node_modules',
  'coverage',
  '.git',
  'logs',
  'backups',
]);

/**
 * Frozen baseline as of W1408 (2026-06-17). Classification per file lives in
 * docs/security/AUDIT_W1408_DEAD_SCOPE_AXIS.md. Tiers:
 *   LIVE-LEAK  — mounted + dead-axis is the sole read-isolation predicate.
 *   DORMANT    — vehicles/index.js is never required from app.js (dead code).
 *   BENIGN     — write-stamp of a vestigial field, OR a rate-limit bucket key
 *                (fallback chain to 'global'), OR scoped alongside a real
 *                branchId via effectiveBranchScope (W1166).
 * The ratchet only cares about the COUNT; the doc carries the reasoning.
 */
const BASELINE = Object.freeze({
  // LIVE-LEAK — W1407 (filed, owner's coordinated fix pending). Burn DOWN.
  'routes/whatsapp.routes.js': 30,

  // DORMANT — vehicles/index.js never required from app.js (dead at runtime).
  // Must be fixed BEFORE any ADR-030 decision wires vehicles/ live.
  'vehicles/saudi-traffic-routes.js': 10,
  'vehicles/vehicle-routes.js': 5,
  'vehicles/saudi-vehicle-routes.js': 4,
  'vehicles/student-transport-routes.js': 4,
  'vehicles/rehabilitation-transport-routes.js': 2,

  // BENIGN — write-stamp of a vestigial field (value is null/undefined or a
  // body echo; reads are NOT filtered by it — branchId carries isolation).
  'communication/email-routes.js': 7,
  'domains/family/routes/family.routes.js': 2,
  'domains/programs/routes/programs.routes.js': 2,
  'routes/forms-catalog.routes.js': 2,
  'routes/noor.routes.js': 2,
  'domains/goals/routes/measures.routes.js': 1,
  'domains/reports/routes/reports.routes.js': 1,
  'domains/workflow/routes/workflow.routes.js': 1,
  'routes/digital-assessment.routes.js': 1,
  'routes/evidence.routes.js': 1,
  'routes/invoices-admin.routes.js': 1,
  'students/student-routes.js': 1,

  // BENIGN — service-scope arg dropped by the callee (vestigial 2nd param).
  'controllers/insurance.controller.js': 2,

  // BENIGN — rate-limit bucket key with `|| branchId || id || 'global'`
  // fallback (not a data-isolation predicate), or gov audit-scope object.
  'permissions/permission-middleware.js': 8,
  'routes/gosi-full.routes.js': 1,
  'routes/muqeem-full.routes.js': 1,
  'routes/mudad.routes.js': 2,
  'routes/nafath-signing.routes.js': 1,
  'routes/nphies-claims.routes.js': 1,
  'routes/payment-gateway.routes.js': 1,
  'routes/wasel-address.routes.js': 1,
  'routes/yakeen-verification.routes.js': 1,
});

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) out.push(full);
  }
  return out;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function scan() {
  const per = {};
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(BACKEND_ROOT, dir))) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      const matches = src.match(DEAD_AXIS_RE);
      if (matches && matches.length) {
        const rel = path.relative(BACKEND_ROOT, file).replace(/\\/g, '/');
        per[rel] = matches.length;
      }
    }
  }
  return per;
}

describe('dead scope axis read-filter guard (W1408)', () => {
  it('the dead axes are genuinely never populated on req.user', () => {
    // Root-cause anchor: middleware/auth.js builds req.user and signs the JWT.
    // If a tenant axis ever appears here, the token gained one of these fields
    // and this whole guard must be revisited (the axes would no longer be dead).
    const authSrc = fs.readFileSync(path.join(BACKEND_ROOT, 'middleware', 'auth.js'), 'utf8');
    for (const axis of ['organizationId', 'orgId', 'tenantId', 'companyId']) {
      expect(authSrc.includes(axis)).toBe(false);
    }
  });

  it('finds the scan dirs (sanity)', () => {
    expect(fs.existsSync(path.join(BACKEND_ROOT, 'routes'))).toBe(true);
    expect(walk(path.join(BACKEND_ROOT, 'routes')).length).toBeGreaterThan(100);
  });

  it('dead-axis usage exactly matches the frozen baseline (ratchet-down)', () => {
    const actual = scan();
    const actualFiles = Object.keys(actual).sort();
    const baseFiles = Object.keys(BASELINE).sort();

    // New file with a dead axis — most likely a fresh fail-open leak.
    const added = actualFiles.filter(f => !(f in BASELINE));
    // Baselined file that no longer has any dead axis — fixed; ratchet DOWN.
    const removed = baseFiles.filter(f => !(f in actual));
    // Same file, count changed (up = new use, down = partial fix).
    const changed = actualFiles
      .filter(f => f in BASELINE && actual[f] !== BASELINE[f])
      .map(f => `${f}: baseline ${BASELINE[f]} -> actual ${actual[f]}`);

    const problems = [];
    if (added.length) {
      problems.push(
        `NEW dead-axis usage in ${added.length} file(s):\n` +
          added.map(f => `  + ${f} (${actual[f]}x)`).join('\n') +
          `\n  -> Scope by branchId via effectiveBranchScope(req)/branchFilter(req),\n` +
          `     NOT req.user.organizationId|orgId|tenantId|companyId (never set).\n` +
          `     If provably benign, add the file to BASELINE with a // reason.`
      );
    }
    if (changed.length) {
      problems.push(`COUNT changed in ${changed.length} file(s):\n` + changed.map(c => `  ~ ${c}`).join('\n'));
    }
    if (removed.length) {
      problems.push(
        `FIXED (ratchet-down) — remove these from BASELINE in this commit:\n` +
          removed.map(f => `  - ${f}`).join('\n')
      );
    }
    if (problems.length) {
      throw new Error(
        `Dead-scope-axis baseline drift (W1408):\n\n${problems.join('\n\n')}\n\n` +
          `See docs/security/AUDIT_W1408_DEAD_SCOPE_AXIS.md for the classification.`
      );
    }
    expect(actual).toEqual(BASELINE);
  });

  it('the W1407 live-leak surface (whatsapp) is the largest and tracked for burn-down', () => {
    // Documents intent: whatsapp is the one LIVE exploitable instance. When the
    // owner's coordinated branchId fix lands, this count drops and the
    // ratchet-down assertion above forces the baseline update.
    expect(BASELINE['routes/whatsapp.routes.js']).toBeGreaterThanOrEqual(1);
    const maxFile = Object.entries(BASELINE).sort((a, b) => b[1] - a[1])[0][0];
    expect(maxFile).toBe('routes/whatsapp.routes.js');
  });
});
