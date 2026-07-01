'use strict';

/**
 * W1580 — TOTAL cross-branch leak on 3 beneficiary-PHI routes. attendance-admin,
 * beneficiary-meals and daily-communication only applied `authenticateToken` +
 * `bodyScopedBeneficiaryGuard` (which scopes WRITES via req.body.beneficiaryId) — their
 * READ handlers had NO branch scope at all, so a branch-restricted user who omitted
 * ?branchId= saw EVERY branch's attendance / meal / daily-communication PHI (and could
 * read any single record / any beneficiary's history by id). Worse than the W1575/W1577
 * override-defeat (those at least had a branchFilter floor).
 *
 * Fix: add `router.use(requireBranchAccess)` + scope every read with branchFilter(req)
 * (list, windowed, per-beneficiary, single-record) and an ObjectId-cast $match on the
 * meals summary aggregate ($match does not auto-cast the string branchScope).
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
const FILES = ['attendance-admin.routes.js', 'beneficiary-meals.routes.js', 'daily-communication.routes.js'];
const MODELS = { 'attendance-admin.routes.js': 'SessionAttendance', 'beneficiary-meals.routes.js': 'MealEvent', 'daily-communication.routes.js': 'DailyCommunicationLog' };

function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1580 total-leak beneficiary-PHI routes are branch-scoped', () => {
  for (const file of FILES) {
    const src = strip(fs.readFileSync(path.join(ROUTES, file), 'utf8'));
    const model = MODELS[file];

    test(`${file}: applies requireBranchAccess middleware + imports branchFilter`, () => {
      expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
      expect(src).toMatch(/branchScope\.middleware/);
      expect(src).toMatch(/branchFilter/);
    });

    test(`${file}: no ${model}.find/countDocuments read without a branch-scoped filter`, () => {
      // every `<model>.find(` / `.countDocuments(` must reference a filter that was built
      // with branchFilter/buildFilter(...,scope) — flag any inline object literal read that
      // does not spread branchFilter.
      const re = new RegExp(model + '\\s*\\.\\s*(find|countDocuments)\\s*\\(\\s*\\{([^}]*)\\}', 'g');
      let m;
      const unscoped = [];
      while ((m = re.exec(src))) {
        if (!/branchFilter\s*\(\s*req\s*\)/.test(m[2])) {
          unscoped.push(src.slice(0, m.index).split('\n').length);
        }
      }
      expect(unscoped).toEqual([]);
    });

    test(`${file}: any override is guarded by !filter.branchId`, () => {
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
    });
  }
});
