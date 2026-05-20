'use strict';

/**
 * _contract.js — Wave 212
 *
 * Validates the shape of a per-measure scoring module. Every module
 * under backend/measures/scoring/{code}.js must export the contract
 * below, or the registry refuses to load it. This is the structural
 * counterpart to the W210 governance fields on Measure — together they
 * guarantee a scored administration can always be re-derived from raw
 * items and a frozen version pair.
 *
 * The contract:
 *
 *   {
 *     measureCode:    string  — must match the Measure.code it targets
 *     engineVersion:  string  — SemVer; must equal Measure.scoringEngineVersion
 *     derivedType:    string  — sum | weighted_sum | rasch | lookup_table | algorithm
 *     direction:      string  — higher_better | lower_better | neutral
 *
 *     computeDerived(rawItems, ctx) → { value: number, subscales?: {...} }
 *     interpret(derivedValue, ctx)  → { band, tier?, label_ar, label_en, severity, color, action_ar? }
 *     delta(prev, curr, measure)    → { absolute, relative, direction, mcidMet, sdcMet }
 *
 *     // Optional:
 *     validateRaw(rawItems) → { ok: boolean, errors: string[] }
 *     subscaleDerivedTypes: { [subscale: string]: 'sum'|'rasch'|... }
 *   }
 *
 * The registry caches modules by code+engineVersion, so re-resolving
 * the same code returns the same instance.
 */

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const VALID_DERIVED = new Set(['sum', 'weighted_sum', 'rasch', 'lookup_table', 'algorithm']);
const VALID_DIRECTION = new Set(['higher_better', 'lower_better', 'neutral']);

/**
 * Validate a scoring module against the contract. Returns the module
 * frozen on success; throws a descriptive Error on failure (so a bad
 * module is caught at load time, not at first administration).
 */
function validateContract(mod, sourcePath) {
  const src = sourcePath || '(anonymous)';
  if (!mod || typeof mod !== 'object') {
    throw new Error(`[scoring/${src}] module export must be an object`);
  }

  // ─── Required string fields ────────────────────────────────────────
  if (!mod.measureCode || typeof mod.measureCode !== 'string') {
    throw new Error(`[scoring/${src}] missing or non-string measureCode`);
  }
  if (!mod.engineVersion || typeof mod.engineVersion !== 'string') {
    throw new Error(`[scoring/${src}] missing or non-string engineVersion`);
  }
  if (!SEMVER_RE.test(mod.engineVersion)) {
    throw new Error(
      `[scoring/${src}] engineVersion '${mod.engineVersion}' is not SemVer (e.g. 1.0.0)`
    );
  }
  if (!VALID_DERIVED.has(mod.derivedType)) {
    throw new Error(
      `[scoring/${src}] derivedType '${mod.derivedType}' invalid — must be one of: ` +
        `${[...VALID_DERIVED].join(', ')}`
    );
  }
  if (!VALID_DIRECTION.has(mod.direction)) {
    throw new Error(
      `[scoring/${src}] direction '${mod.direction}' invalid — must be one of: ` +
        `${[...VALID_DIRECTION].join(', ')}`
    );
  }

  // ─── Required functions ────────────────────────────────────────────
  for (const fn of ['computeDerived', 'interpret', 'delta']) {
    if (typeof mod[fn] !== 'function') {
      throw new Error(`[scoring/${src}] missing required function: ${fn}()`);
    }
  }

  // ─── Optional shape checks ─────────────────────────────────────────
  if (mod.validateRaw != null && typeof mod.validateRaw !== 'function') {
    throw new Error(`[scoring/${src}] validateRaw must be a function if provided`);
  }
  if (mod.subscaleDerivedTypes != null) {
    if (typeof mod.subscaleDerivedTypes !== 'object') {
      throw new Error(`[scoring/${src}] subscaleDerivedTypes must be an object`);
    }
    for (const [k, v] of Object.entries(mod.subscaleDerivedTypes)) {
      if (!VALID_DERIVED.has(v)) {
        throw new Error(`[scoring/${src}] subscaleDerivedTypes[${k}]='${v}' invalid`);
      }
    }
  }

  return Object.freeze(mod);
}

/**
 * Apply the standard delta contract — used by simple scoring modules
 * that don't override `delta()` themselves. Centralises the MCID/SDC
 * comparison so we don't drift across modules.
 *
 *   measure.interpretation.mcid.value   — absolute change required
 *   measure.interpretation.sdc.value    — minimum reliable change
 *   module.direction                    — higher_better | lower_better
 */
function standardDelta(prev, curr, measure, direction) {
  if (typeof prev !== 'number' || typeof curr !== 'number') {
    return null;
  }
  const absolute = curr - prev;
  const relative = prev !== 0 ? absolute / Math.abs(prev) : null;

  const mcidVal = measure?.interpretation?.mcid?.value;
  const mcidStatus = measure?.interpretation?.mcid?.status;
  const sdcVal = measure?.interpretation?.sdc?.value;

  // Direction-aware: if lower_better, improvement is negative absolute.
  const improvedSign = direction === 'lower_better' ? -1 : 1;
  const improved = absolute * improvedSign;

  return {
    absolute,
    relative,
    direction: absolute === 0 ? 'stable' : improved > 0 ? 'improving' : 'declining',
    mcidMet:
      mcidVal != null && (mcidStatus === 'established' || mcidStatus === 'provisional')
        ? Math.abs(absolute) >= mcidVal && improved > 0
        : null,
    sdcMet: sdcVal != null ? Math.abs(absolute) >= sdcVal : null,
  };
}

module.exports = { validateContract, standardDelta, SEMVER_RE };
