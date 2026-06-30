/**
 * therapist clinical-signals model-import-shape guard (2026-06-30 hunt).
 *
 * P1 — MeasureAlert.js / MeasureReassessmentTask.js export an OBJECT
 * ({ MeasureAlert, schema, constants }), but the therapist route + service did a
 * bare `const MeasureAlert = require(...)` then called it as a model
 * (`MeasureAlert.findById` / `MeasureAlert().aggregate`) → the object has no
 * .findById → TypeError → all 6 clinical-signals endpoints 500'd in production
 * while CI stayed green (the tests mocked a FLAT model shape). Fixed by
 * destructuring the named model at each call site; the test mocks now expose the
 * model under its named key too (self-referencing), so they validate the real
 * require-shape going forward.
 *
 * P2 — Beneficiary.moodLog was a phantom field (student-portal $pushed it under
 * strict mode → dropped; therapist read always []). Now declared.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(path.join(__dirname, '../routes/therapist-portal.routes.js'), 'utf8');
const SVC = fs.readFileSync(
  path.join(__dirname, '../services/therapistClinicalSignals.service.js'),
  'utf8'
);
const ALERT_MODEL = fs.readFileSync(
  path.join(__dirname, '../domains/goals/models/MeasureAlert.js'),
  'utf8'
);
const TASK_MODEL = fs.readFileSync(
  path.join(__dirname, '../domains/goals/models/MeasureReassessmentTask.js'),
  'utf8'
);
const BEN = fs.readFileSync(path.join(__dirname, '../models/Beneficiary.js'), 'utf8');

describe('therapist clinical-signals — model require shape', () => {
  test('the models export the model under a named key (object export)', () => {
    expect(ALERT_MODEL).toMatch(/module\.exports = \{[\s\S]*MeasureAlert/);
    expect(TASK_MODEL).toMatch(/module\.exports = \{[\s\S]*MeasureReassessmentTask/);
  });
  test('the route destructures the named model (no bare require-as-model)', () => {
    expect(ROUTE).not.toMatch(/const MeasureAlert = require\('\.\.\/domains\/goals\/models\/MeasureAlert'\);/);
    expect(ROUTE).not.toMatch(/const MeasureReassessmentTask = require\('\.\.\/domains\/goals\/models\/MeasureReassessmentTask'\);/);
    expect(ROUTE).toMatch(/const \{ MeasureAlert \} = require\('\.\.\/domains\/goals\/models\/MeasureAlert'\)/);
    expect(ROUTE).toMatch(/const \{ MeasureReassessmentTask \} = require\('\.\.\/domains\/goals\/models\/MeasureReassessmentTask'\)/);
  });
  test('the service pulls the named model off the require result', () => {
    expect(SVC).toMatch(/require\('\.\.\/domains\/goals\/models\/MeasureAlert'\)\.MeasureAlert/);
    expect(SVC).toMatch(/require\('\.\.\/domains\/goals\/models\/MeasureReassessmentTask'\)\.MeasureReassessmentTask/);
  });
});

describe('Beneficiary — moodLog is a real field', () => {
  test('moodLog[] is declared (was a phantom write/read)', () => {
    expect(BEN).toMatch(/moodLog:\s*\[/);
  });
});
