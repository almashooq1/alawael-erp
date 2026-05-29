'use strict';

/**
 * measureRecommendation.service.js — W561
 *
 * The "intelligence" layer that sits on top of the W212 scoring engine +
 * W210 Measure governance + W553–W559 digital-administration engine.
 *
 * Given a beneficiary, it answers the clinician's real question — "which
 * standardized instrument should I administer next, and why?" — by
 * combining three signals the platform already records:
 *
 *   1. Eligibility   — Measure.findEligibleFor (age + ICD-10 + prerequisites
 *                      + certification + status) AND targetPopulation match
 *                      against disability.type (isApplicable). A measure that
 *                      fails either gate is never recommended.
 *   2. Coverage gap  — has this measure ever been administered to THIS
 *                      beneficiary? A never-administered eligible screen /
 *                      diagnostic is the strongest "do this now" signal.
 *   3. Reassessment  — for already-administered measures, is the cadence
 *                      (reassessment.standardIntervalDays) overdue / due
 *                      soon / current? Overdue outcome measures matter most.
 *
 * Each recommendation carries a bilingual, transparent set of reasons — no
 * black-box score. `administrable: true` means the measure ships a W553
 * digital item bank, so it can be completed in-app right now.
 *
 * The ranking core (`rankMeasures`) is PURE — no Mongoose, no DB, no clock —
 * so it is unit-testable in isolation. `recommendForBeneficiary` is the
 * thin DB-touching orchestrator.
 *
 * Tenant scope: the orchestrator does NOT enforce branch — the route layer
 * must call enforceBeneficiaryBranch(req, beneficiaryId) first (W269).
 */

const mongoose = require('mongoose');
const engine = require('./measureScoringEngine.service');
const logger = require('../utils/logger');

const MS_PER_DAY = 86400000;
const DUE_SOON_WINDOW_DAYS = 14;

// Best-effort bridge between the Beneficiary.disability.type vocabulary
// (ICF-style: physical/mental/sensory/…) and the catalog's clinical-cohort
// targetPopulation tokens (autism/cerebral_palsy/…). Used ONLY for a SOFT
// ranking boost — never a hard gate (the two vocabularies don't align 1:1,
// so hard-excluding on disability.type would silently drop appropriate
// instruments — see recommendForBeneficiary). Conservative + extensible.
const DISABILITY_TYPE_TO_COHORTS = {
  mental: ['autism', 'developmental', 'intellectual', 'behavioral'],
  learning: ['learning', 'developmental', 'adhd'],
  physical: ['cerebral_palsy', 'physical', 'motor'],
  speech: ['speech', 'communication', 'language'],
  sensory: ['sensory', 'hearing', 'vision'],
  multiple: ['multiple', 'cerebral_palsy', 'autism', 'developmental'],
  other: [],
};

// Priority band thresholds on the computed numeric score.
const PRIORITY_HIGH = 45;
const PRIORITY_MEDIUM = 20;

function _err(message, statusCode) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

/**
 * Normalize a Beneficiary document into the lightweight context shape the
 * Measure model methods (isEligibleFor / isApplicable) expect. Pure.
 *
 *   { ageMonths, disabilityType, icd10: string[] }
 */
function normalizeBeneficiary(ben) {
  if (!ben || typeof ben !== 'object') return { ageMonths: null, disabilityType: null, icd10: [] };

  let ageMonths = null;
  if (typeof ben.ageMonths === 'number') {
    ageMonths = ben.ageMonths;
  } else if (ben.dateOfBirth) {
    const dob = new Date(ben.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      // Whole months since birth — used for ageRange gating.
      const ref = ben._ageReferenceDate ? new Date(ben._ageReferenceDate) : new Date();
      ageMonths = (ref.getFullYear() - dob.getFullYear()) * 12 + (ref.getMonth() - dob.getMonth());
      if (ref.getDate() < dob.getDate()) ageMonths -= 1;
      if (ageMonths < 0) ageMonths = 0;
    }
  }

  const disabilityType = ben.disability?.type || ben.category || null;

  // ICD-10 codes can live in several places depending on intake vintage.
  const icdRaw =
    ben.icd10 ||
    ben.diagnosis_codes ||
    ben.disability?.icd10 ||
    ben.disability?.diagnosisCodes ||
    ben.disability?.conditions ||
    [];
  const icd10 = (Array.isArray(icdRaw) ? icdRaw : [icdRaw]).filter(Boolean).map(String);

  return { ageMonths, disabilityType, icd10 };
}

/**
 * Reassessment status from a measure's last-administration date + cadence.
 * Pure — `now` is injected (ms epoch) so tests are deterministic.
 *
 *   never     — no prior administration
 *   overdue   — past the standard interval
 *   due_soon  — within DUE_SOON_WINDOW_DAYS of the standard interval
 *   current   — administered recently, not yet due
 */
function reassessmentStatus(lastDate, standardIntervalDays, now) {
  if (!lastDate) return { status: 'never', daysSinceLast: null, dueInDays: null };
  const last = new Date(lastDate).getTime();
  if (Number.isNaN(last)) return { status: 'never', daysSinceLast: null, dueInDays: null };
  const daysSinceLast = Math.floor((now - last) / MS_PER_DAY);
  if (!standardIntervalDays || standardIntervalDays <= 0) {
    return { status: 'current', daysSinceLast, dueInDays: null };
  }
  const dueInDays = standardIntervalDays - daysSinceLast;
  if (dueInDays <= 0) return { status: 'overdue', daysSinceLast, dueInDays };
  if (dueInDays <= DUE_SOON_WINDOW_DAYS) return { status: 'due_soon', daysSinceLast, dueInDays };
  return { status: 'current', daysSinceLast, dueInDays };
}

const PRIORITY_LABELS = {
  high: { en: 'high', ar: 'أولوية عالية' },
  medium: { en: 'medium', ar: 'أولوية متوسطة' },
  low: { en: 'low', ar: 'أولوية منخفضة' },
  not_now: { en: 'not_now', ar: 'لا حاجة الآن' },
};

const STATUS_LABELS = {
  never: { en: 'Never administered', ar: 'لم يُطبَّق من قبل' },
  overdue: { en: 'Reassessment overdue', ar: 'إعادة التقييم متأخّرة' },
  due_soon: { en: 'Reassessment due soon', ar: 'إعادة التقييم قريبة' },
  current: { en: 'Up to date', ar: 'محدَّث' },
};

/**
 * Score + reason a single eligible candidate. Pure.
 *
 * @param {Object} cand          normalized candidate (see rankMeasures)
 * @param {Object} reasm         reassessmentStatus() output
 * @param {boolean} administrable measure ships a digital item bank
 */
function _scoreCandidate(cand, reasm, administrable, clinical = {}) {
  let score = 0;
  const reasons = [];
  const reasons_ar = [];

  const isScreenOrDx =
    cand.purpose === 'screening' ||
    cand.purpose === 'diagnostic' ||
    cand.category === 'screening' ||
    cand.category === 'diagnostic';

  switch (reasm.status) {
    case 'never':
      score += 50;
      reasons.push('Eligible but never administered to this beneficiary');
      reasons_ar.push('مؤهَّل لكنه لم يُطبَّق على هذا المستفيد من قبل');
      if (isScreenOrDx) {
        score += 10;
        reasons.push('Screening/diagnostic baseline is missing');
        reasons_ar.push('لا يوجد خطّ أساس للفحص/التشخيص');
      }
      break;
    case 'overdue': {
      const overdueDays = Math.max(0, -(reasm.dueInDays || 0));
      score += 40 + Math.min(overdueDays, 60) * 0.5;
      reasons.push(`Reassessment overdue by ${overdueDays} day(s)`);
      reasons_ar.push(`إعادة التقييم متأخّرة بمقدار ${overdueDays} يوم`);
      break;
    }
    case 'due_soon':
      score += 20;
      reasons.push(`Reassessment due in ${reasm.dueInDays} day(s)`);
      reasons_ar.push(`موعد إعادة التقييم خلال ${reasm.dueInDays} يوم`);
      break;
    default:
      // current — nothing to do now.
      reasons.push('Recently administered — no action needed yet');
      reasons_ar.push('طُبِّق حديثًا — لا حاجة لإجراء الآن');
      break;
  }

  if (administrable) {
    score += 15;
    reasons.push('Can be administered digitally in-app now');
    reasons_ar.push('يمكن تطبيقه رقميًّا داخل النظام الآن');
  }

  if (cand.evidenceLevel === 'level_1') {
    score += 5;
    reasons.push('Level-1 evidence instrument');
    reasons_ar.push('مقياس بمستوى أدلّة (Level 1)');
  }

  if (
    cand.populationMatch === true &&
    cand.targetPopulation &&
    !cand.targetPopulation.includes('all')
  ) {
    score += 8;
    reasons.push("Targets this beneficiary's disability type");
    reasons_ar.push('موجَّه لنوع إعاقة هذا المستفيد');
  }

  // W576 — clinical-urgency signals from the LAST administration. A worsening
  // trajectory (or a severe/critical last result) raises priority — and can
  // promote an otherwise up-to-date measure to an EARLY reassessment, because
  // a beneficiary who is declining shouldn't wait out the full cadence.
  const SEVERE = clinical.severity === 'severe' || clinical.severity === 'critical';
  const DECLINING = clinical.trend === 'declining';
  if (DECLINING) {
    score += 18;
    reasons.push('Last trajectory was declining — earlier reassessment indicated');
    reasons_ar.push('آخر اتجاه كان نحو التدهور — يُستحسن إعادة تقييم مبكّرة');
  }
  if (SEVERE) {
    score += 10;
    reasons.push(`Last result was ${clinical.severity}`);
    reasons_ar.push('آخر نتيجة كانت ضمن النطاق الشديد — متابعة لصيقة');
  }

  let priority = 'not_now';
  if (reasm.status !== 'current') {
    if (score >= PRIORITY_HIGH) priority = 'high';
    else if (score >= PRIORITY_MEDIUM) priority = 'medium';
    else priority = 'low';
  } else if (DECLINING || SEVERE) {
    // up-to-date on cadence, but clinically worsening → still surface it.
    priority = DECLINING ? 'medium' : 'low';
  }

  return { score: Math.round(score * 10) / 10, priority, reasons, reasons_ar };
}

/**
 * PURE ranking core. Given eligible candidates + per-code last-application
 * data + the set of digitally administrable codes, returns a ranked list.
 *
 * @param {Object} input
 * @param {Array}  input.candidates       eligible measure-like objects:
 *        { code, name, name_ar, abbreviation, category, purpose, evidenceLevel,
 *          targetPopulation?, populationMatch?, reassessment?: { standardIntervalDays } }
 * @param {Object} input.latestByCode     code → { lastDate, severity, trend, lastScore }
 * @param {Set|Array} input.administrableCodes  codes that ship a digital item bank
 * @param {number} input.now              ms epoch (injected for determinism)
 * @returns {Array} ranked recommendations (highest priority first)
 */
function rankMeasures({ candidates, latestByCode = {}, administrableCodes = [], now = 0 } = {}) {
  const adminSet =
    administrableCodes instanceof Set ? administrableCodes : new Set(administrableCodes || []);
  const latest =
    latestByCode instanceof Map ? Object.fromEntries(latestByCode) : latestByCode || {};

  const ranked = (candidates || []).map(cand => {
    const last = latest[cand.code] || null;
    const standardIntervalDays = cand.reassessment?.standardIntervalDays ?? null;
    const reasm = reassessmentStatus(last?.lastDate, standardIntervalDays, now);
    const administrable = adminSet.has(cand.code);
    const { score, priority, reasons, reasons_ar } = _scoreCandidate(cand, reasm, administrable, {
      trend: last?.trend,
      severity: last?.severity,
    });

    return {
      measureCode: cand.code,
      name: cand.name || null,
      name_ar: cand.name_ar || null,
      abbreviation: cand.abbreviation || null,
      category: cand.category || null,
      purpose: cand.purpose || null,
      administrable,
      priority,
      priorityLabel_ar: PRIORITY_LABELS[priority].ar,
      score,
      reassessment: {
        status: reasm.status,
        statusLabel_en: STATUS_LABELS[reasm.status]?.en || reasm.status,
        statusLabel_ar: STATUS_LABELS[reasm.status]?.ar || reasm.status,
        daysSinceLast: reasm.daysSinceLast,
        dueInDays: reasm.dueInDays,
        standardIntervalDays,
        lastDate: last?.lastDate || null,
        lastScore: last?.lastScore ?? null,
        lastSeverity: last?.severity || null,
        trend: last?.trend || null,
      },
      reasons,
      reasons_ar,
    };
  });

  // Highest score first; ties broken by administrable (do-it-now) then code.
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.administrable !== b.administrable) return a.administrable ? -1 : 1;
    return String(a.measureCode).localeCompare(String(b.measureCode));
  });

  return ranked;
}

class MeasureRecommendationService {
  /**
   * Recommend the standardized instruments to administer next for a
   * beneficiary, ranked + reasoned. DB orchestrator around rankMeasures.
   *
   * @param {string} beneficiaryId
   * @param {Object} [opts]
   * @param {string} [opts.discipline]       filter to one rater discipline
   * @param {string} [opts.category]         filter to one measure category
   * @param {boolean}[opts.administrableOnly] only digitally-administrable
   * @param {boolean}[opts.includeCurrent]   include up-to-date measures (default false)
   * @param {number} [opts.limit]            cap the result count
   * @param {Date}   [opts.now]              clock injection (tests)
   */
  async recommendForBeneficiary(beneficiaryId, opts = {}) {
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      throw _err('valid beneficiaryId required', 400);
    }
    const Beneficiary = mongoose.model('Beneficiary');
    const Measure = mongoose.model('Measure');
    const MeasureApplication = mongoose.model('MeasureApplication');

    const ben = await Beneficiary.findById(beneficiaryId).lean();
    if (!ben) throw _err('beneficiary not found', 404);

    const norm = normalizeBeneficiary(ben);

    // 1. Eligible candidates (age + ICD-10 + prerequisites + cert + status).
    const eligibleRows = await Measure.findEligibleFor(norm, {
      discipline: opts.discipline,
      category: opts.category,
    });

    // 2. targetPopulation is a SOFT ranking signal, NOT a hard gate (W571).
    //    The Beneficiary.disability.type vocabulary (physical/mental/sensory/…)
    //    does NOT align with the catalog's clinical-cohort targetPopulation
    //    tokens (autism/cerebral_palsy/children/…), so hard-excluding on it
    //    silently dropped clinically-appropriate instruments — e.g. the
    //    universal M-CHAT-R autism screen for EVERY real beneficiary, since
    //    none carries disability.type='autism'. The real eligibility gate is
    //    age + ICD-10 (Measure.findEligibleFor above); population only nudges
    //    ranking via the soft boost in rankMeasures.
    // Generic cohort tokens never gate (every child/adolescent qualifies).
    const GENERIC_POPULATION = ['all', 'children', 'adolescents', 'adults', 'any'];
    const cohorts = DISABILITY_TYPE_TO_COHORTS[norm.disabilityType] || [];
    const candidates = [];
    for (const row of eligibleRows) {
      const m = row.measure;
      const tp = m.targetPopulation || [];
      const populationMatch =
        tp.length === 0 ||
        tp.includes('all') ||
        (norm.disabilityType && tp.includes(norm.disabilityType)) ||
        cohorts.some(c => tp.includes(c));

      // CONFIDENT hard-exclude ONLY when we have a vocabulary bridge for this
      // disability type (cohorts non-empty) AND the measure targets a specific
      // clinical cohort that doesn't intersect it. Without that confidence we
      // never exclude (age + ICD-10 already gated) — this is what prevents the
      // W571 silent-drop while still keeping a CP motor scale out of an
      // autism-only child's list.
      const specificTokens = tp.filter(t => !GENERIC_POPULATION.includes(t));
      if (cohorts.length > 0 && specificTokens.length > 0 && !populationMatch) continue;

      candidates.push({
        code: m.code,
        name: m.name,
        name_ar: m.name_ar,
        abbreviation: m.abbreviation,
        category: m.category,
        purpose: m.purpose,
        evidenceLevel: m.evidenceLevel,
        targetPopulation: tp,
        populationMatch,
        reassessment: m.reassessment || null,
      });
    }

    // 3. Last administration per measure → index by code.
    const latestByCode = {};
    try {
      const latest = await MeasureApplication.getLatestPerMeasure(beneficiaryId);
      for (const l of latest) {
        latestByCode[l.measureCode] = {
          lastDate: l.lastDate,
          lastScore: l.lastScore,
          severity: l.severity,
          trend: l.trend,
        };
      }
    } catch (err) {
      logger.warn(`[MeasureRecommendation] history lookup failed: ${err.message}`);
    }

    // 4. Which codes ship a digital item bank.
    const administrableCodes = new Set((engine.listAdministrable() || []).map(m => m.measureCode));

    const now = opts.now ? new Date(opts.now).getTime() : Date.now();
    let ranked = rankMeasures({ candidates, latestByCode, administrableCodes, now });

    if (opts.administrableOnly) ranked = ranked.filter(r => r.administrable);
    if (!opts.includeCurrent) ranked = ranked.filter(r => r.priority !== 'not_now');
    if (opts.limit && Number.isInteger(opts.limit)) ranked = ranked.slice(0, opts.limit);

    return {
      generatedAt: new Date(now),
      beneficiary: {
        id: String(ben._id),
        ageMonths: norm.ageMonths,
        disabilityType: norm.disabilityType,
      },
      total: ranked.length,
      counts: {
        high: ranked.filter(r => r.priority === 'high').length,
        medium: ranked.filter(r => r.priority === 'medium').length,
        low: ranked.filter(r => r.priority === 'low').length,
      },
      recommendations: ranked,
    };
  }
}

const measureRecommendationService = new MeasureRecommendationService();

module.exports = {
  MeasureRecommendationService,
  measureRecommendationService,
  // Pure helpers exported for unit tests.
  rankMeasures,
  reassessmentStatus,
  normalizeBeneficiary,
  _scoreCandidate,
  DISABILITY_TYPE_TO_COHORTS,
};
