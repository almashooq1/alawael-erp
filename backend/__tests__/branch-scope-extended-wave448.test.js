/**
 * W448 — extend the W443-W447 branch-scope sweep to 6 more
 * branchId-bearing route files (some with multiple models):
 *
 *   day-rehab-bus-routes.routes.js  (DayRehabBusRoute — children-on-
 *                                     bus rosters + family PII)
 *   biometric-attendance.routes.js  (ZktecoDevice — biometric devices)
 *   beneficiary-sections.routes.js  (BeneficiarySection — beneficiary
 *                                     PHI cohort assignments)
 *   groups.routes.js                (Group — therapy/program groups)
 *   volunteer.routes.js             (3 models: Volunteer + Assignment
 *                                     + Opportunity — PII)
 *   recruitment.routes.js           (3 models: JobApplication + JobOffer
 *                                     + JobPosting — HR/PII)
 *
 * Same triple-pattern fix as W443.
 *
 * ~43 instance-load substitutions + 23 list-filter merges + 14
 * multi-line findByIdAndUpdate fixes across 6 files / 9 models.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  { file: 'day-rehab-bus-routes.routes.js', models: ['DayRehabBusRoute'] },
  { file: 'biometric-attendance.routes.js', models: ['ZktecoDevice'] },
  { file: 'beneficiary-sections.routes.js', models: ['BeneficiarySection'] },
  { file: 'groups.routes.js', models: ['Group'] },
  {
    file: 'volunteer.routes.js',
    models: ['Volunteer', 'VolunteerAssignment', 'VolunteerOpportunity'],
  },
  { file: 'recruitment.routes.js', models: ['JobApplication', 'JobOffer', 'JobPosting'] },
];

describe('W448 — branch-scope on 6 more branchId-bearing routes', () => {
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
