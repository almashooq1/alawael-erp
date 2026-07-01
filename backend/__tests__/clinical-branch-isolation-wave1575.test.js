'use strict';

/**
 * W1575 — cross-branch IDOR via `?branchId=` override on the W356-W370 clinical routes.
 *
 * Each list/read handler built its filter with `{ ...branchFilter(req) }` (which locks a
 * restricted user to their own branch) but then UNCONDITIONALLY overrode it:
 *     if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
 *       filter.branchId = req.query.branchId;   // <-- spoof to ANY branch
 *     }
 * A restricted user could read another branch's clinical PHI (seizures, safeguarding
 * concerns, diet prescriptions, etc.) by passing a foreign ?branchId=.
 *
 * Fix: guard the override with `!filter.branchId` so it only applies for cross-branch
 * roles (whose branchFilter returned {} — no branchId lock); restricted users stay locked.
 *
 * Guard (scoped to these 9 files only — the same anti-pattern exists in ~48 other route
 * files but those are the parallel session's active branch-isolation domain; a broad
 * baseline here would fight their churn, so the full 137-site scope is documented in the
 * PR body / memory instead of ratcheted here).
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
const FILES = [
  'seizure-log', 'safeguarding', 'respite', 'adaptive-sports', 'transition-plan',
  'assistive-device', 'communication-aid', 'diet-prescription', 'facility-asset',
].map((n) => n + '.routes.js');

function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1575 clinical routes: branchId override cannot defeat branchFilter', () => {
  for (const file of FILES) {
    const src = strip(fs.readFileSync(path.join(ROUTES, file), 'utf8'));

    test(`${file}: every "filter.branchId = req.query.branchId" is guarded by !filter.branchId`, () => {
      // find each override assignment; its enclosing `if` must contain `!filter.branchId`
      const assignRe = /filter\.branchId\s*=\s*req\.query\.branchId/g;
      let m;
      const unguarded = [];
      while ((m = assignRe.exec(src))) {
        // the override must be guarded by `!filter.branchId` in its enclosing `if`.
        // Look back to the nearest enclosing `if (` (wide window: comment lines can sit
        // between the condition and the assignment), then check the condition.
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

    test(`${file}: create does NOT set branchId from client body unforced (branch-injection)`, () => {
      // the create handler must force effectiveBranchScope(req) before any body.branchId
      // (restricted user → own branch; cross-branch admin → validated body.branchId).
      // No raw `branchId: body.branchId` / `branchId: req.body.branchId` may remain.
      expect(src).not.toMatch(/branchId:\s*body\.branchId\s*[,)]/);
      expect(src).not.toMatch(/branchId:\s*req\.body\.branchId\s*[,)]/);
      expect(src).not.toMatch(/branchId:\s*body\.branchId\s*&&\s*mongoose\.isValidObjectId\(body\.branchId\)\s*\?\s*body\.branchId\s*:\s*null/);
      // and it must import + use effectiveBranchScope
      expect(src).toMatch(/effectiveBranchScope/);
      expect(src).toMatch(/branchId:\s*effectiveBranchScope\(req\)\s*\|\|/);
    });
  }
});
