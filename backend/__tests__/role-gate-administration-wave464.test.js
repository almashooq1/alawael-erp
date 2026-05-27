/**
 * W464 — close privilege-escalation on administration.routes.js (34 endpoints).
 *
 * Pre-W464 routes/administration.routes.js had only:
 *   router.use(authenticate);
 *   router.use(requireBranchAccess);
 *
 * No role gate. The file exposes 34 governance endpoints mounted at
 * /api/administration + /api/v1/administration:
 *
 *   GET    /stats
 *   GET    /decisions, POST /decisions, GET /decisions/:id,
 *   PUT /decisions/:id, POST /decisions/:id/submit, .../approve,
 *   .../reject, .../publish, .../archive, .../revoke,
 *   .../acknowledge, .../comments, DELETE /decisions/:id
 *   GET    /correspondence, POST /correspondence,
 *   GET /correspondence/:id, PUT /correspondence/:id,
 *   POST /correspondence/:id/forward, .../complete, .../archive,
 *   .../follow-up, .../reply, DELETE /correspondence/:id
 *   GET    /delegations, POST /delegations (+ delegation lifecycle)
 *
 * Attack class: privilege escalation — any authenticated user
 * (therapist, nurse, teacher, parent-portal user, visitor) could:
 *
 *   - POST /decisions to plant fake executive decisions
 *   - .../approve to self-approve fake decisions
 *   - .../publish to broadcast fake decisions org-wide
 *   - .../revoke to invalidate real decisions made by leadership
 *   - POST /delegations to grant themselves authority delegations
 *   - POST /correspondence to forge outgoing letters in the
 *     organization's name
 *
 * Fix: router.use(authorize(['admin', 'super_admin', 'superadmin',
 * 'manager', 'branch_manager'])) — same role set as admin.routes.js
 * + the operational managers who legitimately file governance docs.
 */

const fs = require('fs');
const path = require('path');

describe('W464 — administration governance surface role-gate', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'administration.routes.js'),
    'utf8'
  );

  test('imports authorize from middleware/auth', () => {
    expect(src).toMatch(
      /\{\s*authenticate\s*,\s*authorize\s*\}\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\)/
    );
  });

  test('declares GOVERNANCE_ROLES constant with admin + manager set', () => {
    expect(src).toMatch(/GOVERNANCE_ROLES\s*=\s*\[/);
    expect(src).toMatch(/['"]admin['"]/);
    expect(src).toMatch(/['"]super_admin['"]/);
    expect(src).toMatch(/['"]manager['"]/);
  });

  test('router.use(authorize(GOVERNANCE_ROLES)) is wired', () => {
    expect(src).toMatch(/router\.use\(authorize\(GOVERNANCE_ROLES\)\)/);
  });

  test('role gate appears AFTER authenticate + requireBranchAccess (correct order)', () => {
    const authIdx = src.indexOf('router.use(authenticate)');
    const branchIdx = src.indexOf('router.use(requireBranchAccess)');
    const roleIdx = src.indexOf('router.use(authorize(GOVERNANCE_ROLES))');
    expect(authIdx).toBeGreaterThan(-1);
    expect(branchIdx).toBeGreaterThan(authIdx);
    expect(roleIdx).toBeGreaterThan(branchIdx);
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/administration.routes')).not.toThrow();
  });
});
