/**
 * W465 — close broken-access-control on 3 governance surfaces:
 *   dpia.routes.js, enterprise-risk.routes.js, compliance.routes.js
 *
 * Pre-W465 each file had only authenticate (+ requireBranchAccess).
 * Any authenticated user could plant fake DPIAs, modify enterprise
 * risks, or zero-out compliance metrics — all regulator-facing.
 */

const fs = require('fs');
const path = require('path');

describe('W465 — governance surface role gates', () => {
  describe('dpia.routes.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'dpia.routes.js'), 'utf8');

    test('declares DPIA_ROLES with dpo/compliance/admin', () => {
      expect(src).toMatch(/DPIA_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]dpo['"]/);
      expect(src).toMatch(/['"]compliance_officer['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(DPIA_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(DPIA_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/dpia.routes')).not.toThrow();
    });
  });

  describe('enterprise-risk.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'enterprise-risk.routes.js'),
      'utf8'
    );

    test('declares RISK_ROLES + RISK_READ_ROLES with risk_manager', () => {
      expect(src).toMatch(/RISK_ROLES\s*=\s*\[/);
      expect(src).toMatch(/RISK_READ_ROLES\s*=/);
      expect(src).toMatch(/['"]risk_manager['"]/);
    });

    test('writes gated by authorize(RISK_ROLES)', () => {
      expect(src).toMatch(/router\.post\([^)]*authorize\(RISK_ROLES\)/);
      expect(src).toMatch(/router\.put\([^)]*authorize\(RISK_ROLES\)/);
      expect(src).toMatch(/router\.delete\([^)]*authorize\(RISK_ROLES\)/);
    });

    test('reads use broader RISK_READ_ROLES', () => {
      expect(src).toMatch(/router\.get\([^)]*authorize\(RISK_READ_ROLES\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/enterprise-risk.routes')).not.toThrow();
    });
  });

  describe('compliance.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'compliance.routes.js'),
      'utf8'
    );

    test('declares COMPLIANCE_ROLES with compliance/admin/quality', () => {
      expect(src).toMatch(/COMPLIANCE_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]compliance['"]/);
      expect(src).toMatch(/['"]admin['"]/);
      expect(src).toMatch(/['"]quality['"]/);
    });

    test('router.use(authorize(COMPLIANCE_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(COMPLIANCE_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/compliance.routes')).not.toThrow();
    });
  });
});
