'use strict';

/**
 * rules.js — Wave 218 Clinical Measure Selection Strategist (pure layer)
 *
 * Decision logic for "which Measure should this beneficiary take, now?".
 * Pure functions — no DB access, no I/O. The orchestrator in
 * services/measureSelectionStrategist.service.js loads documents and
 * delegates to these helpers, so this file can be unit-tested without
 * Mongo.
 *
 * Two phases:
 *
 *   filterCandidate(measure, ctx) → { eligible, reasonCodes[] }
 *     Hard exclusions. If eligible=false, the measure is dropped from
 *     ranking entirely. reasonCodes explains every failure so the UI
 *     can show the clinician why an expected measure didn't appear.
 *
 *   scoreCandidate(measure, ctx) → { score, reasonCodes[] }
 *     Weighted scorer. Higher wins. reasonCodes lists every positive
 *     AND negative signal that contributed. Same code can appear in
 *     filter and score arrays — the filter reasons explain exclusion,
 *     the score reasons explain ranking.
 *
 * The ctx object the orchestrator hands in:
 *   {
 *     beneficiary: { ageMonths, icd10[], language? },
 *     discipline,         // 'speech_therapist' | 'physical_therapist' | ...
 *     clinicalQuestion,   // 'screening' | 'baseline' | 'progress' | 'discharge' | 'referral'
 *     phase,              // 'intake' | 'baseline' | 'mid' | 'reassessment' | 'discharge' | 'follow-up'
 *     domain,             // 'motor' | 'communication' | 'cognitive' | ...
 *     availableMinutes,
 *     respondents: ['parent','clinician',...],
 *     setting,            // 'clinic' | 'home' | 'school' | 'tele'
 *     raterCertifications: [],
 *     administeredMeasureCodes: [],
 *     baselineMeasureCode,        // for discharge continuity check
 *     historyByMeasureId: Map<measureIdStr, { lastDate, lastTotalRawScore, lastIsBaseline }>,
 *     now: Date,
 *   }
 */

// ─── Reason codes ──────────────────────────────────────────────────────
// Local to the strategist. The canonical reason-codes registry is for
// SoD / workflow refusals; selection reasons are domain-specific and
// would clutter that registry.
const REASON_CODES = Object.freeze({
  // ── Hard-filter exclusions ──────────────────────────────────────────
  OUT_OF_AGE_RANGE: 'OUT_OF_AGE_RANGE',
  DIAGNOSIS_NOT_INDICATED: 'DIAGNOSIS_NOT_INDICATED',
  DIAGNOSIS_EXCLUDED: 'DIAGNOSIS_EXCLUDED',
  MEASURE_NOT_PUBLISHED: 'MEASURE_NOT_PUBLISHED',
  COOLDOWN_NOT_ELAPSED: 'COOLDOWN_NOT_ELAPSED',
  RESPONDENT_UNAVAILABLE: 'RESPONDENT_UNAVAILABLE',
  ARABIC_VALIDATION_MISSING: 'ARABIC_VALIDATION_MISSING',
  CERTIFICATION_MISSING: 'CERTIFICATION_MISSING',
  PREREQUISITE_MISSING: 'PREREQUISITE_MISSING',
  TIME_BUDGET_EXCEEDED: 'TIME_BUDGET_EXCEEDED',
  PURPOSE_MISMATCH: 'PURPOSE_MISMATCH',
  DISCHARGE_REQUIRES_BASELINE_CONTINUITY: 'DISCHARGE_REQUIRES_BASELINE_CONTINUITY',
  // ── Soft-score signals (positive) ───────────────────────────────────
  DOMAIN_PRIMARY_MATCH: 'DOMAIN_PRIMARY_MATCH',
  DOMAIN_SECONDARY_MATCH: 'DOMAIN_SECONDARY_MATCH',
  DISCIPLINE_PRIMARY_TOOLKIT: 'DISCIPLINE_PRIMARY_TOOLKIT',
  ARABIC_VALIDATED: 'ARABIC_VALIDATED',
  LONGITUDINAL_CONTINUITY: 'LONGITUDINAL_CONTINUITY',
  MCID_AVAILABLE: 'MCID_AVAILABLE',
  BURDEN_FITS_TIME: 'BURDEN_FITS_TIME',
  LOW_SENSITIVITY_GRADE: 'LOW_SENSITIVITY_GRADE',
  PHASE_BASELINE_GOLD_STANDARD: 'PHASE_BASELINE_GOLD_STANDARD',
  // ── Soft-score signals (negative) ───────────────────────────────────
  RECENT_NO_MCID_CHANGE: 'RECENT_NO_MCID_CHANGE',
  // ── Output flags ────────────────────────────────────────────────────
  FALLBACK_USED: 'FALLBACK_USED',
  NO_VIABLE_MEASURE: 'NO_VIABLE_MEASURE',
});

// ─── Weights ───────────────────────────────────────────────────────────
// Tuned so the dominant signal (domain match + discipline toolkit) wins
// over comfort signals (Arabic validation, low sensitivity). Continuity
// is deliberately heavy so re-assessment phase picks the baseline tool.
const WEIGHTS = Object.freeze({
  DOMAIN_PRIMARY_MATCH: 5,
  DOMAIN_SECONDARY_MATCH: 2,
  DISCIPLINE_PRIMARY_TOOLKIT: 4,
  ARABIC_VALIDATED: 2,
  LONGITUDINAL_CONTINUITY: 3,
  MCID_AVAILABLE: 2,
  BURDEN_FITS_TIME: 1,
  LOW_SENSITIVITY_GRADE: 1,
  PHASE_BASELINE_GOLD_STANDARD: 2,
  RECENT_NO_MCID_CHANGE: -3,
});

// ─── Discipline → primary toolkit (measure.code matching) ──────────────
// Codes are matched case-insensitive against measure.code. A measure
// listed here for the discipline gets the discipline-toolkit bonus.
// Falls back to checking measure.administeredBy when the code isn't
// in any toolkit (every discipline gets credit for their declared tools).
const DISCIPLINE_PRIMARY_TOOLKIT = Object.freeze({
  physical_therapist: ['BERG', 'GMFM-66', 'GMFM-88', 'FIM', 'TUG', '6MWT', 'POMA'],
  occupational_therapist: ['MACS', 'WEEFIM', 'FIM', 'COPM', 'SP-2', 'BRIEF-2', 'PEDI'],
  speech_therapist: ['CFCS', 'PLS-5', 'REEL-3', 'WAB', 'COMM-MATRIX'],
  psychologist: ['M-CHAT-R', 'CARS-2', 'SCQ', 'SRS-2', 'VINELAND-3', 'ABAS-3', 'CBCL'],
  special_educator: ['PORTAGE', 'WPPSI', 'WISC', 'KABC-2', 'BRIEF-2'],
});

const ICD10_RE = /^[A-Z]\d{2}(\.\d+)?(\.\*)?$/i;

// ─── Helpers ───────────────────────────────────────────────────────────

function _matchIcd(pattern, code) {
  if (!pattern || !code) return false;
  const p = String(pattern).toUpperCase();
  const c = String(code).toUpperCase();
  if (p.endsWith('.*')) return c.startsWith(p.slice(0, -2));
  return c === p;
}

function _ageInMonths(beneficiary) {
  if (!beneficiary) return null;
  if (typeof beneficiary.ageMonths === 'number') return beneficiary.ageMonths;
  if (typeof beneficiary.ageYears === 'number') return beneficiary.ageYears * 12;
  if (beneficiary.dob) {
    const dob = beneficiary.dob instanceof Date ? beneficiary.dob : new Date(beneficiary.dob);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    return Math.max(0, months);
  }
  return null;
}

function _ageValueInMeasureUnit(measure, ageMonths) {
  if (ageMonths == null) return null;
  return measure.ageRange?.unit === 'months' ? ageMonths : ageMonths / 12;
}

function _normaliseCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
}

function _disciplineMatchesAdministeredBy(measure, discipline) {
  if (!discipline) return false;
  const list = measure.administeredBy || [];
  if (!Array.isArray(list) || !list.length) return false;
  if (list.includes('any_trained')) return true;
  return list.includes(discipline);
}

function _isInToolkit(discipline, measureCode) {
  const toolkit = DISCIPLINE_PRIMARY_TOOLKIT[discipline];
  if (!toolkit) return false;
  const target = _normaliseCode(measureCode);
  return toolkit.some(t => _normaliseCode(t) === target);
}

// ─── filterCandidate ───────────────────────────────────────────────────

function filterCandidate(measure, ctx) {
  const reasons = [];

  // 1. Status
  if (measure.status && measure.status !== 'active') {
    reasons.push(REASON_CODES.MEASURE_NOT_PUBLISHED);
  }

  // 2. Age range
  if (measure.ageRange?.min != null && measure.ageRange?.max != null) {
    const ageMonths = _ageInMonths(ctx.beneficiary);
    if (ageMonths == null) {
      reasons.push(REASON_CODES.OUT_OF_AGE_RANGE);
    } else {
      const ageVal = _ageValueInMeasureUnit(measure, ageMonths);
      if (ageVal < measure.ageRange.min || ageVal > measure.ageRange.max) {
        reasons.push(REASON_CODES.OUT_OF_AGE_RANGE);
      }
    }
  }

  // 3. ICD-10 inclusion
  const benIcd = ctx.beneficiary?.icd10 || ctx.beneficiary?.diagnosis_codes || [];
  const benIcdArr = Array.isArray(benIcd) ? benIcd : [benIcd];
  const req = measure.eligibility?.icd10Required || [];
  if (req.length && !req.some(p => benIcdArr.some(c => _matchIcd(p, c)))) {
    reasons.push(REASON_CODES.DIAGNOSIS_NOT_INDICATED);
  }

  // 4. ICD-10 exclusion
  const exc = measure.eligibility?.icd10Excluded || [];
  if (exc.length && exc.some(p => benIcdArr.some(c => _matchIcd(p, c)))) {
    reasons.push(REASON_CODES.DIAGNOSIS_EXCLUDED);
  }

  // 5. Cooldown — re-administration before minIntervalDays
  const minInterval = measure.reassessment?.minIntervalDays;
  if (minInterval && ctx.historyByMeasureId) {
    const histKey = String(measure._id || measure.id || '');
    const prior = ctx.historyByMeasureId.get(histKey);
    if (prior && prior.lastDate) {
      const now = ctx.now || new Date();
      const ageMs = now.getTime() - new Date(prior.lastDate).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < minInterval) {
        reasons.push(REASON_CODES.COOLDOWN_NOT_ELAPSED);
      }
    }
  }

  // 6. Respondent availability
  // Parent-report measures need a parent in respondents; clinician-obs
  // need a clinician. We use a soft check on administeredBy.
  const respondents = ctx.respondents || [];
  const admBy = measure.administeredBy || [];
  if (admBy.includes('parent_caregiver') && admBy.length === 1) {
    // Strictly parent-reported
    if (!respondents.includes('parent')) {
      reasons.push(REASON_CODES.RESPONDENT_UNAVAILABLE);
    }
  }

  // 7. Arabic-validation gate
  // Only enforced when the family explicitly can't read English. Default
  // is permissive — clinics often run measures in either language.
  if (ctx.beneficiary?.language === 'ar-only') {
    const langs = measure.eligibility?.languages || [];
    if (langs.length && !langs.some(l => /^ar/i.test(l))) {
      reasons.push(REASON_CODES.ARABIC_VALIDATION_MISSING);
    }
  }

  // 8. Certification requirement
  if (measure.eligibility?.certificationRequired) {
    const certs = ctx.raterCertifications || [];
    if (!certs.includes(measure.eligibility.certificationRequired)) {
      reasons.push(REASON_CODES.CERTIFICATION_MISSING);
    }
  }

  // 9. Prerequisite measures
  const prereq = measure.eligibility?.prerequisiteMeasures || [];
  if (prereq.length) {
    const admin = (ctx.administeredMeasureCodes || []).map(_normaliseCode);
    const missing = prereq.filter(p => !admin.includes(_normaliseCode(p)));
    if (missing.length) reasons.push(REASON_CODES.PREREQUISITE_MISSING);
  }

  // 10. Time budget — hard cap. If the measure takes 60 min and you have
  //     15, exclude it (don't just penalise).
  if (typeof ctx.availableMinutes === 'number' && measure.administrationTime) {
    if (measure.administrationTime > ctx.availableMinutes) {
      reasons.push(REASON_CODES.TIME_BUDGET_EXCEEDED);
    }
  }

  // 11. Phase / clinical-question gating
  //     'screening' phase must use a measure declared as screening.
  //     'baseline' / 'progress' / 'discharge' / 'reassessment' must use
  //     an outcome/functional measure (not a pure screener).
  if (ctx.clinicalQuestion === 'screening') {
    if (measure.purpose && measure.purpose !== 'screening') {
      reasons.push(REASON_CODES.PURPOSE_MISMATCH);
    }
  } else if (['baseline', 'progress', 'discharge', 'reassessment'].includes(ctx.clinicalQuestion)) {
    if (measure.purpose === 'screening') {
      reasons.push(REASON_CODES.PURPOSE_MISMATCH);
    }
  }

  // 12. Discharge continuity — must use the same code as baseline.
  if (
    ctx.clinicalQuestion === 'discharge' &&
    ctx.baselineMeasureCode &&
    _normaliseCode(measure.code) !== _normaliseCode(ctx.baselineMeasureCode)
  ) {
    reasons.push(REASON_CODES.DISCHARGE_REQUIRES_BASELINE_CONTINUITY);
  }

  return { eligible: reasons.length === 0, reasonCodes: reasons };
}

// ─── scoreCandidate ────────────────────────────────────────────────────

function scoreCandidate(measure, ctx) {
  const reasons = [];
  let score = 0;

  // Domain match
  if (ctx.domain && measure.category === ctx.domain) {
    score += WEIGHTS.DOMAIN_PRIMARY_MATCH;
    reasons.push(REASON_CODES.DOMAIN_PRIMARY_MATCH);
  } else if (ctx.domain && measure.targetPopulation?.includes(ctx.domain)) {
    score += WEIGHTS.DOMAIN_SECONDARY_MATCH;
    reasons.push(REASON_CODES.DOMAIN_SECONDARY_MATCH);
  }

  // Discipline primary toolkit OR administeredBy includes discipline
  if (ctx.discipline) {
    if (_isInToolkit(ctx.discipline, measure.code)) {
      score += WEIGHTS.DISCIPLINE_PRIMARY_TOOLKIT;
      reasons.push(REASON_CODES.DISCIPLINE_PRIMARY_TOOLKIT);
    } else if (_disciplineMatchesAdministeredBy(measure, ctx.discipline)) {
      score += WEIGHTS.DISCIPLINE_PRIMARY_TOOLKIT / 2; // half-credit
      reasons.push(REASON_CODES.DISCIPLINE_PRIMARY_TOOLKIT);
    }
  }

  // Arabic validation
  const langs = measure.eligibility?.languages || [];
  const cultAdapt = measure.eligibility?.culturalAdaptation;
  if (langs.some(l => /^ar/i.test(l)) || cultAdapt === 'done') {
    score += WEIGHTS.ARABIC_VALIDATED;
    reasons.push(REASON_CODES.ARABIC_VALIDATED);
  }

  // Longitudinal continuity — same code used in baseline
  if (
    ctx.baselineMeasureCode &&
    _normaliseCode(measure.code) === _normaliseCode(ctx.baselineMeasureCode)
  ) {
    score += WEIGHTS.LONGITUDINAL_CONTINUITY;
    reasons.push(REASON_CODES.LONGITUDINAL_CONTINUITY);
  }

  // MCID available + cited
  const mcid = measure.interpretation?.mcid;
  if (
    mcid &&
    mcid.value != null &&
    (mcid.status === 'established' || mcid.status === 'provisional')
  ) {
    score += WEIGHTS.MCID_AVAILABLE;
    reasons.push(REASON_CODES.MCID_AVAILABLE);
  }

  // Time fits comfortably (< 80% of budget) — feasibility bonus
  if (
    typeof ctx.availableMinutes === 'number' &&
    measure.administrationTime &&
    measure.administrationTime <= ctx.availableMinutes * 0.8
  ) {
    score += WEIGHTS.BURDEN_FITS_TIME;
    reasons.push(REASON_CODES.BURDEN_FITS_TIME);
  }

  // Lower sensitivity grade — PDPL economy tiebreak
  if (measure.sensitivityLevel === 'LOW') {
    score += WEIGHTS.LOW_SENSITIVITY_GRADE;
    reasons.push(REASON_CODES.LOW_SENSITIVITY_GRADE);
  }

  // Baseline-phase preference for outcome / functional_status
  if (
    ctx.clinicalQuestion === 'baseline' &&
    (measure.purpose === 'outcome' || measure.purpose === 'functional_status')
  ) {
    score += WEIGHTS.PHASE_BASELINE_GOLD_STANDARD;
    reasons.push(REASON_CODES.PHASE_BASELINE_GOLD_STANDARD);
  }

  // Recent admin without MCID-level change — penalise re-administering
  // before signal can plausibly appear. We use ≥ minIntervalDays for
  // cooldown (hard filter); this is a softer band between min and
  // standardInterval where the previous result was below MCID.
  const minInterval = measure.reassessment?.minIntervalDays;
  const stdInterval = measure.reassessment?.standardIntervalDays;
  if (minInterval && stdInterval && ctx.historyByMeasureId && mcid && mcid.value != null) {
    const histKey = String(measure._id || measure.id || '');
    const prior = ctx.historyByMeasureId.get(histKey);
    if (prior?.lastDate && prior?.lastTotalRawScore != null && prior?.priorTotalRawScore != null) {
      const now = ctx.now || new Date();
      const ageDays = (now.getTime() - new Date(prior.lastDate).getTime()) / 86400000;
      const lastChange = Math.abs(prior.lastTotalRawScore - prior.priorTotalRawScore);
      if (ageDays < stdInterval && lastChange < mcid.value) {
        score += WEIGHTS.RECENT_NO_MCID_CHANGE;
        reasons.push(REASON_CODES.RECENT_NO_MCID_CHANGE);
      }
    }
  }

  return { score, reasonCodes: reasons };
}

module.exports = {
  REASON_CODES,
  WEIGHTS,
  DISCIPLINE_PRIMARY_TOOLKIT,
  filterCandidate,
  scoreCandidate,
  // exposed for tests
  _matchIcd,
  _ageInMonths,
  _normaliseCode,
  _isInToolkit,
};
