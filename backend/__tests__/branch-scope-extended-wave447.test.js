/**
 * W447 — extend the W443-W446 branch-scope sweep to 3 more
 * `branchId`-bearing route files:
 *
 *   restraint-seclusion.routes.js  (W193b — restraint/seclusion ledger,
 *                                    CRITICAL clinical PHI + safety event)
 *   cbahi.routes.js                (W360 — CBAHI attestation, quality + audit)
 *   pickup-authorization.routes.js (child pickup authorization, family-
 *                                    safety + emergency-contact PII)
 *
 * Same triple-pattern fix as W443.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  { file: 'restraint-seclusion.routes.js', model: 'RSEvent' },
  { file: 'cbahi.routes.js', model: 'Attestation' },
  { file: 'pickup-authorization.routes.js', model: 'PickupAuth' },
];

describe('W447 — branch-scope on 3 more branchId-bearing routes', () => {
  for (const { file, model } of FILES) {
    describe(file, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'routes', file), 'utf8');

      test('imports requireBranchAccess + branchFilter', () => {
        expect(src).toMatch(/requireBranchAccess/);
        expect(src).toMatch(/branchFilter/);
        expect(src).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
      });

      test('router.use(requireBranchAccess) is wired', () => {
        expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
      });

      test(`NO bare ${model}.findById(req.params.id) remains`, () => {
        const re = new RegExp(`\\b${model}\\.findById\\(req\\.params\\.id\\)`);
        expect(src).not.toMatch(re);
      });

      test(`NO bare ${model}.findByIdAndDelete(req.params.id) remains`, () => {
        const re = new RegExp(`\\b${model}\\.findByIdAndDelete\\(req\\.params\\.id\\)`);
        expect(src).not.toMatch(re);
      });

      test(`NO bare ${model}.findByIdAndUpdate(req.params.id, remains`, () => {
        const re = new RegExp(`\\b${model}\\.findByIdAndUpdate\\(\\s*req\\.params\\.id\\b`, 's');
        expect(src).not.toMatch(re);
      });

      test(`every ${model}.findOne instance load includes branchFilter(req)`, () => {
        const re = new RegExp(`\\b${model}\\.findOne\\(([^)]+)\\)`, 'g');
        const matches = src.match(re) || [];
        expect(matches.length).toBeGreaterThan(0);
        for (const m of matches) {
          expect(m).toMatch(/branchFilter\(req\)/);
        }
      });

      test(`every ${model}.find / countDocuments / findOneAndUpdate sits in a route block using branchFilter(req)`, () => {
        const idxs = [];
        const re = new RegExp(
          `\\b${model}\\.(find|countDocuments|findOneAndUpdate|findOneAndDelete)\\(`,
          'g'
        );
        let mm;
        while ((mm = re.exec(src)) !== null) idxs.push(mm.index);
        expect(idxs.length).toBeGreaterThan(0);

        const routeRe = /router\.(get|post|put|patch|delete)\(/g;
        const routeStarts = [];
        let rm;
        while ((rm = routeRe.exec(src)) !== null) routeStarts.push(rm.index);

        for (const i of idxs) {
          let blockStart = 0;
          let blockEnd = src.length;
          for (const rs of routeStarts) {
            if (rs <= i) blockStart = rs;
            else if (rs > i && blockEnd === src.length) {
              blockEnd = rs;
            }
          }
          const block = src.slice(blockStart, blockEnd);
          expect(block).toMatch(/branchFilter\(req\)/);
        }
      });

      test('module loads without throwing', () => {
        expect(() => require(`../routes/${file.replace(/\.js$/, '')}`)).not.toThrow();
      });
    });
  }
});
