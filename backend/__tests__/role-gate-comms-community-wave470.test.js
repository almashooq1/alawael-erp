/**
 * W470 — close broken-access-control on communication-module + community-service.
 *
 *   communication-module.routes.js (24 endpoints): pre-W470 any
 *     authenticated user (including parent-portal users + external
 *     visitors with valid tokens) could POST /announcements +
 *     /:id/publish to plant org-wide announcements, PUT to alter
 *     real announcements, DELETE /contacts/:id to wipe directory
 *     entries. Two-tier fix: broad gate excludes parents/visitors
 *     from the entire internal-comms surface; per-route stricter
 *     gate on announcement writes (publish power = manager+).
 *
 *   community-service.routes.js (25 endpoints): pre-W470 any
 *     authenticated user could create/modify/delete CommunityProgram +
 *     CommunityEvent + CsoPartnership records (org-level community
 *     commitments). Restrict to community-lead/volunteer-coordinator/
 *     social_worker/PR/admin tier.
 */

const fs = require('fs');
const path = require('path');

describe('W470 — communication-module + community-service role gates', () => {
  describe('communication-module.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'communication-module.routes.js'),
      'utf8'
    );

    test('declares INTERNAL_COMMS_ROLES with broad internal staff set', () => {
      expect(src).toMatch(/INTERNAL_COMMS_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]therapist['"]/);
      expect(src).toMatch(/['"]nurse['"]/);
      expect(src).toMatch(/['"]hr['"]/);
    });

    test('declares ANNOUNCEMENT_WRITE_ROLES (manager+ for publish power)', () => {
      expect(src).toMatch(/ANNOUNCEMENT_WRITE_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]manager['"]/);
      expect(src).toMatch(/['"]hr_manager['"]/);
    });

    test('router.use(authorize(INTERNAL_COMMS_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(INTERNAL_COMMS_ROLES\)\)/);
    });

    test('announcement write ops gated by ANNOUNCEMENT_WRITE_ROLES', () => {
      // POST /announcements
      expect(src).toMatch(
        /router\.post\(['"]\/announcements['"],\s*authorize\(ANNOUNCEMENT_WRITE_ROLES\)/
      );
      // PUT /announcements/:id
      expect(src).toMatch(
        /router\.put\(['"]\/announcements\/:id['"],\s*authorize\(ANNOUNCEMENT_WRITE_ROLES\)/
      );
      // POST /announcements/:id/publish
      expect(src).toMatch(
        /router\.post\(['"]\/announcements\/:id\/publish['"],\s*authorize\(ANNOUNCEMENT_WRITE_ROLES\)/
      );
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/communication-module.routes')).not.toThrow();
    });
  });

  describe('community-service.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'community-service.routes.js'),
      'utf8'
    );

    test('declares COMMUNITY_ROLES with community/volunteer/admin set', () => {
      expect(src).toMatch(/COMMUNITY_ROLES\s*=\s*\[/);
      expect(src).toMatch(/['"]community_lead['"]/);
      expect(src).toMatch(/['"]volunteer_coordinator['"]/);
      expect(src).toMatch(/['"]social_worker['"]/);
      expect(src).toMatch(/['"]admin['"]/);
    });

    test('router.use(authorize(COMMUNITY_ROLES)) wired', () => {
      expect(src).toMatch(/router\.use\(authorize\(COMMUNITY_ROLES\)\)/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/community-service.routes')).not.toThrow();
    });
  });
});
