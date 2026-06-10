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

// W1075 (2026-06-10) — the eight deferred islands from the 2026-06-10 audit, now
// LINKED. Each MUST keep a LIVE producer hook (publish + pre-compile post('save'),
// W954-safe signature) + a CareTimeline eventType + a subscriber. Regression-locked
// exactly like LINKED_TRIO, but each publishes to its own bus domain.
const LINKED_W1075 = [
  {
    file: 'icf/ICFAssessment.model.js',
    schema: 'icfAssessmentSchema',
    timelineEventType: 'icf_assessment',
    pattern: 'clinical-assessment.icf.assessment_approved',
  },
  {
    file: 'treatmentAuthorization.model.js',
    schema: 'TreatmentAuthorizationSchema',
    timelineEventType: 'treatment_authorization',
    pattern: 'authorization.treatment.authorization_decided',
  },
  {
    file: 'ClinicalPathwayPlan.js',
    schema: 'clinicalPathwayPlanSchema',
    timelineEventType: 'clinical_pathway_completed',
    pattern: 'care-pathway.clinical-pathway.completed',
  },
  {
    file: 'care/MdtMeeting.model.js',
    schema: 'mdtMeetingSchema',
    timelineEventType: 'mdt_meeting',
    pattern: 'care-coordination.mdt.meeting_completed',
  },
  {
    file: 'InstrumentalSwallowStudy.js',
    schema: 'InstrumentalSwallowStudySchema',
    timelineEventType: 'swallow_study',
    pattern: 'clinical-assessment.swallow-study.completed',
  },
  {
    file: 'EmergencyPlan.js',
    schema: 'EmergencyPlanSchema',
    timelineEventType: 'emergency_plan_activated',
    pattern: 'safety.emergency-plan.activated',
  },
  {
    file: 'TherapistConsultation.js',
    schema: 'therapistConsultationSchema',
    timelineEventType: 'consultation',
    pattern: 'care-coordination.consultation.answered',
  },
  {
    file: 'CdssAlert.js',
    schema: 'cdssAlertSchema',
    timelineEventType: 'cdss_alert_resolved',
    pattern: 'cdss.alert.resolved',
  },
];

// Audit 2026-06-10 — genuine islands still unlinked. Ratcheted: promote to a
// LINKED guard (and delete from here) when wired. W1075 cleared the other eight.
const DEFERRED_ISLANDS = {
  'MDTCoordination.js':
    'parallel/duplicate of care/MdtMeeting.model.js (both register MDT meetings) — linking it would double-emit; consolidate the two models first',
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

describe('W1075 — the eight deferred islands are now LINKED (regression lock)', () => {
  for (const { file, schema, timelineEventType, pattern } of LINKED_W1075) {
    describe(file, () => {
      const src = read(file);

      it('has a LIVE producer hook publishing to the bus', () => {
        expect(src).toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]save['"]`));
        expect(src).toMatch(/integrationBus\.publish\(/);
      });

      it('the producer is defined BEFORE mongoose.model() compile (not runtime-dead)', () => {
        const idx = src.indexOf(`${schema}.post('save'`);
        // Match the COMPILE site (schema as 2nd arg) — not a 1-arg runtime
        // mongoose.model('X') lookup inside a method (e.g. MdtMeeting line ~144).
        const compileIdx = src.search(new RegExp(`mongoose\\.model\\(\\s*['"][^'"]+['"]\\s*,\\s*${schema}\\b`));
        expect(idx).toBeGreaterThan(0);
        expect(compileIdx).toBeGreaterThan(0);
        expect(idx).toBeLessThan(compileIdx);
      });

      it('uses the W954-safe signature function(doc) — not a lone next', () => {
        expect(src).toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]save['"]\\s*,\\s*function\\s*\\(\\s*doc\\s*\\)`));
        expect(src).not.toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]save['"]\\s*,\\s*function\\s*\\(\\s*next\\s*\\)`));
      });

      it('captures prevStatus via post(init) for transition detection', () => {
        expect(src).toMatch(new RegExp(`${schema}\\.post\\(\\s*['"]init['"]`));
      });

      it(`CareTimeline enum includes '${timelineEventType}'`, () => {
        expect(TIMELINE_SRC).toMatch(new RegExp(`['"]${timelineEventType}['"]`));
      });

      it(`a subscriber listens on '${pattern}'`, () => {
        expect(SUBSCRIBERS_SRC).toMatch(new RegExp(`pattern:\\s*['"]${pattern.replace(/\./g, '\\.')}['"]`));
      });
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

  it('every remaining deferred island carries an explicit reason (coverage stays honest)', () => {
    const entries = Object.entries(DEFERRED_ISLANDS);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    for (const [, reason] of entries) {
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});
