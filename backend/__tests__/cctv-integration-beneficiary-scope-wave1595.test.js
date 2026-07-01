/**
 * cctv-integration-beneficiary-scope-wave1595.test.js
 * ════════════════════════════════════════════════════════════════════
 * W1595 — static drift guard for beneficiary-scoped CCTV integration reads.
 *
 * This center films disabled CHILDREN. The CCTV integration dashboard exposes
 * two beneficiary-keyed endpoints that return per-child PHI derived from the
 * cameras:
 *   GET /face-recognition?beneficiaryId=…  — face-recognition sightings
 *   GET /attendance?beneficiaryId=…        — attendance derived from CCTV
 *
 * The camera-keyed reads were branch-isolated in W1578/W1585 (they key on
 * `branchCode`). These two are keyed by BENEFICIARY, and Beneficiary keys on
 * `branchId` — so the correct guard is the beneficiary-branch helper
 * `assertBeneficiaryInScope(req, beneficiaryId, res)` (throws 403/404 via res),
 * NOT the branchCode camera resolver.
 *
 * A restricted caller must not read another branch's child face-recognition /
 * attendance data by passing a foreign `beneficiaryId`. This guard asserts the
 * source keeps both handlers gated so the check can't silently regress.
 *
 * Static-only (reads source text); NOT enumerated in sprint-tests.txt.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(
  __dirname,
  '..',
  'routes',
  'cctv',
  'cctv-integration.routes.js'
);

describe('W1595 — CCTV integration beneficiary-scoped reads', () => {
  const src = fs.readFileSync(ROUTE_FILE, 'utf8');

  it('imports the beneficiary-branch scope helper', () => {
    expect(src).toMatch(
      /const\s*\{\s*assertBeneficiaryInScope\s*\}\s*=\s*require\(\s*['"][^'"]*assertBranchMatch['"]\s*\)/
    );
  });

  it('still applies authenticateToken + requireBranchAccess at router level', () => {
    expect(src).toMatch(/router\.use\(\s*authenticateToken\s*\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  // Extract each handler body to assert the guard is present inside it.
  function handlerBody(routePath) {
    // matches: router.get('/route', requireRole(ROLES), async (req, res) => { … });
    const re = new RegExp(
      "router\\.get\\(\\s*['\"]" +
        routePath.replace(/[/]/g, '\\/') +
        "['\"][\\s\\S]*?\\n\\}\\);",
      'm'
    );
    const m = src.match(re);
    return m ? m[0] : '';
  }

  it.each([['/face-recognition'], ['/attendance']])(
    'GET %s guards the beneficiaryId query with assertBeneficiaryInScope',
    (route) => {
      const body = handlerBody(route);
      expect(body).not.toBe('');
      // beneficiaryId is present AND the guard is called on it, returning early.
      expect(body).toMatch(/req\.query\.beneficiaryId/);
      expect(body).toMatch(
        /assertBeneficiaryInScope\(\s*req,\s*req\.query\.beneficiaryId,\s*res\s*\)/
      );
      // The guard result must short-circuit the handler (return before the read).
      expect(body).toMatch(
        /if\s*\(\s*req\.query\.beneficiaryId\s*&&[\s\S]*?assertBeneficiaryInScope[\s\S]*?\)\s*\{\s*return/
      );
    }
  );

  it('both handlers remain role-gated', () => {
    for (const route of ['/face-recognition', '/attendance']) {
      const body = handlerBody(route);
      expect(body).toMatch(/requireRole\(\s*ROLES\s*\)/);
    }
  });
});
