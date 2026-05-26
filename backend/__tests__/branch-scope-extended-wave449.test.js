/**
 * W449 — extend the W443-W448 branch-scope sweep to 2 more
 * branchId-bearing route files:
 *
 *   disability-cards.routes.js  (BeneficiaryDisabilityCard — Saudi
 *                                disability-ID card records, PII +
 *                                regulatory)
 *   kpi-reports.routes.js       (KpiReport — branch performance KPIs)
 *
 * Same triple-pattern fix as W443.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  { file: 'disability-cards.routes.js', models: ['Card'] },
  { file: 'kpi-reports.routes.js', models: ['KpiReport'] },
];

describe('W449 — branch-scope on 2 more branchId-bearing routes', () => {
  for (const { file, models } of FILES) {
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

      for (const model of models) {
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
          if (matches.length === 0) return;
          for (const m of matches) {
            expect(m).toMatch(/branchFilter\(req\)/);
          }
        });
      }

      test('module loads without throwing', () => {
        expect(() => require(`../routes/${file.replace(/\.js$/, '')}`)).not.toThrow();
      });
    });
  }
});
