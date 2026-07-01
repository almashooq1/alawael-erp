/**
 * W1555 — smart-assessment-engine: CARS-2 dead-model data loss, PUT mass-assignment,
 * rescore precondition, FBA create lifecycle forge (2026-06-30 hunt).
 *
 * Branch isolation here is enforced via the BENEFICIARY FK (branchScopedBeneficiaryParam
 * + bodyScopedBeneficiaryGuard + applyAssessmentListScope querying Beneficiary.branchId),
 * NOT the assessment's own `branch` field — verified clean (W907). The bugs were
 * elsewhere:
 *   1. CARS-2 wrote to mongoose.models.StandardAssessment — a model that is NOT
 *      registered (archived) → every CARS-2 POST returned 201 data:null, saving nothing.
 *   2. PUT /detail/:type/:id stripped underscore-typo'd keys (_createdAt/_assessor/
 *      _branch) → real status/score/assessor/beneficiary were forgeable.
 *   3. /rescore had no status precondition → re-scored reviewed/deleted assessments.
 *   4. /behavioral-function create forced no status → caller forged status/bcba_supervisor.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/smart-assessment-engine.routes.js'),
  'utf8'
);
const STD_MODEL = fs.readFileSync(
  path.join(__dirname, '../models/StandardizedAssessment.js'),
  'utf8'
);

describe('W1555 — CARS-2 persists to a real registered model', () => {
  test('the registered StandardizedAssessment model exists and lists CARS', () => {
    expect(STD_MODEL).toMatch(/mongoose\.model\('StandardizedAssessment'/);
  });
  test('CARS-2 handler creates StandardizedAssessment (not the dead StandardAssessment)', () => {
    expect(SRC).toMatch(/require\('\.\.\/models\/StandardizedAssessment'\)/);
    expect(SRC).toMatch(/StandardizedAssessment\.create\(/);
    // the dead model must not be used as a create target anymore
    expect(SRC).not.toMatch(/StandardAssessment\.create\(/);
    // branchId derived from the beneficiary (required field; effectiveBranchScope is
    // null for cross-branch roles)
    expect(SRC).toMatch(/branchId: benDoc\?\.branchId/);
  });
});

describe('W1555 — PUT /detail strips the real privileged fields', () => {
  test('blacklist names the actual schema fields (not underscore typos)', () => {
    // the typo keys must be gone; the real ones present
    expect(SRC).not.toMatch(/_createdAt, _assessor, _branch/);
    for (const f of ['status', 'total_score', 'risk_level', 'assessor', 'beneficiary', 'scoring_details']) {
      expect(SRC.includes(`\n      ${f},`)).toBe(true);
    }
  });
});

describe('W1555 — rescore + FBA-create lifecycle guards', () => {
  test('rescore rejects finalized/deleted assessments', () => {
    expect(SRC).toMatch(/\['reviewed', 'referred', 'deleted'\]\.includes\(doc\.status\)/);
  });
  test('FBA create strips caller-forgeable status/bcba_supervisor/reviewedBy', () => {
    expect(SRC).toMatch(/const \{ status: _s, bcba_supervisor: _b, reviewedBy: _r, \.\.\.fbaBody \} = req\.body/);
  });
});
