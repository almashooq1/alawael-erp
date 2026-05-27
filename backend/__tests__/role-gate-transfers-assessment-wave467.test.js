/**
 * W467 — close broken-access-control on beneficiary-transfers + disability-assessment.
 *
 * Continuation of W464-W466.
 *
 *   routes/beneficiary-transfers.routes.js (6 endpoints): Pre-W467
 *     any authenticated user could move ANY beneficiary across
 *     branches via POST /api/beneficiaries/:id/transfer, self-approve
 *     their own transfers, or reject legitimate transfers initiated
 *     by management. Cross-tenant data exfil via transfer (move
 *     beneficiary to attacker-controlled branch, then have full
 *     access to their PHI).
 *
 *   routes/disability-assessment.routes.js (15 endpoints): Pre-W467
 *     any authenticated user could plant fake scale results or test
 *     results in a beneficiary's chart. Assessment scores drive
 *     clinical care decisions (severity classification, accommodation
 *     plans, support level). Falsified scores misdirect treatment.
 *
 * Fix:
 *   beneficiary-transfers: TRANSFER_ROLES = admin/manager/social_worker/case_manager
 *   disability-assessment: DISABILITY_ASSESSMENT_ROLES = clinical only
 */

const fs = require('fs');
const path = require('path');

describe('W467 — role gate on beneficiary-transfers + disability-assessment', () => {
  describe('beneficiary-transfers.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'beneficiary-transfers.routes.js'),
      'utf8'
    );

    test('declares TRANSFER_ROLES with manager/social_worker/admin', () => {
      expect(src).toMatch(/TRANSFER_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]manager['"]/);
      expect(src).toMatch(/['"]social_worker['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(TRANSFER_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(TRANSFER_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/beneficiary-transfers.routes')).not.toThrow();
    });
  });

  describe('disability-assessment.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'disability-assessment.routes.js'),
      'utf8'
    );

    test('declares DISABILITY_ASSESSMENT_ROLES with clinical roles', () => {
      expect(src).toMatch(/DISABILITY_ASSESSMENT_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]physician['"]/);
      expect(src).toMatch(/['"]therapist['"]/);
      expect(src).toMatch(/['"]psychologist['"]/);
      expect(src).toMatch(/['"]clinical_supervisor['"]/);
    });

    test('router.use(authorize(DISABILITY_ASSESSMENT_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(DISABILITY_ASSESSMENT_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/disability-assessment.routes')).not.toThrow();
    });
  });
});
