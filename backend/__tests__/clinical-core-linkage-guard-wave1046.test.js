'use strict';

/**
 * W1046 hardening guard — static drift guard for the clinical-safety →
 * unified-core linkage. Prevents the W1010-W1042 modules from silently
 * regressing back into islands, and blocks the two documented core-linkage
 * traps:
 *   • producer hook added AFTER mongoose.model() (runtime-dead — never fires)
 *   • the W954 hook-signature trap (a 1-param hook named `next` gets wrapped
 *     by the global legacy shim → every .save() hangs)
 *
 * Static analysis only (reads source as text).
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models');
const read = f => fs.readFileSync(path.join(MODELS_DIR, f), 'utf8');

// The clinical-safety models that MUST be wired to the unified core.
const LINKED_MODELS = [
  { file: 'FallsRiskAssessment.js', schema: 'FallsRiskAssessmentSchema' },
  { file: 'PressureInjuryRecord.js', schema: 'PressureInjuryRecordSchema' },
  { file: 'SleepAssessment.js', schema: 'SleepAssessmentSchema' },
  { file: 'OrientationMobilityAssessment.js', schema: 'OrientationMobilityAssessmentSchema' },
  { file: 'DrivingRehabAssessment.js', schema: 'DrivingRehabAssessmentSchema' },
  { file: 'MedicationReconciliation.js', schema: 'MedicationReconciliationSchema' },
  { file: 'InfectionSurveillanceCase.js', schema: 'InfectionSurveillanceCaseSchema' },
];

const TIMELINE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'timeline', 'models', 'CareTimeline.js'),
  'utf8'
);
const SUBSCRIBERS_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'integration', 'dddCrossModuleSubscribers.js'),
  'utf8'
);

describe('W1046 — every clinical-safety model has a LIVE producer hook', () => {
  for (const { file, schema } of LINKED_MODELS) {
    describe(file, () => {
      const src = read(file);

      it('declares a post("save") producer that publishes to the bus', () => {
        expect(src).toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]save['"]`));
        expect(src).toMatch(/integrationBus\.publish\(\s*['"]clinical-safety['"]/);
      });

      it('the producer hook is defined BEFORE mongoose.model() (not runtime-dead)', () => {
        const hookIdx = src.indexOf(`${schema}.post('save'`);
        const altIdx = src.indexOf(`${schema}.post("save"`);
        const idx = hookIdx >= 0 ? hookIdx : altIdx;
        const compileIdx = src.search(/mongoose\.model\(/);
        expect(idx).toBeGreaterThan(0);
        expect(compileIdx).toBeGreaterThan(0);
        expect(idx).toBeLessThan(compileIdx);
      });

      it('uses the W954-safe signature function(doc) — NOT a 1-param next', () => {
        // The post('save') handler must take `doc` (or be 0-param), never a
        // lone `next`, which the legacy mongoose.plugins shim wraps → save hang.
        expect(src).toMatch(
          new RegExp(`${schema}\\.post\\(\\s*['"]save['"]\\s*,\\s*function\\s*\\(\\s*doc\\s*\\)`)
        );
        expect(src).not.toMatch(
          new RegExp(`${schema}\\.post\\(\\s*['"]save['"]\\s*,\\s*function\\s*\\(\\s*next\\s*\\)`)
        );
      });

      it('captures prior status via post("init") for status-change detection', () => {
        expect(src).toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]init['"]`));
      });
    });
  }
});

describe('W1046 — CareTimeline knows the new event types', () => {
  const EVENT_TYPES = [
    'falls_risk_assessed',
    'pressure_injury',
    'pressure_injury_resolved',
    'sleep_assessment',
    'mobility_assessment',
    'driving_assessment',
    'medication_reconciliation',
    'infection_case',
    'infection_resolved',
  ];
  for (const et of EVENT_TYPES) {
    it(`enum includes '${et}'`, () => {
      expect(TIMELINE_SRC).toMatch(new RegExp(`['"]${et}['"]`));
    });
  }
});

describe('W1046 — a subscriber exists for every producer pattern', () => {
  const PATTERNS = [
    'clinical-safety.falls.assessment_finalized',
    'clinical-safety.pressure_injury.identified',
    'clinical-safety.pressure_injury.resolved',
    'clinical-safety.sleep.assessment_finalized',
    'clinical-safety.om.assessment_finalized',
    'clinical-safety.driving.assessment_finalized',
    'clinical-safety.medication.reconciled',
    'clinical-safety.infection.case_opened',
    'clinical-safety.infection.case_resolved',
  ];
  for (const p of PATTERNS) {
    it(`subscribes to '${p}'`, () => {
      expect(SUBSCRIBERS_SRC).toMatch(new RegExp(`pattern:\\s*['"]${p.replace(/\./g, '\\.')}['"]`));
    });
  }
});
