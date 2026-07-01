/**
 * W1583 — GET /programs/effectiveness/:progressId cross-branch IDOR.
 *
 * Bug (deferred in #832): the handler called
 * `smartEngine.trackProgramEffectiveness(req.params.progressId)` with NO
 * ownership check. That method does `ProgramProgress.findById(id)` unscoped and
 * returns clinical effectiveness analytics (attendance / objectives-met /
 * skill-acquisition / engagement / overall score). Since this route is keyed by
 * :progressId (not :beneficiaryId), it bypasses the W440 param guard → any
 * branch-restricted user could read another branch's program analytics + probe
 * existence. Also lacked isValidObjectId → CastError 500.
 *
 * Fix: validate the id, load ProgramProgress (has beneficiaryId, no branchId),
 * enforce via assertBeneficiaryInScope, THEN invoke the engine.
 *
 * Static guard — asserts the fixed source shape.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'measurements.routes.js'),
  'utf8'
);

const START = SRC.indexOf("router.get('/programs/effectiveness/:progressId'");
const END = SRC.indexOf('router.', START + 10);
const H = SRC.slice(START, END > -1 ? END : START + 1400);

describe('W1583 effectiveness/:progressId branch ownership', () => {
  test('handler exists', () => {
    expect(START).toBeGreaterThan(-1);
  });

  test('validates the progressId (isValidObjectId → 400)', () => {
    expect(H).toMatch(/isValidObjectId\(\s*req\.params\.progressId\s*\)/);
    expect(H).toMatch(/status\(400\)/);
  });

  test('loads ProgramProgress and enforces beneficiary scope BEFORE the engine', () => {
    expect(H).toMatch(/ProgramProgress\.findById\(\s*req\.params\.progressId\s*\)/);
    expect(H).toMatch(/assertBeneficiaryInScope\(\s*req\s*,\s*progress\.beneficiaryId\s*,\s*res\s*\)/);
    expect(H).toMatch(/if \(denied\) return/);
    // ownership check must precede the effectiveness computation
    expect(H.indexOf('assertBeneficiaryInScope')).toBeLessThan(
      H.indexOf('trackProgramEffectiveness')
    );
  });

  test('returns 404 when the progress record is missing', () => {
    expect(H).toMatch(/if \(!progress\)/);
    expect(H).toMatch(/status\(404\)/);
  });
});
