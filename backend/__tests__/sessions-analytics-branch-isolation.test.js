/**
 * sessions-analytics-branch-isolation.test.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 6 surface unification guard: legacy `/api/v1/therapy-sessions-analytics`
 * endpoints moved to `/api/v1/sessions/analytics/*` must keep W269/W1152 branch
 * isolation and must not be shadowed by the generic `/:sessionId` route.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DOMAIN_SRC = path.join(__dirname, '../domains/sessions/index.js');
const ANALYTICS_SRC = path.join(__dirname, '../domains/sessions/routes/sessions-analytics-compat.routes.js');
const REGISTRY_SRC = path.join(__dirname, '../routes/_registry.js');

const domainSrc = fs.readFileSync(DOMAIN_SRC, 'utf8');
const analyticsSrc = fs.readFileSync(ANALYTICS_SRC, 'utf8');
const registrySrc = fs.readFileSync(REGISTRY_SRC, 'utf8');

function normalize(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const analyticsNorm = normalize(analyticsSrc);
const domainNorm = normalize(domainSrc);
const registryNorm = normalize(registrySrc);

function collectRoutePaths(src) {
  const paths = [];
  const re = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    paths.push(m[2]);
  }
  return paths;
}

const analyticsPaths = collectRoutePaths(analyticsNorm);

describe('Phase 6 — Sessions Analytics unification + branch isolation', () => {
  test('domain mounts analytics router before secure router', () => {
    const analyticsMount = domainNorm.match(/app\.use\s*\([^)]*analyticsRouter/);
    const secureMount = domainNorm.match(/app\.use\s*\([^)]*secureRouter/);
    expect(analyticsMount).toBeTruthy();
    expect(secureMount).toBeTruthy();
    expect(domainNorm.indexOf(analyticsMount[0])).toBeLessThan(domainNorm.indexOf(secureMount[0]));
  });

  test('legacy /api/v1/therapy-sessions-analytics mount removed from _registry.js', () => {
    // The slug may still appear in retirement logs; ensure no actual mount call remains.
    expect(registryNorm).not.toMatch(/dualMount\s*\([^)]*['"]therapy-sessions-analytics['"]/);
    expect(registryNorm).not.toMatch(/app\.use\s*\([^)]*therapy-sessions-analytics/);
  });

  test('analytics router imports effectiveBranchScope', () => {
    expect(analyticsNorm).toMatch(/effectiveBranchScope\s*,?/);
  });

  test('analytics router uses branchScopedResourceParam for :sessionId', () => {
    expect(analyticsNorm).toMatch(/branchScopedResourceParam\s*\(/);
    expect(analyticsNorm).toMatch(/router\.param\s*\(\s*['"]sessionId['"]/);
  });

  const expectedEndpoints = [
    '/overview',
    '/trends',
    '/therapist-performance',
    '/room-utilization',
    '/attendance',
    '/billing',
    '/goal-progress',
    '/cancellations',
    '/calendar',
    '/export/report',
    '/waitlist',
    '/billing/bulk',
    '/:sessionId/billing',
  ];

  for (const ep of expectedEndpoints) {
    test(`registers analytics endpoint ${ep}`, () => {
      expect(analyticsPaths).toContain(ep);
    });
  }

  test('every aggregate query is built through baseQuery with branch isolation', () => {
    const matchCount = (analyticsNorm.match(/baseQuery\s*\(\s*req/g) || []).length;
    expect(matchCount).toBeGreaterThanOrEqual(8);
  });

  test('bulk billing update applies branchId filter', () => {
    const bulkIdx = analyticsNorm.indexOf("/billing/bulk");
    const bulkBlock = analyticsNorm.slice(bulkIdx, bulkIdx + 1200);
    expect(bulkBlock).toMatch(/effectiveBranchScope\s*\(\s*req\s*\)/);
  });
});
