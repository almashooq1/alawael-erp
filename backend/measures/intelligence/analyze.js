'use strict';

/**
 * measures/intelligence/analyze.js — W696 unified measure-intelligence facade.
 *
 * WHY this exists (the connective-tissue gap):
 *   Every clinical signal already has a dedicated, tested, pure layer:
 *     • scoring         (measures/scoring/*)        → raw → derived → band
 *     • governance      (measures/governance/*)     → licensing + screening≠dx
 *     • psychometrics   (measures/psychometrics/*)  → norms + RCI
 *     • trend           (measures/trend/*)          → trajectory over time
 *     • explainability  (measures/explain/*)        → bilingual narrative
 *   …but NOTHING fused them into a single decision-grade call. A consumer
 *   (route, dashboard, care-plan linkage) had to stitch 5 layers by hand and
 *   risk drift in the wiring. This facade is that single entry point.
 *
 * Contract: PURE. No DB, no I/O. The caller resolves anything that needs
 * persistence (the Measure catalog doc, the prior administration, the
 * trajectory from history) and passes it in. analyze() composes the rest.
 *
 *   analyze({ measure, raw, previous?, trajectory?, norm?, psychometric?,
 *             baselineValue?, digitization?, intent? }) → {
 *     measureCode, blocked, governance, scoring, normative, change,
 *     trajectory, narrative
 *   }
 */

const scoringRegistry = require('../scoring');
const { evaluateDigitization } = require('../governance/licensing.registry');
const {
  evaluateUse,
  confirmatoryAdvisory,
  isScreeningOnly,
} = require('../governance/clinical-use.policy');
const psy = require('../psychometrics');
const { synthesize } = require('../explain/synthesize');

// Trend layer emits lower_snake codes (classify.js); the interpretation +
// synthesizer vocab is UPPER_SNAKE. This is the single normalization point so
// callers never juggle two vocabularies.
const TRAJECTORY_NORMALIZE = Object.freeze({
  linear_improvement: 'SUSTAINED_IMPROVEMENT',
  sustained_improvement: 'SUSTAINED_IMPROVEMENT',
  slow_improvement: 'SLOW_PROGRESS',
  slow_progress: 'SLOW_PROGRESS',
  plateau: 'PLATEAU',
  regression: 'REGRESSION',
  oscillation: 'OSCILLATION',
  stable: 'STABLE',
  ceiling_achieved: 'CEILING_ACHIEVED',
  stagnant: 'STAGNANT',
  mixed_domains: 'MIXED_DOMAINS',
  insufficient_data: 'INSUFFICIENT_DATA',
});

/**
 * @param {string|undefined} code   raw trajectory code from any layer
 * @returns {string|undefined}      normalized UPPER_SNAKE code (or undefined)
 */
function normalizeTrajectory(code) {
  if (!code) return undefined;
  const key = String(code).toLowerCase();
  return (
    TRAJECTORY_NORMALIZE[key] ||
    (TRAJECTORY_NORMALIZE[code] ? undefined : String(code).toUpperCase())
  );
}

/**
 * @param {Object}  input
 * @param {Object}  input.measure        Measure catalog doc (code, name, name_ar, purpose, direction)
 * @param {*}       [input.raw]          current raw administration (engine-specific shape)
 * @param {*}       [input.previous]     prior derived value OR { value } for delta
 * @param {string}  [input.trajectory]   trajectory code from the trend layer
 * @param {Object}  [input.norm]         { mean, sd } normative reference
 * @param {Object}  [input.psychometric] { sdBaseline, reliability, clinicalCutoff }
 * @param {number}  [input.baselineValue] baseline derived value for RCI x1
 * @param {Object}  [input.digitization] governance ctx { permissionRef }
 * @param {string}  [input.intent]       clinical use intent (USE_INTENTS)
 * @returns {Object} unified analysis
 */
function analyze(input = {}) {
  const {
    measure,
    raw,
    previous,
    trajectory,
    norm,
    psychometric,
    baselineValue,
    digitization,
    intent,
  } = input;

  if (!measure || !measure.code) {
    throw new Error('analyze: measure with a code is required');
  }
  const code = measure.code;

  // ── 1. Governance gates (licensing + clinical-use) ───────────────────
  const digiGate = evaluateDigitization(code, digitization || {});
  const useGate = intent ? evaluateUse(measure, intent) : null;
  const advisory = confirmatoryAdvisory(measure);
  const governance = {
    digitization: digiGate,
    use: useGate,
    requiresConfirmatory: Boolean(useGate && useGate.requiresConfirmatory),
    advisory, // bilingual screening-not-diagnosis advisory, or null
  };

  // Hard block: if the instrument may not be digitized, do NOT score it.
  if (!digiGate.allowed) {
    return {
      measureCode: code,
      blocked: true,
      blockReason: digiGate.reason,
      governance,
      scoring: null,
      normative: null,
      change: null,
      trajectory: normalizeTrajectory(trajectory) || null,
      narrative: synthesize({
        measure,
        bandLabel: 'Digitization blocked',
        bandLabel_ar: 'الرقمنة غير مسموح بها',
      }),
    };
  }

  // ── 2. Scoring (raw → derived → interpretation band + delta) ─────────
  const engine = scoringRegistry.resolve(code);
  let scoring = null;
  const direction = (engine && engine.direction) || measure.direction || 'higher_better';
  if (engine && raw !== undefined) {
    const derived = engine.computeDerived(raw);
    const derivedValue = derived && typeof derived.value === 'number' ? derived.value : derived;
    const band = engine.interpret(derivedValue);
    let deltaResult = null;
    if (previous !== undefined && previous !== null && typeof engine.delta === 'function') {
      const prevVal = typeof previous === 'object' ? previous.value : previous;
      deltaResult = engine.delta(prevVal, derivedValue, measure);
    }
    scoring = {
      engineVersion: engine.engineVersion,
      direction,
      derived,
      value: derivedValue,
      band,
      delta: deltaResult,
    };
  }

  // ── 3. Psychometrics (normative position + reliable change) ──────────
  let normative = null;
  if (norm && scoring && typeof scoring.value === 'number') {
    normative = psy.normProfile(scoring.value, norm, direction);
  }

  let change = null;
  if (
    psychometric &&
    scoring &&
    typeof scoring.value === 'number' &&
    typeof baselineValue === 'number'
  ) {
    change = psy.classifyChange(baselineValue, scoring.value, {
      sdBaseline: psychometric.sdBaseline,
      reliability: psychometric.reliability,
      direction,
      clinicalCutoff: psychometric.clinicalCutoff,
    });
  }

  // ── 4. Explainable synthesis (fuse every signal) ─────────────────────
  const normTraj = normalizeTrajectory(trajectory);
  const screeningPositive = Boolean(advisory) && isScreeningOnly(measure);
  const narrative = synthesize({
    measure,
    bandLabel: scoring && scoring.band && scoring.band.label_en,
    bandLabel_ar: scoring && scoring.band && scoring.band.label_ar,
    severity: scoring && scoring.band && scoring.band.severity,
    trajectory: normTraj,
    norm: normative,
    change: change && { outcome: change.outcome, rci: change.rci, reliable: change.reliable },
    advisory,
    isScreeningPositive: screeningPositive,
  });

  return {
    measureCode: code,
    blocked: false,
    governance,
    scoring,
    normative,
    change,
    trajectory: normTraj || null,
    narrative,
  };
}

module.exports = { analyze, normalizeTrajectory, TRAJECTORY_NORMALIZE };
