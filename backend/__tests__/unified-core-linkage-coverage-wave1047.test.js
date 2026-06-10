'use strict';

/**
 * unified-core-linkage-coverage-wave1047.test.js — W1047.
 *
 * The linkage-COMPLETENESS manifest + guard. Makes "is every clinically-
 * significant per-beneficiary lifecycle surface wired to the unified-core
 * timeline?" an explicit, enforced contract instead of tribal knowledge.
 *
 *   • LINKED_TRIO — the W670-W673 assessments wired in W1047. Each MUST keep a
 *     LIVE producer hook (publish + pre-compile post('save'), W954-safe signature).
 *     Regression-proofs the linkage.
 *   • DEFERRED_ISLANDS — clinically-significant per-beneficiary lifecycle models
 *     the linkage audit (2026-06-10) found still unlinked. Each is asserted to
 *     EXIST and to be NOT-YET a producer (a ratchet: the day one becomes a
 *     producer, this test fails → forcing it to be promoted to a LINKED guard).
 *     This is how the manifest stays honest and a future island can't hide.
 *
 * Adding a NEW per-beneficiary lifecycle model? Wire it (producer hook + subscriber
 * + a *-core-linkage runtime test) and lock it in a guard, OR add it to
 * DEFERRED_ISLANDS with a reason. Either way coverage stays explicit.
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODELS = path.join(__dirname, '..', 'models');
const exists = rel => fs.existsSync(path.join(MODELS, rel));
const read = rel => fs.readFileSync(path.join(MODELS, rel), 'utf8');

const LINKED_TRIO = [
  { file: 'DysphagiaAssessment.js', schema: 'DysphagiaAssessmentSchema' },
  { file: 'PainAssessment.js', schema: 'PainAssessmentSchema' },
  { file: 'PhysiotherapyAssessment.js', schema: 'PhysiotherapyAssessmentSchema' },
];

// Audit 2026-06-10 — genuine islands still unlinked. Ratcheted: promote to a
// LINKED guard (and delete from here) when wired.
const DEFERRED_ISLANDS = {
  'icf/ICFAssessment.model.js': 'ICF functioning-profile completion (draft→…→approved→archived) — next pass',
  'treatmentAuthorization.model.js': 'authorization approved/denied — highest-value operational island',
  'ClinicalPathwayPlan.js': 'pathway-stage completion milestone',
  'care/MdtMeeting.model.js': 'MDT meeting completed (pick canonical vs MDTCoordination first)',
  'MDTCoordination.js': 'parallel MDT model — consolidate with MdtMeeting first',
  'InstrumentalSwallowStudy.js': 'VFSS/FEES study finalized — completes the dysphagia loop',
  'EmergencyPlan.js': 'per-beneficiary emergency/seizure/allergy plan activation',
  'TherapistConsultation.js': 'cross-discipline consult answered/closed',
  'CdssAlert.js': 'CDSS alert acknowledged/overridden/resolved',
};

const TIMELINE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'timeline', 'models', 'CareTimeline.js'),
  'utf8'
);
const SUBSCRIBERS_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'integration', 'dddCrossModuleSubscribers.js'),
  'utf8'
);

describe('W1047 — the clinical-assessment trio stays linked (regression lock)', () => {
  for (const { file, schema } of LINKED_TRIO) {
    describe(file, () => {
      const src = read(file);

      it('has a LIVE producer hook publishing to the bus', () => {
        expect(src).toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]save['"]`));
        expect(src).toMatch(/integrationBus\.publish\(\s*['"]clinical-assessment['"]/);
      });

      it('the producer is defined BEFORE mongoose.model() (not runtime-dead)', () => {
        const idx = src.indexOf(`${schema}.post('save'`);
        const compileIdx = src.search(/mongoose\.model\(/);
        expect(idx).toBeGreaterThan(0);
        expect(idx).toBeLessThan(compileIdx);
      });

      it('uses the W954-safe signature function(doc) — not a lone next', () => {
        expect(src).toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]save['"]\\s*,\\s*function\\s*\\(\\s*doc\\s*\\)`));
        expect(src).not.toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]save['"]\\s*,\\s*function\\s*\\(\\s*next\\s*\\)`));
      });
    });
  }
});

describe('W1047 — CareTimeline + subscribers know the trio', () => {
  for (const et of ['dysphagia_assessment', 'pain_assessment', 'physiotherapy_assessment']) {
    it(`enum includes '${et}'`, () => {
      expect(TIMELINE_SRC).toMatch(new RegExp(`['"]${et}['"]`));
    });
  }
  for (const p of [
    'clinical-assessment.dysphagia.assessment_finalized',
    'clinical-assessment.pain.assessment_finalized',
    'clinical-assessment.physiotherapy.assessment_finalized',
  ]) {
    it(`subscribes to '${p}'`, () => {
      expect(SUBSCRIBERS_SRC).toMatch(new RegExp(`pattern:\\s*['"]${p.replace(/\./g, '\\.')}['"]`));
    });
  }
});

describe('W1047 — deferred-island manifest is honest (ratchet)', () => {
  for (const [rel, reason] of Object.entries(DEFERRED_ISLANDS)) {
    describe(rel, () => {
      it('still exists on disk', () => {
        expect(exists(rel)).toBe(true);
      });

      it(`is NOT yet a producer — promote to a LINKED guard when wired (${reason})`, () => {
        // Ratchet: the day this model gains a producer hook, MOVE it out of
        // DEFERRED_ISLANDS into a LINKED guard + a runtime core-linkage test.
        expect(read(rel)).not.toMatch(/integrationBus\.publish\(/);
      });
    });
  }

  it('documents a non-trivial deferred backlog (coverage stays explicit)', () => {
    expect(Object.keys(DEFERRED_ISLANDS).length).toBeGreaterThanOrEqual(5);
  });
});
