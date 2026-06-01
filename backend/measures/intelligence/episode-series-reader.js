'use strict';

/**
 * measures/intelligence/episode-series-reader.js — W711
 *
 * WHY this exists (the connective-tissue gap, part 2):
 *   W709 gave us `detectDeterioration({ measures })` — a PURE fusion of the
 *   trend + scoring layers into one beneficiary-level "is this person sliding?"
 *   signal. But it expects a hand-shaped `measures[]` array: each measure
 *   pre-enriched with its `direction`, `cutoff`, `sdc`, `latestBandSeverity`
 *   and a chronological `administrations[]`. Nothing built that array FROM the
 *   raw administration rows an Episode of Care actually stores.
 *
 *   This reader is that adapter. The caller resolves the episode's scored
 *   administration rows from persistence (one row per measurement) and passes
 *   them in. The reader:
 *     • groups rows by measureCode,
 *     • enriches each group from the scoring registry (direction / cutoff /
 *       sdc / latest interpreted band severity), and
 *     • hands the result straight to `detectDeterioration`.
 *
 * Contract: PURE. No DB, no I/O, no clock, no mutation, no events. It only
 * READS the in-process scoring registry (itself pure) and the rows you pass.
 * The Episode of Care, Plan of Care and event bus are never touched here —
 * keeping the longitudinal-file / single-source-of-truth doctrine intact while
 * still wiring the measures layer into the core decision surface.
 */

const registry = require('../scoring');
const { detectDeterioration } = require('./deterioration');

/** Field-name tolerance — administration rows differ across persistence paths. */
const CODE_KEYS = ['measureCode', 'code', 'measure_code'];
const VALUE_KEYS = ['derivedValue', 'value', 'score', 'derived_value'];
const DATE_KEYS = ['administeredAt', 'scoredAt', 'date', 'createdAt', 'recordedAt'];

function _pick(row, keys) {
  for (const k of keys) {
    if (row[k] != null) return row[k];
  }
  return undefined;
}

/**
 * Read the severity of the band the scoring module assigns to a derived value.
 * Returns null when the measure has no scoring module or interpret throws
 * (e.g. out-of-range value) — we never let a single bad row crash the read.
 * @param {string} measureCode
 * @param {number} derivedValue
 * @returns {string|null}
 */
function _bandSeverity(measureCode, derivedValue) {
  const mod = registry.resolve(measureCode);
  if (!mod || typeof mod.interpret !== 'function' || !Number.isFinite(derivedValue)) {
    return null;
  }
  try {
    const band = mod.interpret(derivedValue, {});
    return band && band.severity ? band.severity : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Turn raw administration rows into the `measures[]` array that
 * `detectDeterioration` consumes.
 *
 * @param {Array<Object>} administrations  one row per scored administration
 * @param {Object} [opts]
 * @param {Object} [opts.names]   optional { [measureCode]: { ar, en } } overrides
 * @returns {Array<Object>} measures[] enriched + chronologically ordered
 */
function buildMeasuresFromAdministrations(administrations, opts = {}) {
  const rows = Array.isArray(administrations) ? administrations : [];
  const names = opts.names || {};
  const byCode = new Map();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const code = _pick(row, CODE_KEYS);
    const value = Number(_pick(row, VALUE_KEYS));
    const date = _pick(row, DATE_KEYS);
    if (!code || !Number.isFinite(value) || date == null) continue;

    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push({ date, value });
  }

  const measures = [];
  for (const [code, admins] of byCode) {
    admins.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mod = registry.resolve(code);
    const latest = admins[admins.length - 1];
    const nameOverride = names[code] || {};

    measures.push({
      measureCode: code,
      name_ar: nameOverride.ar || code,
      name_en: nameOverride.en || code,
      direction: mod ? mod.direction : 'neutral',
      cutoff: mod && mod.cutoff != null ? mod.cutoff : undefined,
      sdc: mod && mod.sdc != null ? mod.sdc : undefined,
      latestBandSeverity: _bandSeverity(code, latest.value),
      administrations: admins,
    });
  }

  return measures;
}

/**
 * End-to-end: read an episode's administration rows → deterioration picture.
 * Pure pass-through wrapper that keeps episode identity on the result so a
 * dashboard / care-team alert can attribute the signal without a second query.
 *
 * @param {Object} episode
 * @param {*} [episode.episodeId]
 * @param {*} [episode.beneficiaryId]
 * @param {Array<Object>} episode.administrations
 * @param {Object} [opts]   passed to buildMeasures + detectDeterioration.options
 * @returns {Object} { episodeId, beneficiaryId, summary, signals, meta }
 */
function analyzeEpisode(episode = {}, opts = {}) {
  const measures = buildMeasuresFromAdministrations(episode.administrations, opts);
  const result = detectDeterioration({ measures, options: opts.options || {} });
  return {
    episodeId: episode.episodeId != null ? episode.episodeId : null,
    beneficiaryId: episode.beneficiaryId != null ? episode.beneficiaryId : null,
    ...result,
  };
}

module.exports = {
  buildMeasuresFromAdministrations,
  analyzeEpisode,
};
