/**
 * untenanted-aggregations-ratchet-wave944.test.js — C3 ratchet guard
 *
 * WHY (AUTHZ_REMEDIATION_BACKLOG C3): ~710 inline {branchId} filters bypass the
 * canonical helpers, and many `.aggregate()` / raw `db.collection()` calls run
 * with NO branch $match — the C3a cross-branch-leak class (tenantScope plugin is
 * dormant, so an unscoped aggregate sees every branch). The audit
 * `scripts/audit-untenanted-aggregations.js` measures this but is INFORMATIONAL
 * ONLY (exit 0 always) — nothing fails CI when a NEW unscoped aggregate lands.
 *
 * This guard promotes the audit to a ratchet (no behavior change — it edits no
 * route/service code):
 *   - rawCollectionSites <= 68 (TIGHT) — raw `db.collection(...).aggregate()`
 *     bypasses Mongoose entirely (tenantScope-blind, the C3a leak vector). This
 *     count is the highest-severity, lowest-churn metric → pinned. A NEW raw-
 *     driver aggregate fails CI.
 *   - untenantedCandidateSites <= 820 (BUFFERED) — the broad candidate surface is
 *     765 today across a fast-moving tree; a tight pin would flake on unrelated
 *     churn, so this is a flood-cap (catches a large regression, not +1/+2). Pull
 *     it DOWN as the W340 ratchet chips the surface.
 * The 7 confirmed real leaks (crisis / medicalEquipment / strategicPlanning
 * routes) + the 765-candidate ratchet-down are the behavior-changing remediation
 * (separate, per-site reviewed).
 *
 * Shells out to the existing audit (cwd-independent), no DB/boot.
 */

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const AUDIT = path.join(BACKEND_ROOT, 'scripts', 'audit-untenanted-aggregations.js');

// Baseline captured 2026-06-05: { rawCollectionSites: 68, untenantedCandidateSites: 765 }.
// W1376 ratchet 68→69 (2026-06-16): the new site is services/launchReadiness.service.js's
// `countSafe(coll)` — a deliberately PLATFORM-WIDE ops readiness probe (W1375). It answers
// "is the system's seed/reference data ready to launch?" and MUST see all branches; tenant-
// scoping it would be semantically wrong. Verified not a tenant-data-leak vector before
// ratcheting (it counts config/reference collections, returns counts only, never rows).
const MAX_RAW_COLLECTION_SITES = 69; // tight — fail on any NEW raw-driver aggregate
const MAX_UNTENANTED_CANDIDATES = 820; // buffered flood-cap (765 + headroom for churn)

function runAudit() {
  const out = execFileSync(process.execPath, [AUDIT, '--json'], {
    encoding: 'utf8',
    cwd: BACKEND_ROOT,
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out);
}

describe('C3 — untenanted-aggregations surface does not grow (ratchet)', () => {
  let report;
  beforeAll(() => {
    report = runAudit();
  }, 30000);

  it('the audit runs and returns the expected shape (smoke)', () => {
    expect(typeof report.totalAggregateSites).toBe('number');
    expect(report.totalAggregateSites).toBeGreaterThan(100);
    expect(typeof report.rawCollectionSites).toBe('number');
    expect(typeof report.untenantedCandidateSites).toBe('number');
  });

  it('NO new raw db.collection() aggregate leaks (tenantScope-blind) — pinned at 69', () => {
    expect(report.rawCollectionSites).toBeLessThanOrEqual(MAX_RAW_COLLECTION_SITES);
  });

  it('the untenanted-aggregate candidate surface does not flood (buffered ceiling)', () => {
    expect(report.untenantedCandidateSites).toBeLessThanOrEqual(MAX_UNTENANTED_CANDIDATES);
  });
});
