'use strict';

/**
 * W1607 — family member-management is staff-only (blocks guardian self-designation of
 * isLegalGuardian). Guardians share the `authenticate` middleware (parent-portal-v1 uses
 * authenticate + requireRole('guardian')) and have a branchId, and these endpoints had no
 * requireRole — so a role:'guardian' caller could POST /members with isLegalGuardian:true to
 * self-grant legal-guardian authority (consent add/revoke). portalAccess was already stripped
 * (W1581); denyPortalRoles now refuses portal-role callers on the member write endpoints.
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'family', 'routes', 'family.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1607 family member-management staff-only', () => {
  test('denyPortalRoles refuses guardian/beneficiary/parent portal roles', () => {
    expect(CODE).toContain("PORTAL_ROLES = new Set(['guardian'");
    expect(CODE).toContain('function denyPortalRoles');
    expect(CODE).toContain('status(403)');
  });

  test('the guard is wired on POST + PUT /members', () => {
    const n = (CODE.match(/denyPortalRoles,/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
  });
});
