/**
 * W468 — close broken-access-control on bi-dashboard + aac.
 *
 *   routes/bi-dashboard.routes.js (17 endpoints): pre-W468 any
 *     authenticated user could read executive financial KPIs,
 *     cross-branch performance, HR analytics, retention churn data,
 *     and other strategic intel. BI dashboards aggregate sensitive
 *     operational + financial data not meant for clinical/operational
 *     staff. Restrict to executive + analyst tier.
 *
 *   routes/aac.routes.js (9 endpoints): pre-W468 any authenticated
 *     user could create/modify/delete AAC (Augmentative & Alternative
 *     Communication) therapy profiles. Clinical PHI — speech therapy
 *     planning data. Restrict to SLPs + therapists + clinical leadership.
 */

const fs = require('fs');
const path = require('path');

describe('W468 — bi-dashboard + aac role gates', () => {
  describe('bi-dashboard.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'bi-dashboard.routes.js'),
      'utf8'
    );

    test('declares BI_DASHBOARD_ROLES with executive + analyst tier', () => {
      expect(src).toMatch(/BI_DASHBOARD_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]analyst['"]/);
      expect(src).toMatch(/['"]finance['"]/);
      expect(src).toMatch(/['"]hr_manager['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(BI_DASHBOARD_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(BI_DASHBOARD_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/bi-dashboard.routes')).not.toThrow();
    });
  });

  describe('aac.routes.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'aac.routes.js'), 'utf8');

    test('declares AAC_ROLES with SLP + therapist + clinical leadership', () => {
      expect(src).toMatch(/AAC_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]speech_language_pathologist['"]/);
      expect(src).toMatch(/['"]therapist['"]/);
      expect(src).toMatch(/['"]clinical_supervisor['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(AAC_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(AAC_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/aac.routes')).not.toThrow();
    });
  });
});
