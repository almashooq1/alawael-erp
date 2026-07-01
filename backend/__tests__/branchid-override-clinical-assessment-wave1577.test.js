'use strict';

/**
 * W1577 — same cross-branch IDOR class as W1575, second slice: the clinical-assessment /
 * safety routes. Each list/read handler scoped its filter with `{ ...branchFilter(req) }`
 * then UNCONDITIONALLY overrode it with `filter.branchId = req.query.branchId`, letting a
 * branch-restricted user read another branch's clinical PHI (pain / hearing / dysphagia /
 * physiotherapy / seating / swallow / prosthetic-orthotic / pressure-injury / infection /
 * medication-reconciliation / restraint-seclusion / MAR / etc.) via a foreign ?branchId=.
 *
 * Fix: guard the override with `!filter.branchId` (restricted stays locked; cross-branch
 * roles keep the ?branchId= filter). 51 sites across 18 files.
 *
 * (Read-side only. The create-injection variant + the ~30 non-clinical route files with the
 * same override are documented for owner coordination — this slice stays reviewable + low-
 * collision with the parallel branch-isolation effort.)
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
const FILES = [
  'pain-assessment', 'hearing-screening', 'dysphagia-assessment', 'physiotherapy-assessment',
  'orientation-mobility', 'seating-postural-assessment', 'instrumental-swallow', 'prosthetic-orthotic',
  'driving-rehab', 'falls-risk-assessment', 'pressure-injury', 'infection-surveillance',
  'medication-reconciliation', 'dtt-session', 'adjunct-therapy', 'arts-therapy',
  'restraint-seclusion', 'mar',
].map((n) => n + '.routes.js');

function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1577 clinical-assessment routes: branchId override cannot defeat branchFilter', () => {
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
