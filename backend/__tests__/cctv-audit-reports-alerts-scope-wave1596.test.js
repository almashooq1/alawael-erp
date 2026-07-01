/**
 * cctv-audit-reports-alerts-scope-wave1596.test.js
 * ════════════════════════════════════════════════════════════════════
 * W1596 — static drift guard for the last three CCTV read/authZ surfaces.
 *
 * This center films disabled CHILDREN. Three CCTV routers still trusted an
 * unverified `?branchCode=` (or a never-populated `req.user.branchCode`) or
 * spread `...req.body` into the access-grant authZ primitive:
 *
 *   reports.routes.js — plates/visitors/ai-overview scoped only by
 *     `req.query.branchCode || req.user?.branchCode` → any authed caller could
 *     read another branch's child camera analytics. Fixed: requireBranchAccess
 *     + resolver-forced caller branchCode (branchCodeOf) / branchId (branchIdOf).
 *
 *   alerts.routes.js — `GET /` list scoped the same way, and the `:id`
 *     acknowledge/resolve/escalate mutations had NO branch check → a restricted
 *     caller could act on another branch's child-camera alerts. Fixed:
 *     requireBranchAccess + caller-branch list scope + assertAlertBranch on :id.
 *
 *   audit.routes.js — `POST /grants` did `CctvAccessGrant.create({ ...req.body })`,
 *     letting an issuer set arbitrary grant fields (grantedTo / scope /
 *     allowDownload / validUntil …). Fixed: field whitelist + scope.branchCode
 *     pinned to the issuer's own branch when restricted.
 *
 * Static-only (reads source text); NOT enumerated in sprint-tests.txt.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'routes', 'cctv');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

describe('W1596 — CCTV reports/alerts/audit branch scope + grant whitelist', () => {
  describe('reports.routes.js', () => {
    const src = read('reports.routes.js');

    it('applies requireBranchAccess at the router level', () => {
      expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
      expect(src).toMatch(
        /requireBranchAccess\s*\}\s*=\s*require\([^)]*branchScope\.middleware/
      );
    });

    it('resolves the caller branch code via the CCTV resolver', () => {
      expect(src).toMatch(
        /callerCctvBranchCode\s*\}\s*=\s*require\([^)]*cctvBranchScope/
      );
      expect(src).toMatch(/async function branchCodeOf\(req\)/);
      expect(src).toMatch(/await callerCctvBranchCode\(req\)/);
    });

    it('no longer trusts the never-populated req.user.branchCode as scope', () => {
      // The old `req.query.branchCode || req.user?.branchCode` fallback is gone
      // from the branchCode helper; the helper leads with the resolved code.
      expect(src).not.toMatch(/req\.query\.branchCode\s*\|\|\s*req\.user\?\.branchCode/);
    });

    it('branchCode-keyed reports await the scoped helper', () => {
      // plates / plates/:plate / visitors / ai-overview
      const count = (src.match(/branchCode:\s*await branchCodeOf\(req\)/g) || []).length;
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  describe('alerts.routes.js', () => {
    const src = read('alerts.routes.js');

    it('applies requireBranchAccess + imports the alert model and resolver', () => {
      expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
      expect(src).toMatch(/CctvAlert\s*\}\s*=\s*require\([^)]*models\/cctv/);
      expect(src).toMatch(/callerCctvBranchCode\s*,\s*branchCodeVisible/);
    });

    it('scopes the list to the caller branch (not req.user.branchCode)', () => {
      expect(src).not.toMatch(/req\.query\.branchCode\s*\|\|\s*req\.user\?\.branchCode/);
      expect(src).toMatch(/listOpen\(\s*callerCode\s*\|\|\s*req\.query\.branchCode/);
    });

    it('asserts the target alert branch on every :id mutation', () => {
      expect(src).toMatch(/async function assertAlertBranch\(req, res, alertId\)/);
      expect(src).toMatch(/branchCodeVisible\(callerCode, doc\.branchCode\)/);
      // three mutation handlers each guard before mutating
      const guards = (src.match(/await assertAlertBranch\(req, res, req\.params\.id\)/g) || [])
        .length;
      expect(guards).toBe(3);
    });
  });

  describe('audit.routes.js', () => {
    const src = read('audit.routes.js');

    it('no longer spreads req.body into the grant create', () => {
      expect(src).not.toMatch(/CctvAccessGrant\.create\(\s*\{\s*\.\.\.req\.body/);
    });

    it('whitelists grant-creatable fields', () => {
      expect(src).toMatch(/GRANT_CREATABLE\s*=\s*\[/);
      for (const f of ['grantType', 'grantedTo', 'scope', 'allowDownload', 'validUntil']) {
        expect(src).toMatch(new RegExp(`'${f}'`));
      }
      expect(src).toMatch(/for \(const k of GRANT_CREATABLE\)/);
    });

    it('pins grant scope.branchCode to the issuer branch when restricted', () => {
      expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
      expect(src).toMatch(/const callerCode = await callerCctvBranchCode\(req\)/);
      expect(src).toMatch(/payload\.scope = \{\s*\.\.\.\(payload\.scope \|\| \{\}\),\s*branchCode: callerCode/);
    });
  });
});
