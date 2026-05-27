/**
 * W469 — close broken-access-control on biometric-attendance + appointmentScheduling.
 *
 *   biometric-attendance.routes.js (17 endpoints): pre-W469 any
 *     authenticated user could read/modify ZKTeco device configs,
 *     biometric enrollment data, attendance logs, AttendancePolicy,
 *     OvertimeRequest. Biometric data (face/fingerprint templates)
 *     is non-revocable lifelong PII — PDPL Article 6 special-category.
 *     Restrict to HR + admin tier.
 *
 *   appointmentScheduling.routes.js (19 endpoints): pre-W469 any
 *     authenticated user could create/modify/delete schedule templates,
 *     time slots, reminders, and waitlist entries — affecting every
 *     clinician's calendar org-wide. Restrict to scheduling/clinical/
 *     reception/admin roles.
 *
 * Fix: router.use(authorize(<ROLES>)) at module top in both.
 */

const fs = require('fs');
const path = require('path');

describe('W469 — biometric-attendance + appointmentScheduling role gates', () => {
  describe('biometric-attendance.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'biometric-attendance.routes.js'),
      'utf8'
    );

    test('declares BIOMETRIC_ROLES with HR + admin tier', () => {
      expect(src).toMatch(/BIOMETRIC_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]hr['"]/);
      expect(src).toMatch(/['"]hr_manager['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(BIOMETRIC_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(BIOMETRIC_ROLES\)\)/);
    });

    test('role gate wired after authenticate + requireBranchAccess', () => {
      const authIdx = src.indexOf('router.use(authenticate)');
      const roleIdx = src.indexOf('router.use(authorize(BIOMETRIC_ROLES))');
      expect(authIdx).toBeGreaterThan(-1);
      expect(roleIdx).toBeGreaterThan(authIdx);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/biometric-attendance.routes')).not.toThrow();
    });
  });

  describe('appointmentScheduling.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'appointmentScheduling.routes.js'),
      'utf8'
    );

    test('declares SCHEDULING_ROLES with clinical + reception', () => {
      expect(src).toMatch(/SCHEDULING_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]receptionist['"]/);
      expect(src).toMatch(/['"]scheduler['"]/);
      expect(src).toMatch(/['"]therapist['"]/);
      expect(src).toMatch(/['"]physician['"]/);
    });

    test('router.use(authorize(SCHEDULING_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(SCHEDULING_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/appointmentScheduling.routes')).not.toThrow();
    });
  });
});
