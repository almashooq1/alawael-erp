/**
 * W445 — close cross-tenant IDOR on the remaining 7 W356-W370 routes.
 *
 * Sibling of W443 (assistive-device) and W444 (safeguarding). Same
 * pattern, applied to the remaining clinical-services routes that
 * carry `branchId` in their model but lacked branch-scope enforcement:
 *
 *   seizure-log         (SeizureEvent — neurological event PHI)
 *   communication-aid   (CommunicationAidProfile — AAC profile)
 *   transition-plan     (TransitionPlan — life-stage care plan)
 *   adaptive-sports     (AdaptiveSportsProgram — high-medical risk gates)
 *   respite             (RespiteBooking — emergency-contact PII)
 *   diet-prescription   (BeneficiaryDietPrescription — IDDSI/NPO clinical)
 *   facility-asset      (FacilityAsset — life-safety + regulatory certs)
 *
 * Pre-W445 any clinician/role scoped to branch A could read or modify
 * records in branch B by knowing/guessing the ObjectId.
 *
 * Total ~58 instance-load sites + ~30 list filters across 7 files
 * closed in one batched commit.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  { file: 'seizure-log.routes.js', model: 'SeizureEvent' },
  { file: 'communication-aid.routes.js', model: 'Profile' },
  { file: 'transition-plan.routes.js', model: 'Plan' },
  { file: 'adaptive-sports.routes.js', model: 'Program' },
  { file: 'respite.routes.js', model: 'Booking' },
  { file: 'diet-prescription.routes.js', model: 'Rx' },
  { file: 'facility-asset.routes.js', model: 'Asset' },
];

describe('W445 — branch-scope on remaining W356-W370 routes', () => {
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
        const re = new RegExp(`\\b${model}\\.findOne\\([^)]+\\)`, 'g');
        const matches = src.match(re) || [];
        expect(matches.length).toBeGreaterThan(0);
        for (const m of matches) {
          expect(m).toMatch(/branchFilter\(req\)/);
        }
      });

      test(`every ${model}.find list query sits in a route block using branchFilter(req)`, () => {
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
