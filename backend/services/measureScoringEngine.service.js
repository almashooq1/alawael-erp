'use strict';

/**
 * measureScoringEngine.service.js — Wave 212
 *
 * Public scoring API. Composes the W210 Measure governance fields with
 * the W212 per-measure scoring modules to produce a canonical scored
 * envelope:
 *
 *   {
 *     measureCode, measureVersion, engineVersion,
 *     derived:        { value, subscales?, notes? },
 *     interpretation: { band, tier?, label_ar, label_en, severity, color, action_ar? },
 *     delta?:         { absolute, relative, direction, mcidMet, sdcMet, ... },
 *     mcidSnapshot?:  { value, type, status, source },
 *     sdcSnapshot?:   { value, ci }
 *   }
 *
 * Consumers:
 *   • measureAdministration.service (W211b) — to populate
 *     MeasureApplication.totalRawScore + interpretation when callers
 *     supply raw items instead of pre-computed totals.
 *   • UI scoring preview (no DB write) — to show "your score would be X".
 *   • Smart Engine (W206) — eventually, to replace its inline
 *     interpretation logic with the registry.
 */

const mongoose = require('mongoose');
const registry = require('../measures/scoring');
const logger = require('../utils/logger');

const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
};

async function _resolveMeasure(measureRef) {
  if (measureRef && typeof measureRef === 'object' && measureRef.code) {
    return measureRef;
  }
  const Measure = M.Measure();
  if (!Measure) throw new Error('Measure model unavailable');
  if (mongoose.Types.ObjectId.isValid(measureRef)) {
    return Measure.findById(measureRef).lean();
  }
  return Measure.findOne({ code: measureRef }).lean();
}

class MeasureScoringEngineSvc {
  /**
   * Score a single administration against the live measure.
   *
   * @param {Object} input
   * @param {string|ObjectId|Object} input.measure — code, _id, or document
   * @param {Array}  input.rawItems
   * @param {Object} [input.ctx]                 — beneficiary context (age, etc.)
   * @param {number} [input.prevDerived]         — previous derived value for delta
   * @returns {Promise<Object>} scored envelope
   */
  async score(input) {
    if (!input || !Array.isArray(input.rawItems)) {
      throw new Error('score: rawItems array is required');
    }

    const measure = await _resolveMeasure(input.measure);
    if (!measure) {
      throw new Error(`score: measure not resolvable from '${input.measure}'`);
    }

    // Version-checked resolution. Refuses if Measure.scoringEngineVersion
    // disagrees with the loaded module — preserves the version-pinning
    // guarantee W211b relies on.
    const mod = registry.resolveStrict(measure);

    // Optional pre-flight validation. Modules may decline to expose
    // this — if so, computeDerived itself raises on bad input.
    if (typeof mod.validateRaw === 'function') {
      const v = mod.validateRaw(input.rawItems);
      if (!v.ok) {
        const err = new Error(`score: invalid raw items — ${v.errors.join('; ')}`);
        err.code = 'INVALID_RAW';
        err.errors = v.errors;
        throw err;
      }
    }

    const derived = mod.computeDerived(input.rawItems, input.ctx || {});
    const interpretation = mod.interpret(derived.value, input.ctx || {});

    let delta = null;
    if (typeof input.prevDerived === 'number') {
      delta = mod.delta(input.prevDerived, derived.value, measure);
    }

    return {
      measureCode: measure.code,
      measureVersion: measure.version || null,
      engineVersion: mod.engineVersion,
      derivedType: mod.derivedType,
      direction: mod.direction,
      derived,
      interpretation,
      delta,
      mcidSnapshot: measure.interpretation?.mcid
        ? {
            value: measure.interpretation.mcid.value,
            type: measure.interpretation.mcid.type,
            status: measure.interpretation.mcid.status,
            source: measure.interpretation.mcid.source,
          }
        : null,
      sdcSnapshot: measure.interpretation?.sdc
        ? { value: measure.interpretation.sdc.value, ci: measure.interpretation.sdc.ci }
        : null,
    };
  }

  /**
   * Interpret a derived value without recomputing it (handy when the
   * raw items aren't available but a historic derived value is).
   */
  async interpret(measureRef, derivedValue, ctx = {}) {
    const measure = await _resolveMeasure(measureRef);
    if (!measure) throw new Error(`interpret: measure not resolvable from '${measureRef}'`);
    const mod = registry.resolveStrict(measure);
    return mod.interpret(derivedValue, ctx);
  }

  /**
   * Compute the delta between two derived values for the same measure,
   * using the module's delta() (which centralises MCID/SDC checks).
   */
  async delta(measureRef, prevDerived, currDerived) {
    const measure = await _resolveMeasure(measureRef);
    if (!measure) throw new Error(`delta: measure not resolvable from '${measureRef}'`);
    const mod = registry.resolveStrict(measure);
    return mod.delta(prevDerived, currDerived, measure);
  }

  /**
   * List every scoring module currently registered. Used by
   * /admin/scoring-modules to show governance state at a glance and
   * by tests to assert the catalog is complete.
   */
  list() {
    return registry.list();
  }

  /**
   * Probe whether a Measure has a wired scoring module. Callers that
   * fall back to manual totals (e.g. legacy admin flow) can use this
   * to decide whether to delegate.
   */
  hasModule(measureCode) {
    return registry.has(measureCode);
  }

  /**
   * W553 — Return the digital item bank (bilingual questionnaire) for a
   * measure code, or null when the module has no bank. Drives the
   * digital-administration UI + GET /measures/:code/item-bank.
   */
  getItemBank(measureCode) {
    return registry.getItemBank(measureCode);
  }

  /**
   * W553 — List every measure code that ships a digital item bank.
   * Lets the UI show which standardized instruments can be administered
   * digitally (vs. manual domain-score entry).
   */
  listAdministrable() {
    return registry.list().filter(m => m.hasItemBank);
  }

  /**
   * Re-scan the scoring directory (test/reload only).
   */
  _reload() {
    return registry.reload();
  }
}

// Singleton instance. We export it as-is — callers that want
// destructuring can use the singleton's bound methods (e.g.
// `const { score } = require('.../measureScoringEngine.service');
// score.bind(svc)` — or just use the singleton, which is the
// canonical pattern across this codebase).
const svc = new MeasureScoringEngineSvc();
module.exports = svc;

// Quiet the linter — logger is wired for future use (e.g. score-time
// telemetry of fallback paths) but unused right now.
void logger;
