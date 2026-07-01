'use strict';

/**
 * W1581 — family portalAccess privilege-escalation + mass-assignment.
 *
 * family.routes is branch-isolated (param-hook ownership on beneficiaryId/memberId/commId +
 * bodyScopedBeneficiaryGuard + effectiveBranchScope on lists). But addFamilyMember /
 * updateFamilyMember raw-spread req.body into the FamilyMember (validators don't whitelist),
 * so a caller could grant guardian-PORTAL ACCESS to themselves — portalAccess.enabled:true +
 * role:'full_access', or link portalAccess.userId to an arbitrary User — a privilege
 * escalation on the guardian portal, plus forge engagement metrics / soft-delete. Now both
 * strip MEMBER_SERVER_FIELDS (incl. portalAccess); communication/homework strip COMM_SERVER_FIELDS.
 * (isLegalGuardian/isPrimaryContact/status stay settable — the correct control is a role gate,
 * flagged for owner review, not stripped here.)
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'family', 'routes', 'family.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1581 family portalAccess escalation + mass-assignment', () => {
  test('member create + update strip portalAccess (blocks portal privilege escalation)', () => {
    expect(CODE).toMatch(/MEMBER_SERVER_FIELDS = \[[^\]]*'portalAccess'/);
    const n = (CODE.match(/stripFields\(req\.body, MEMBER_SERVER_FIELDS\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(CODE).not.toMatch(/addFamilyMember\(\{\s*\.\.\.req\.body/);
    expect(CODE).not.toMatch(/updateFamilyMember\(req\.params\.memberId, req\.body\)/);
  });

  test('member protected set covers computed + server fields', () => {
    for (const f of ['engagementScore', 'totalInteractions', 'isDeleted', 'branchId']) {
      expect(CODE).toMatch(new RegExp("'" + f + "'"));
    }
  });

  test('communication + homework strip server/status fields', () => {
    const n = (CODE.match(/stripFields\(req\.body, COMM_SERVER_FIELDS\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(CODE).toMatch(/COMM_SERVER_FIELDS = \[[^\]]*'status'/);
  });
});
