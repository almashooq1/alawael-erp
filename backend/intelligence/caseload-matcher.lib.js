'use strict';

/**
 * caseload-matcher.lib.js — Wave 432 (Phase E4 — Caseload Matcher V2).
 *
 * Pure ranking library that scores therapist candidates against a
 * beneficiary's needs and returns the best matches. Pairs with the
 * W352 `therapistWorkload.service.js` (which reports CURRENT load) by
 * adding the SCORING layer that selects the right therapist for a new
 * beneficiary assignment.
 *
 * Design principles:
 *   1. PURE — no DB, no I/O. Callers fetch therapist + beneficiary
 *      shapes and pass them in. The lib just scores + sorts.
 *   2. SPECIALTY IS A HARD GATE — a therapist whose specialty doesn't
 *      cover the beneficiary's required specialty gets score=0 + an
 *      `excluded: 'SPECIALTY_MISMATCH'` flag. No exceptions; clinical
 *      safety > load balancing.
 *   3. EXPLAINABLE — every score returns the factor breakdown so the
 *      assignment dialog can render "why this therapist is the best
 *      match" (mirrors W337/W339/W429/W431 adapter pattern).
 *   4. CONTINUITY-AWARE — historyWithBeneficiary contributes 20% so
 *      the matcher prefers a therapist the beneficiary has worked with
 *      before (reduces re-rapport-building burden).
 *
 * Soft-factor weighting (after specialty hard gate passes):
 *   currentLoad (inverse)         30%   0 = max load → 1.0 = empty
 *   historyWithBeneficiary        20%   prior sessions in last 6 months
 *   language match                15%   exact > partial-overlap > none
 *   branch/region proximity       15%   same branch > same region > other
 *   gender preference             10%   match > no preference > mismatch
 *   experience years              10%   log-scale: 0y=0.0 → 10y=1.0 saturating
 *
 * Sum = 100%. Score clamped to [0, 1].
 */

const FACTOR_WEIGHTS = Object.freeze({
  currentLoad: 0.3,
  historyWithBeneficiary: 0.2,
  languageMatch: 0.15,
  branchProximity: 0.15,
  genderPreference: 0.1,
  experienceYears: 0.1,
});

const EXPERIENCE_SATURATION_YEARS = 10;

/**
 * Normalize current load (open caseload count) into [0, 1] where 0 = full,
 * 1 = empty. Caller supplies max — the per-branch policy ceiling.
 *
 * @param {number} currentLoad — therapist's current caseload count
 * @param {number} maxLoad     — policy ceiling (W352 default: 25)
 * @returns {number} ∈ [0, 1]
 */
function _loadFactor(currentLoad, maxLoad) {
  if (!Number.isFinite(currentLoad) || !Number.isFinite(maxLoad) || maxLoad <= 0) return 0.5;
  const load = Math.max(0, Math.min(maxLoad, currentLoad));
  return 1 - load / maxLoad;
}

/**
 * Logarithmic experience curve. 0y=0.0, 10y=1.0, asymptotic above.
 */
function _experienceFactor(years) {
  if (!Number.isFinite(years) || years <= 0) return 0;
  const v = Math.log(1 + years) / Math.log(1 + EXPERIENCE_SATURATION_YEARS);
  return Math.max(0, Math.min(1, v));
}

/**
 * Language overlap score:
 *   exact match in any preferred language → 1.0
 *   ≥1 language in common (not preferred)  → 0.5
 *   no overlap                             → 0.0
 *
 * @param {string[]} therapistLangs — e.g. ['ar', 'en']
 * @param {string[]} beneficiaryLangs — e.g. ['ar']
 * @param {string} [primaryPreferred] — beneficiary's primary preference
 */
function _languageFactor(therapistLangs, beneficiaryLangs, primaryPreferred = null) {
  if (!Array.isArray(therapistLangs) || !Array.isArray(beneficiaryLangs)) return 0;
  if (therapistLangs.length === 0 || beneficiaryLangs.length === 0) return 0;
  if (primaryPreferred && therapistLangs.includes(primaryPreferred)) return 1.0;
  // Any overlap with declared beneficiary languages
  const benSet = new Set(beneficiaryLangs);
  for (const t of therapistLangs) {
    if (benSet.has(t)) return 0.5;
  }
  return 0;
}

/**
 * Branch proximity:
 *   same branch  → 1.0
 *   same region  → 0.5
 *   other        → 0.2
 *   neither known → 0
 */
function _proximityFactor(therapist, beneficiary) {
  const tBranch = therapist?.branchId ? String(therapist.branchId) : null;
  const bBranch = beneficiary?.branchId ? String(beneficiary.branchId) : null;
  if (!tBranch || !bBranch) return 0;
  if (tBranch === bBranch) return 1.0;
  const tRegion = therapist?.regionId ? String(therapist.regionId) : null;
  const bRegion = beneficiary?.regionId ? String(beneficiary.regionId) : null;
  if (tRegion && bRegion && tRegion === bRegion) return 0.5;
  return 0.2;
}

/**
 * Gender-preference score:
 *   beneficiary has explicit preference matching therapist  → 1.0
 *   beneficiary has 'no_preference'                          → 0.5
 *   explicit mismatch                                        → 0.0
 *   not declared                                             → 0.5 (neutral)
 */
function _genderFactor(therapist, beneficiary) {
  const pref = beneficiary?.therapistGenderPreference;
  if (!pref || pref === 'no_preference' || pref === 'any') return 0.5;
  const therapistGender = therapist?.gender;
  if (!therapistGender) return 0.5;
  return pref === therapistGender ? 1.0 : 0.0;
}

/**
 * History continuity score:
 *   ≥3 prior sessions in last 180 days → 1.0
 *   1-2 prior sessions in last 180 days → 0.6
 *   0 prior                             → 0.0
 *
 * @param {number} priorSessionCount180d
 */
function _historyFactor(priorSessionCount180d) {
  if (!Number.isFinite(priorSessionCount180d) || priorSessionCount180d <= 0) return 0;
  if (priorSessionCount180d >= 3) return 1.0;
  return 0.6;
}

/**
 * Specialty hard gate. Returns true if the therapist's specialties cover
 * the beneficiary's required specialty (or any of them, when an array is given).
 *
 * @param {string[]} therapistSpecialties — e.g. ['speech_therapy', 'aac']
 * @param {string|string[]} required      — required specialty (or list)
 * @returns {boolean}
 */
function _specialtyCovers(therapistSpecialties, required) {
  if (!Array.isArray(therapistSpecialties) || therapistSpecialties.length === 0) return false;
  const reqList = Array.isArray(required) ? required : [required];
  for (const r of reqList) {
    if (r && therapistSpecialties.includes(r)) return true;
  }
  return false;
}

/**
 * Score a single therapist candidate against a beneficiary's needs.
 *
 * @param {Object} therapist
 *   @param {string[]} therapist.specialties
 *   @param {string[]} [therapist.languages]    e.g. ['ar', 'en']
 *   @param {string}   [therapist.gender]       'male' | 'female' | …
 *   @param {string}   [therapist.branchId]
 *   @param {string}   [therapist.regionId]
 *   @param {number}   [therapist.currentLoad]
 *   @param {number}   [therapist.experienceYears]
 *   @param {number}   [therapist.priorSessionsWithBeneficiary180d]
 * @param {Object} beneficiary
 *   @param {string|string[]} beneficiary.requiredSpecialty
 *   @param {string[]} [beneficiary.languages]
 *   @param {string}   [beneficiary.primaryLanguage]
 *   @param {string}   [beneficiary.therapistGenderPreference]
 *   @param {string}   [beneficiary.branchId]
 *   @param {string}   [beneficiary.regionId]
 * @param {Object} [ctx]
 *   @param {number}   [ctx.maxLoad=25]   policy load ceiling (W352 default)
 * @returns {{score: number, signals: Array, breakdown: Object, excluded?: string}}
 */
function scoreCandidate(therapist = {}, beneficiary = {}, ctx = {}) {
  const maxLoad = Number.isFinite(ctx.maxLoad) ? ctx.maxLoad : 25;

  // 0. Specialty hard gate.
  if (!_specialtyCovers(therapist.specialties, beneficiary.requiredSpecialty)) {
    return {
      score: 0,
      signals: [],
      breakdown: {},
      excluded: 'SPECIALTY_MISMATCH',
    };
  }

  // Soft factors.
  const load = _loadFactor(therapist.currentLoad ?? 0, maxLoad);
  const history = _historyFactor(therapist.priorSessionsWithBeneficiary180d ?? 0);
  const language = _languageFactor(
    therapist.languages,
    beneficiary.languages,
    beneficiary.primaryLanguage
  );
  const proximity = _proximityFactor(therapist, beneficiary);
  const gender = _genderFactor(therapist, beneficiary);
  const experience = _experienceFactor(therapist.experienceYears);

  const score =
    load * FACTOR_WEIGHTS.currentLoad +
    history * FACTOR_WEIGHTS.historyWithBeneficiary +
    language * FACTOR_WEIGHTS.languageMatch +
    proximity * FACTOR_WEIGHTS.branchProximity +
    gender * FACTOR_WEIGHTS.genderPreference +
    experience * FACTOR_WEIGHTS.experienceYears;

  const clamped = Math.max(0, Math.min(1, score));

  const signals = [];
  if (load > 0) {
    signals.push({
      name: 'currentLoad',
      weight: FACTOR_WEIGHTS.currentLoad,
      evidence: `load=${therapist.currentLoad ?? 0}/${maxLoad} → factor=${load.toFixed(2)}`,
    });
  }
  if (history > 0) {
    signals.push({
      name: 'historyWithBeneficiary',
      weight: FACTOR_WEIGHTS.historyWithBeneficiary,
      evidence: `priorSessions(180d)=${therapist.priorSessionsWithBeneficiary180d} → factor=${history.toFixed(2)}`,
    });
  }
  if (language > 0) {
    signals.push({
      name: 'languageMatch',
      weight: FACTOR_WEIGHTS.languageMatch,
      evidence: `therapist=${(therapist.languages || []).join(',')} vs beneficiary=${(beneficiary.languages || []).join(',')} → factor=${language.toFixed(2)}`,
    });
  }
  if (proximity > 0) {
    signals.push({
      name: 'branchProximity',
      weight: FACTOR_WEIGHTS.branchProximity,
      evidence: `proximity factor=${proximity.toFixed(2)}`,
    });
  }
  if (gender > 0) {
    signals.push({
      name: 'genderPreference',
      weight: FACTOR_WEIGHTS.genderPreference,
      evidence: `pref=${beneficiary.therapistGenderPreference || 'none'} vs therapist=${therapist.gender || 'unknown'} → factor=${gender.toFixed(2)}`,
    });
  }
  if (experience > 0) {
    signals.push({
      name: 'experienceYears',
      weight: FACTOR_WEIGHTS.experienceYears,
      evidence: `years=${therapist.experienceYears} → factor=${experience.toFixed(2)}`,
    });
  }

  return {
    score: clamped,
    signals,
    breakdown: { load, history, language, proximity, gender, experience },
  };
}

/**
 * Rank a list of therapist candidates against a beneficiary. Excluded
 * (specialty mismatch) candidates are filtered out — their presence
 * in a "best match" list would be a clinical safety bug.
 *
 * @param {Object[]} therapists
 * @param {Object} beneficiary
 * @param {Object} [ctx]
 * @returns {Array<{therapist, score, signals}>}
 */
function rankCandidates(therapists, beneficiary, ctx = {}) {
  if (!Array.isArray(therapists)) return [];
  const scored = [];
  for (let i = 0; i < therapists.length; i++) {
    const t = therapists[i];
    const r = scoreCandidate(t, beneficiary, ctx);
    if (r.excluded) continue;
    scored.push({ therapist: t, score: r.score, signals: r.signals, _idx: i });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a._idx - b._idx; // stable
  });
  return scored.map(({ therapist, score, signals }) => ({ therapist, score, signals }));
}

/**
 * Top-N convenience — returns the highest-ranked therapists.
 *
 * @param {Object[]} therapists
 * @param {Object} beneficiary
 * @param {number} n
 * @param {Object} [ctx]
 * @returns {Array<{therapist, score, signals}>}
 */
function topCandidates(therapists, beneficiary, n, ctx = {}) {
  if (!Number.isFinite(n) || n <= 0) return [];
  return rankCandidates(therapists, beneficiary, ctx).slice(0, n);
}

module.exports = {
  scoreCandidate,
  rankCandidates,
  topCandidates,
  FACTOR_WEIGHTS,
  EXPERIENCE_SATURATION_YEARS,
  // Internal helpers exported for unit tests
  _loadFactor,
  _experienceFactor,
  _languageFactor,
  _proximityFactor,
  _genderFactor,
  _historyFactor,
  _specialtyCovers,
};
