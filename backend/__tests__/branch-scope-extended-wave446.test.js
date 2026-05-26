/**
 * W446 — extend the W443/W444/W445 branch-scope sweep to 4 more
 * `branchId`-bearing route files outside the W356-W370 series:
 *
 *   caregiver-support-program.routes.js  (W384 module — caregiver
 *                                          training + family PII)
 *   iep.routes.js                        (Individual Education Plans —
 *                                          academic + clinical PHI)
 *   field-trips.routes.js                (children-on-field-trip rosters,
 *                                          consent + emergency-contact PII)
 *   family-visits.routes.js              (visit logs + visitor PII)
 *
 * Pre-W446 each route had `branchId` on the model but bare
 * findById(req.params.id) instance loads + optional-only list filters.
 * Same cross-tenant IDOR class as W443-W445.
 *
 * Same triple-pattern fix:
 *   (1) router.use(requireBranchAccess)
 *   (2) every list filter merges `...branchFilter(req)`
 *   (3) every instance load uses findOne({ _id, ...branchFilter(req) })
 *       or findOneAndDelete with same filter
 *
 * ~44 instance-load + ~12 list-filter substitutions across 4 files.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  { file: 'caregiver-support-program.routes.js', model: 'Program' },
  { file: 'iep.routes.js', model: 'IEP' },
  { file: 'field-trips.routes.js', model: 'FieldTrip' },
  { file: 'family-visits.routes.js', model: 'Visit' },
];

describe('W446 — branch-scope on 4 more branchId-bearing routes', () => {
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

      test(`every ${model}.findOne instance load includes branchFilter(req)`, () => {
        const re = new RegExp(`\\b${model}\\.findOne\\(([^)]+)\\)`, 'g');
        const matches = src.match(re) || [];
        expect(matches.length).toBeGreaterThan(0);
        for (const m of matches) {
          expect(m).toMatch(/branchFilter\(req\)/);
        }
      });

      test(`every ${model}.find / countDocuments list query sits in a route block using branchFilter(req)`, () => {
        const idxs = [];
        const re = new RegExp(`\\b${model}\\.(find|countDocuments)\\(`, 'g');
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
