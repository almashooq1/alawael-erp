/**
 * W466 — close broken-access-control on EMR (PHI) + crisis surfaces.
 *
 * Continuation of W464/W465. Two more high-impact surfaces had no
 * role check:
 *
 *   routes/emr.routes.js  (26 endpoints) — Electronic Medical Records:
 *     MedicalRecord / VitalSign / LabResult / ClinicalNote / Allergy
 *     CRUD. Any authenticated user could read every patient's PHI,
 *     plant clinical notes in someone's chart, insert fake lab
 *     results, or modify allergies (which could KILL a patient if
 *     the wrong med gets administered as a result).
 *
 *   routes/crisis.routes.js  (22 endpoints) — Crisis/Emergency:
 *     EmergencyPlan / CrisisIncident / EmergencyDrill /
 *     EmergencyContact CRUD. Any authenticated user could plant
 *     fake emergency procedures, redirect the contact tree to wrong
 *     recipients, or rewrite an emergency plan to push staff toward
 *     the wrong evacuation route during an ACTUAL emergency.
 *
 * Fix:
 *   emr.routes.js:    EMR_ROLES = clinical only (physician, nurse,
 *                     therapist, clinical_supervisor, admin)
 *   crisis.routes.js: CRISIS_ROLES = safety/ops only (safety_officer,
 *                     safeguarding_lead, manager, admin)
 *
 * Both apply via `router.use(authorize(<ROLES>))` at module top so
 * EVERY endpoint inherits the gate uniformly.
 */

const fs = require('fs');
const path = require('path');

describe('W466 — EMR + crisis surface role gates', () => {
  describe('emr.routes.js (PHI)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'emr.routes.js'), 'utf8');

    test('imports authorize + declares EMR_ROLES with clinical-only set', () => {
      expect(src).toMatch(/authorize/);
      expect(src).toMatch(/EMR_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]physician['"]/);
      expect(src).toMatch(/['"]nurse['"]/);
      expect(src).toMatch(/['"]clinical_supervisor['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(EMR_ROLES)) wired after authenticate', () => {
      expect(src).toMatch(/router\.use\(authorize\(EMR_ROLES\)\)/);
      // Order: authenticate → branchAccess → authorize
      const authIdx = src.indexOf('router.use(authenticate)');
      const roleIdx = src.indexOf('router.use(authorize(EMR_ROLES))');
      expect(authIdx).toBeGreaterThan(-1);
      expect(roleIdx).toBeGreaterThan(authIdx);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/emr.routes')).not.toThrow();
    });
  });

  describe('crisis.routes.js (life-safety)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'crisis.routes.js'), 'utf8');

    test('imports authorize + declares CRISIS_ROLES with safety/ops set', () => {
      expect(src).toMatch(/authorize/);
      expect(src).toMatch(/CRISIS_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]safety_officer['"]/);
      expect(src).toMatch(/['"]safeguarding_lead['"]/);
      expect(src).toMatch(/['"]manager['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(CRISIS_ROLES)) wired after authenticate', () => {
      expect(src).toMatch(/router\.use\(authorize\(CRISIS_ROLES\)\)/);
      const authIdx = src.indexOf('router.use(authenticate)');
      const roleIdx = src.indexOf('router.use(authorize(CRISIS_ROLES))');
      expect(authIdx).toBeGreaterThan(-1);
      expect(roleIdx).toBeGreaterThan(authIdx);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/crisis.routes')).not.toThrow();
    });
  });
});
