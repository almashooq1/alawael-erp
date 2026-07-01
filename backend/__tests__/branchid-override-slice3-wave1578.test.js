'use strict';

/**
 * W1578 — slice 3 of the ?branchId= override-defeats-branchFilter IDOR (after #851/W1575
 * clinical + #862/W1577 clinical-assessment). Remaining `usesBranchFilter=true` routes whose
 * list/read handlers overrode the branchFilter-derived branchId with a client-supplied
 * ?branchId=. Covers beneficiary-rights / caregiver / CBAHI / roster / ops surfaces:
 *   beneficiary-sections, caregiver-support-program, cbahi, day-rehab-bus-routes,
 *   decision-rights, seat-allocation, self-advocacy, operations/workOrder.
 * 15 sites. Fix: guard every override with `!filter.branchId`.
 *
 * (equity was a FALSE POSITIVE — it guards the ?branchId= with assertBranchMatch(), which
 * 403s a restricted caller on a foreign branch; left untouched. The remaining ~6
 * usesBranchFilter=false files + the create-injection variant go to the owner.)
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
const FILES = [
  'beneficiary-sections.routes.js',
  'caregiver-support-program.routes.js',
  'cbahi.routes.js',
  'day-rehab-bus-routes.routes.js',
  'decision-rights.routes.js',
  'seat-allocation.routes.js',
  'self-advocacy.routes.js',
  'operations/workOrder.routes.js',
];

function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1578 branchId override cannot defeat branchFilter (slice 3)', () => {
  for (const file of FILES) {
    const src = strip(fs.readFileSync(path.join(ROUTES, file), 'utf8'));

    test(`${file}: every "filter.branchId = req.query.branchId" is guarded by !filter.branchId`, () => {
      const assignRe = /filter\.branchId\s*=\s*req\.query\.branchId/g;
      let m;
      const unguarded = [];
      while ((m = assignRe.exec(src))) {
        const pre = src.slice(Math.max(0, m.index - 400), m.index);
        const lastIf = pre.lastIndexOf('if (');
        const cond = lastIf >= 0 ? pre.slice(lastIf) : pre;
        if (!/!\s*filter\.branchId\b/.test(cond)) {
          unguarded.push(src.slice(0, m.index).split('\n').length);
        }
      }
      expect(unguarded).toEqual([]);
    });

    test(`${file}: still scopes the filter with branchFilter(req)`, () => {
      expect(src).toMatch(/branchFilter\s*\(\s*req\s*\)/);
    });
  }
});
