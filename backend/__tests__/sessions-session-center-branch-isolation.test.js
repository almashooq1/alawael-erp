/**
 * sessions-session-center-branch-isolation.test.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 5 surface unification guard: Session-Center analytics endpoints moved
 * under /api/v1/sessions/session-center/* must keep W269/W1152 branch
 * isolation. This static test locks that contract in place.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_SRC = path.join(__dirname, '../domains/sessions/routes/sessions.routes.js');
const SERVICE_SRC = path.join(__dirname, '../services/sessionCenter.service.js');

const routesSrc = fs.readFileSync(ROUTES_SRC, 'utf8');
const serviceSrc = fs.readFileSync(SERVICE_SRC, 'utf8');

function normalize(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const routesNorm = normalize(routesSrc);
const serviceNorm = normalize(serviceSrc);

describe('Phase 5 — Session-Center analytics branch isolation', () => {
  describe('routes', () => {
    test('imports effectiveBranchScope from assertBranchMatch', () => {
      expect(routesNorm).toMatch(/effectiveBranchScope\s*,?/);
      expect(routesNorm).toMatch(
        /require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/
      );
    });

    const sessionCenterEndpoints = [
      { name: 'dashboard', pattern: /get\s*\(\s*['"]\/session-center\/dashboard['"][\s\S]*?\);/ },
      { name: 'calendar', pattern: /get\s*\(\s*['"]\/session-center\/calendar['"][\s\S]*?\);/ },
      {
        name: 'therapist-load',
        pattern: /get\s*\(\s*['"]\/session-center\/therapist-load['"][\s\S]*?\);/,
      },
      { name: 'attendance', pattern: /get\s*\(\s*['"]\/session-center\/attendance['"][\s\S]*?\);/ },
      {
        name: 'episode',
        pattern: /get\s*\(\s*['"]\/session-center\/episode\/[^'"]+['"][\s\S]*?\);/,
      },
      {
        name: 'beneficiary',
        pattern: /get\s*\(\s*['"]\/session-center\/beneficiary\/[^'"]+['"][\s\S]*?\);/,
      },
      { name: 'goals', pattern: /get\s*\(\s*['"]\/session-center\/goals\/[^'"]+['"][\s\S]*?\);/ },
      { name: 'soap', pattern: /get\s*\(\s*['"]\/session-center\/soap\/[^'"]+['"][\s\S]*?\);/ },
    ];

    for (const ep of sessionCenterEndpoints) {
      test(`${ep.name} handler passes effectiveBranchScope(req) to service`, () => {
        const block = routesNorm.match(ep.pattern);
        expect(block && block[0]).toBeTruthy();
        expect(block[0]).toMatch(/effectiveBranchScope\s*\(\s*req\s*\)/);
      });
    }
  });

  describe('service', () => {
    const methods = [
      'getDashboard',
      'getCalendarSlots',
      'getTherapistLoad',
      'getAttendanceReport',
      'getEpisodeSessions',
      'getBeneficiarySessions',
      'getGoalsProgress',
      'getSOAPSummary',
    ];

    for (const method of methods) {
      test(`${method} accepts branchId in its options argument`, () => {
        const re = new RegExp(`async\\s+${method}\\s*\\(`, 'g');
        expect(serviceNorm).toMatch(re);
        // Locate the method signature and confirm branchId appears.
        const idx = serviceNorm.search(re);
        const signature = serviceNorm.slice(idx, idx + 200);
        expect(signature).toMatch(/branchId/);
      });
    }

    test('uses a branchId→ObjectId helper to avoid invalid ids in queries', () => {
      expect(serviceNorm).toMatch(/_objectId\s*\(/);
      expect(serviceNorm).toMatch(/_applyBranch\s*\(/);
    });

    test('getDashboard applies branchId to range, today and telehealth queries', () => {
      // The helper should be invoked at least twice (baseMatch + todayMatch).
      const dashboardBlock = serviceNorm.slice(serviceNorm.indexOf('async getDashboard'));
      expect((dashboardBlock.match(/_applyBranch\s*\(/g) || []).length).toBeGreaterThanOrEqual(2);
    });
  });
});
