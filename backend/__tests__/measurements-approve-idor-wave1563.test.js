/**
 * W1563 — measurements: cross-branch IDOR + approval forgery on the non-:beneficiaryId
 * :id routes (2026-06-30 hunt).
 *
 * The :beneficiaryId routes are hardened (W440 router.param branchScopedBeneficiaryParam),
 * but three :id routes bypass that guard and did findByIdAndUpdate with NO ownership
 * check: PUT /results/:resultId/approve, PUT /:planId/approve, PUT /:planId. Any
 * branch-restricted user could approve/update another branch's clinical result/plan and
 * forge approvalInfo.approvedBy. MeasurementResult + IndividualRehabPlan have no branchId
 * but carry a required `beneficiaryId` → enforce via the beneficiary's branch.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/measurements.routes.js'), 'utf8');
const SVC = fs.readFileSync(path.join(__dirname, '../services/MeasurementService.js'), 'utf8');

function handler(sig) {
  const i = SRC.indexOf(sig);
  return i === -1 ? '' : SRC.slice(i, i + 1600);
}

describe('W1563 — the 3 non-:beneficiaryId :id routes enforce branch ownership', () => {
  test('assertBeneficiaryInScope is imported', () => {
    expect(SRC).toMatch(/assertBeneficiaryInScope,/);
  });
  test('PUT /results/:resultId/approve loads + enforces + state-guards + saves', () => {
    const h = handler("router.put('/results/:resultId/approve'");
    expect(h).toMatch(/MeasurementResult\.findById\(req\.params\.resultId\)/);
    expect(h).toMatch(/assertBeneficiaryInScope\(req, result\.beneficiaryId, res\)/);
    expect(h).toMatch(/status === 'APPROVED'/); // state precondition
    expect(h).toMatch(/await result\.save\(\)/);
  });
  test('PUT /:planId/approve loads + enforces + state-guards', () => {
    const h = handler("router.put('/:planId/approve'");
    expect(h).toMatch(/IndividualRehabPlan\.findById\(req\.params\.planId\)/);
    expect(h).toMatch(/assertBeneficiaryInScope\(req, plan\.beneficiaryId, res\)/);
    expect(h).toMatch(/await plan\.save\(\)/);
  });
  test('PUT /:planId enforces ownership + strips privileged fields before the service', () => {
    const h = handler("router.put('/:planId',");
    expect(h).toMatch(/assertBeneficiaryInScope\(req, plan\.beneficiaryId, res\)/);
    expect(h).toMatch(/'status', 'approvalInfo', 'beneficiaryId', 'planCode'/);
  });
});

describe('W1563 — plan update runs validators', () => {
  test('updateIndividualRehabPlan passes runValidators', () => {
    const i = SVC.indexOf('async updateIndividualRehabPlan(');
    expect(SVC.slice(i, i + 500)).toMatch(/runValidators: true/);
  });
});
