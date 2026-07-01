'use strict';

/**
 * W1585 — 6 more clinical/PHI routes carrying the cross-branch ?branchId= read-override
 * (and, for 4 of them, the create branch-injection) that the earlier slices missed:
 * sensory-diet, sleep-assessment, spasticity-injection, vision-screening, voice-log,
 * sponsorship.
 *
 *  READ  — `if (req.query.branchId ...) filter.branchId = req.query.branchId` defeated the
 *          branchFilter(req) floor → restricted user reads another branch's PHI. Guarded
 *          with !filter.branchId (17 sites across the 6).
 *  CREATE — sensory-diet / sleep-assessment / spasticity-injection / vision-screening set
 *          branchId from body → write-injection. Forced effectiveBranchScope(req).
 * (voice-log + sponsorship have no create-injection.)
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
const READ_FILES = ['sensory-diet', 'sleep-assessment', 'spasticity-injection', 'vision-screening', 'voice-log', 'sponsorship'].map((n) => n + '.routes.js');
const CREATE_FILES = ['sensory-diet', 'sleep-assessment', 'spasticity-injection', 'vision-screening'].map((n) => n + '.routes.js');

function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1585 slice-4 clinical routes: branch read-override guarded + create scoped', () => {
  for (const file of READ_FILES) {
    const src = strip(fs.readFileSync(path.join(ROUTES, file), 'utf8'));
    test(`${file}: every filter.branchId=req.query.branchId is guarded by !filter.branchId`, () => {
      const assignRe = /filter\.branchId\s*=\s*req\.query\.branchId/g;
      let m;
      const unguarded = [];
      while ((m = assignRe.exec(src))) {
        const pre = src.slice(Math.max(0, m.index - 400), m.index);
        const lastIf = pre.lastIndexOf('if (');
        if (!/!\s*filter\.branchId\b/.test(lastIf >= 0 ? pre.slice(lastIf) : pre)) {
          unguarded.push(src.slice(0, m.index).split('\n').length);
        }
      }
      expect(unguarded).toEqual([]);
      expect(src).toMatch(/branchFilter\s*\(\s*req\s*\)/);
    });
  }

  for (const file of CREATE_FILES) {
    const src = strip(fs.readFileSync(path.join(ROUTES, file), 'utf8'));
    test(`${file}: create forces effectiveBranchScope, not raw body.branchId`, () => {
      expect(src).toMatch(/branchId:\s*effectiveBranchScope\(req\)\s*\|\|/);
      expect(src).not.toMatch(/branchId:\s*body\.branchId\s*&&\s*mongoose\.isValidObjectId\(body\.branchId\)\s*\?\s*body\.branchId\s*:\s*null/);
    });
  }
});
