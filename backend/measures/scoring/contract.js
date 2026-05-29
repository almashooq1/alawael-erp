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

// W553 — declares the shape `computeDerived` expects as its first argument.
// Lets the digital-administration UI know how to collect + submit responses:
//   item_array        — flat numeric array, one entry per item bank item
//   multi_subscale    — object keyed by subscale (Vineland-3 domain scores)
//   domain_scores     — alias of multi_subscale for publisher-normed scales
const VALID_RAW_SHAPE = new Set(['item_array', 'multi_subscale', 'domain_scores']);

/**
 * W553 — Validate an optional `itemBank` block. The item bank is the
 * actual digital questionnaire content (bilingual item text + response
 * options) that the administration UI renders. It lives in the scoring
 * module — co-located with the math that consumes it — so item text and
 * scoring stay versioned together and a clinician never administers a
 * questionnaire whose items drifted from its scorer.
 *
 * Shape (all human text required bilingual):
 *   {
 *     instrumentName_ar, instrumentName_en,      — display title
 *     instrumentVersion: string,                 — publisher revision (NOT engineVersion)
 *     ageRange?: { minMonths, maxMonths },
 *     respondent?: 'clinician' | 'caregiver' | 'self' | 'teacher',
 *     estimatedMinutes?: number,
 *     responseScaleNote_ar?, responseScaleNote_en?,
 *     domains?: [{ key, name_ar, name_en }],
 *     items: [{
 *       number: int (1-based),
 *       text_ar, text_en,
 *       domain?: string,                         — must match a domains[].key when both present
 *       reverseScored?: boolean,
 *       critical?: boolean,                      — e.g. M-CHAT-R critical items
 *       help_ar?, help_en?,                      — examples / clarification
 *       responseOptions?: [{ value:number, label_ar, label_en, atRisk?:boolean }]
 *     }]
 *   }
 *
 * Returns nothing; throws on the first structural problem.
 */
function validateItemBank(itemBank, src) {
  if (typeof itemBank !== 'object' || itemBank === null || Array.isArray(itemBank)) {
    throw new Error(`[scoring/${src}] itemBank must be an object when provided`);
  }
  for (const f of ['instrumentName_ar', 'instrumentName_en', 'instrumentVersion']) {
    if (!itemBank[f] || typeof itemBank[f] !== 'string') {
      throw new Error(`[scoring/${src}] itemBank.${f} required (non-empty string)`);
    }
  }
  if (!Array.isArray(itemBank.items) || itemBank.items.length === 0) {
    throw new Error(`[scoring/${src}] itemBank.items must be a non-empty array`);
  }

  const domainKeys = new Set();
  if (itemBank.domains != null) {
    if (!Array.isArray(itemBank.domains)) {
      throw new Error(`[scoring/${src}] itemBank.domains must be an array when provided`);
    }
    for (const d of itemBank.domains) {
      if (!d || typeof d.key !== 'string' || !d.name_ar || !d.name_en) {
        throw new Error(
          `[scoring/${src}] each itemBank.domains entry needs key + name_ar + name_en`
        );
      }
      domainKeys.add(d.key);
    }
  }

  const seenNumbers = new Set();
  itemBank.items.forEach((item, i) => {
    const at = `itemBank.items[${i}]`;
    if (!item || typeof item !== 'object') {
      throw new Error(`[scoring/${src}] ${at} must be an object`);
    }
    if (!Number.isInteger(item.number) || item.number < 1) {
      throw new Error(`[scoring/${src}] ${at}.number must be a positive integer`);
    }
    if (seenNumbers.has(item.number)) {
      throw new Error(`[scoring/${src}] duplicate itemBank item.number=${item.number}`);
    }
    seenNumbers.add(item.number);
    if (!item.text_ar || typeof item.text_ar !== 'string') {
      throw new Error(`[scoring/${src}] ${at}.text_ar required`);
    }
    if (!item.text_en || typeof item.text_en !== 'string') {
      throw new Error(`[scoring/${src}] ${at}.text_en required`);
    }
    if (item.domain != null && domainKeys.size && !domainKeys.has(item.domain)) {
      throw new Error(
        `[scoring/${src}] ${at}.domain='${item.domain}' not in declared itemBank.domains`
      );
    }
    if (item.responseOptions != null) {
      if (!Array.isArray(item.responseOptions) || item.responseOptions.length === 0) {
        throw new Error(`[scoring/${src}] ${at}.responseOptions must be a non-empty array`);
      }
      item.responseOptions.forEach((opt, j) => {
        if (!opt || typeof opt.value !== 'number') {
          throw new Error(`[scoring/${src}] ${at}.responseOptions[${j}].value must be a number`);
        }
        if (!opt.label_ar || !opt.label_en) {
          throw new Error(`[scoring/${src}] ${at}.responseOptions[${j}] needs label_ar + label_en`);
        }
      });
    }
  });
}

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

  // ─── W553: optional rawShape + itemBank ────────────────────────────
  if (mod.rawShape != null && !VALID_RAW_SHAPE.has(mod.rawShape)) {
    throw new Error(
      `[scoring/${src}] rawShape '${mod.rawShape}' invalid — must be one of: ` +
        `${[...VALID_RAW_SHAPE].join(', ')}`
    );
  }
  if (mod.itemBank != null) {
    validateItemBank(mod.itemBank, src);
    // When the bank is an item_array instrument, the declared item count
    // should agree with the bank size — otherwise the UI renders N items
    // but the scorer expects M, and a silent off-by-one corrupts scores.
    if ((mod.rawShape == null || mod.rawShape === 'item_array') && mod.expectedItemCount != null) {
      if (mod.expectedItemCount !== mod.itemBank.items.length) {
        throw new Error(
          `[scoring/${src}] expectedItemCount=${mod.expectedItemCount} disagrees with ` +
            `itemBank.items.length=${mod.itemBank.items.length}`
        );
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

module.exports = { validateContract, validateItemBank, standardDelta, SEMVER_RE, VALID_RAW_SHAPE };
