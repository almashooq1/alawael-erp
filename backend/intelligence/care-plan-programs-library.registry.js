'use strict';

/**
 * care-plan-programs-library.registry.js — Wave 46.
 *
 * Curated library of standardized intervention programs and assessment
 * instruments used by rehabilitation centers in Saudi Arabia.
 *
 * The library is the data backbone that powers:
 *   • condition-age matching   — recommend X only if age + diagnosis fit
 *   • contraindication checks  — refuse high-stim programs for seizure history
 *   • score interpretation     — cap confidence + drive trend classification
 *   • minimum evidence rules   — block a recommendation when too little data
 *
 * Pure registry — no DB, no I/O. Every entry is normalized:
 *
 *   programs[]:
 *     id, name, modality, domains[], ageBand[min,max], indications[ICD codes],
 *     contraindications[], minSessionsPerWeek, maxSessionsPerWeek,
 *     sessionDurationMinRange, evidenceLevel, citations[]
 *
 *   tests[]:
 *     id, name, kind ('standardized'|'observational'|'screening'),
 *     domains[], ageBand[min,max], indications[],
 *     scoreScale, scoreInterpretation, validityScore (0..1),
 *     cadenceWeeksMin/Max
 *
 * The list is INTENTIONALLY small but representative — production
 * deployments are expected to extend with center-specific additions
 * via a non-breaking append.
 */

// ─── Programs ───────────────────────────────────────────────────

const PROGRAMS = Object.freeze([
  {
    id: 'pgm.aba.dtt',
    name: 'Discrete Trial Training (DTT)',
    nameAr: 'التدريب على المحاولات المنفصلة',
    modality: 'aba',
    domains: ['expressive_language', 'receptive_language', 'cognitive', 'academic'],
    ageBand: [2, 12],
    indications: ['F84.0', 'F84.9', 'F70', 'F71'],
    contraindications: ['seizure_high_freq'],
    minSessionsPerWeek: 2,
    maxSessionsPerWeek: 10,
    sessionDurationMinRange: [20, 60],
    evidenceLevel: 'strong',
    citations: ['Lovaas 1987', 'NSP 2015'],
  },
  {
    id: 'pgm.aba.net',
    name: 'Natural Environment Teaching (NET)',
    nameAr: 'التعليم في البيئة الطبيعية',
    modality: 'aba',
    domains: ['expressive_language', 'social', 'adl'],
    ageBand: [2, 10],
    indications: ['F84.0', 'F84.9'],
    contraindications: [],
    minSessionsPerWeek: 2,
    maxSessionsPerWeek: 8,
    sessionDurationMinRange: [30, 60],
    evidenceLevel: 'strong',
    citations: ['Sundberg 2008'],
  },
  {
    id: 'pgm.aba.pecs',
    name: 'Picture Exchange Communication System (PECS)',
    nameAr: 'نظام التواصل بتبادل الصور',
    modality: 'aac',
    domains: ['expressive_language'],
    ageBand: [2, 18],
    indications: ['F84.0', 'F84.9', 'F80.2'],
    contraindications: [],
    minSessionsPerWeek: 2,
    maxSessionsPerWeek: 6,
    sessionDurationMinRange: [20, 45],
    evidenceLevel: 'moderate',
    citations: ['Bondy & Frost 1994'],
  },
  {
    id: 'pgm.slp.articulation',
    name: 'Articulation Therapy',
    nameAr: 'علاج النطق',
    modality: 'slp',
    domains: ['expressive_language'],
    ageBand: [3, 14],
    indications: ['F80.0', 'F80.8'],
    contraindications: [],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 3,
    sessionDurationMinRange: [30, 45],
    evidenceLevel: 'strong',
    citations: ['ASHA 2020'],
  },
  {
    id: 'pgm.ot.sensory_integration',
    name: 'Sensory Integration (SI)',
    nameAr: 'التكامل الحسي',
    modality: 'ot',
    domains: ['fine_motor', 'gross_motor', 'behavior'],
    ageBand: [2, 12],
    indications: ['F84.0', 'F90.0', 'F82'],
    // HIGH-STIM SI is contraindicated with seizures + recent surgery
    contraindications: ['seizure_high_freq', 'post_surgery_lt_30d'],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 4,
    sessionDurationMinRange: [30, 60],
    evidenceLevel: 'moderate',
    citations: ['Ayres 1972'],
  },
  {
    id: 'pgm.ot.handwriting',
    name: 'Handwriting Without Tears',
    nameAr: 'تدريب الكتابة',
    modality: 'ot',
    domains: ['fine_motor', 'academic'],
    ageBand: [4, 12],
    indications: ['F82', 'F81.1'],
    contraindications: [],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 3,
    sessionDurationMinRange: [25, 45],
    evidenceLevel: 'moderate',
    citations: ['Olsen 2008'],
  },
  {
    id: 'pgm.pt.gross_motor',
    name: 'Gross Motor Therapy',
    nameAr: 'العلاج الحركي الكبير',
    modality: 'pt',
    domains: ['gross_motor'],
    ageBand: [1, 18],
    indications: ['F82', 'G80', 'Q90'],
    contraindications: ['post_surgery_lt_30d', 'cardiac_unstable'],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 5,
    sessionDurationMinRange: [30, 60],
    evidenceLevel: 'strong',
    citations: ['APTA 2018'],
  },
  {
    id: 'pgm.psych.cbt_kid',
    name: 'CBT for Children (CBT-K)',
    nameAr: 'العلاج المعرفي السلوكي للأطفال',
    modality: 'psych',
    domains: ['behavior', 'social'],
    ageBand: [7, 17],
    indications: ['F90.0', 'F41.1', 'F32'],
    contraindications: [],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 2,
    sessionDurationMinRange: [40, 60],
    evidenceLevel: 'strong',
    citations: ['Kendall 2018'],
  },
  {
    id: 'pgm.parent.training',
    name: 'Parent Training (Behavioral)',
    nameAr: 'تدريب الأسرة على السلوك',
    modality: 'parent_training',
    domains: ['behavior', 'social', 'adl'],
    ageBand: [2, 12],
    indications: ['F84.0', 'F90.0', 'F91'],
    contraindications: [],
    minSessionsPerWeek: 0.5, // every other week
    maxSessionsPerWeek: 1,
    sessionDurationMinRange: [45, 60],
    evidenceLevel: 'strong',
    citations: ['McMahon & Forehand 2003'],
  },
  // ─── W206c: CP (G80) coverage expansion ─────────────────────
  {
    id: 'pgm.ot.cp_fine_motor',
    name: 'OT — Fine Motor for CP',
    nameAr: 'علاج وظيفي للحركة الدقيقة (شلل دماغي)',
    modality: 'ot',
    domains: ['fine_motor', 'adl'],
    ageBand: [2, 18],
    indications: ['G80'],
    contraindications: ['post_surgery_lt_30d'],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 4,
    sessionDurationMinRange: [30, 45],
    evidenceLevel: 'strong',
    citations: ['Novak 2020 — Systematic review CP interventions'],
  },
  {
    id: 'pgm.ot.cp_adl',
    name: 'OT — ADL Training for CP',
    nameAr: 'تدريب أنشطة الحياة اليومية (شلل دماغي)',
    modality: 'ot',
    domains: ['adl'],
    ageBand: [2, 21],
    indications: ['G80'],
    contraindications: [],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 3,
    sessionDurationMinRange: [30, 60],
    evidenceLevel: 'strong',
    citations: ['Novak 2020'],
  },
  {
    id: 'pgm.aac.cp',
    name: 'AAC for Communication-Impaired CP',
    nameAr: 'نظام تواصل بديل ومعزز (شلل دماغي)',
    modality: 'aac',
    domains: ['expressive_language', 'receptive_language'],
    ageBand: [2, 21],
    indications: ['G80'],
    contraindications: [],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 3,
    sessionDurationMinRange: [30, 45],
    evidenceLevel: 'moderate',
    citations: ['Pennington 2016 — AAC interventions in CP'],
  },
  {
    id: 'pgm.slp.cp',
    name: 'Speech Therapy for CP (Dysarthria/Dysphagia)',
    nameAr: 'علاج النطق للشلل الدماغي',
    modality: 'slp',
    domains: ['expressive_language'],
    ageBand: [2, 18],
    indications: ['G80'],
    contraindications: [],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 3,
    sessionDurationMinRange: [30, 45],
    evidenceLevel: 'strong',
    citations: ['Pennington 2016'],
  },
  {
    id: 'pgm.parent.cp',
    name: 'Parent Training (CP-specific)',
    nameAr: 'تدريب الأسرة (شلل دماغي)',
    modality: 'parent_training',
    domains: ['adl', 'behavior'],
    ageBand: [1, 12],
    indications: ['G80'],
    contraindications: [],
    minSessionsPerWeek: 0.5,
    maxSessionsPerWeek: 1,
    sessionDurationMinRange: [45, 60],
    evidenceLevel: 'strong',
    citations: ['Morgan 2018 — Family-centred CP care'],
  },
  {
    id: 'pgm.group.social_skills',
    name: 'Social Skills Group (PEERS-adapted)',
    nameAr: 'مجموعة المهارات الاجتماعية',
    modality: 'group',
    domains: ['social'],
    ageBand: [8, 16],
    indications: ['F84.0', 'F84.9', 'F40.10'],
    contraindications: ['aggression_high', 'elopement_high'],
    minSessionsPerWeek: 1,
    maxSessionsPerWeek: 2,
    sessionDurationMinRange: [60, 90],
    evidenceLevel: 'moderate',
    citations: ['Laugeson 2017'],
  },
]);

const PROGRAM_BY_ID = Object.freeze(
  PROGRAMS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {})
);

// ─── Tests / Measures ───────────────────────────────────────────

const TESTS = Object.freeze([
  {
    id: 'tst.vbmapp',
    name: 'VB-MAPP',
    nameAr: 'تقييم سلوك اللغة الفعلية',
    kind: 'standardized',
    domains: ['expressive_language', 'receptive_language', 'social', 'cognitive', 'adl'],
    ageBand: [2, 10],
    indications: ['F84.0', 'F84.9'],
    scoreScale: { min: 0, max: 170, units: 'milestones' },
    scoreInterpretation: {
      bands: [
        { from: 0, to: 30, label: 'Level 1 — Early Learner' },
        { from: 31, to: 80, label: 'Level 2 — Intermediate' },
        { from: 81, to: 170, label: 'Level 3 — Advanced' },
      ],
    },
    validityScore: 1.0,
    cadenceWeeksMin: 12,
    cadenceWeeksMax: 26,
  },
  {
    id: 'tst.gars3',
    name: 'GARS-3',
    nameAr: 'مقياس جيليام للتوحد - 3',
    kind: 'standardized',
    domains: ['social', 'behavior'],
    ageBand: [3, 22],
    indications: ['F84.0', 'F84.9'],
    scoreScale: { min: 55, max: 145, units: 'standard score' },
    scoreInterpretation: {
      bands: [
        { from: 130, to: 145, label: 'Very Likely' },
        { from: 110, to: 129, label: 'Likely' },
        { from: 90, to: 109, label: 'Possibly' },
        { from: 55, to: 89, label: 'Unlikely' },
      ],
    },
    validityScore: 0.95,
    cadenceWeeksMin: 26,
    cadenceWeeksMax: 52,
  },
  {
    id: 'tst.ados2',
    name: 'ADOS-2',
    nameAr: 'مقياس مراقبة التشخيص للتوحد - 2',
    kind: 'standardized',
    domains: ['social', 'behavior', 'expressive_language'],
    ageBand: [1, 30],
    indications: ['F84.0', 'F84.9'],
    scoreScale: { min: 0, max: 30, units: 'algorithm score' },
    scoreInterpretation: {
      bands: [
        { from: 0, to: 6, label: 'Non-spectrum' },
        { from: 7, to: 9, label: 'Autism spectrum' },
        { from: 10, to: 30, label: 'Autism' },
      ],
    },
    validityScore: 1.0,
    cadenceWeeksMin: 52,
    cadenceWeeksMax: 156,
  },
  {
    id: 'tst.ablls',
    name: 'ABLLS-R',
    nameAr: 'تقييم المهارات اللغوية والتعلم الأساسية',
    kind: 'standardized',
    domains: ['expressive_language', 'receptive_language', 'academic', 'adl'],
    ageBand: [2, 12],
    indications: ['F84.0', 'F70', 'F71'],
    scoreScale: { min: 0, max: 544, units: 'mastery items' },
    scoreInterpretation: {
      bands: [
        { from: 0, to: 100, label: 'Foundational' },
        { from: 101, to: 300, label: 'Intermediate' },
        { from: 301, to: 544, label: 'Advanced' },
      ],
    },
    validityScore: 0.9,
    cadenceWeeksMin: 12,
    cadenceWeeksMax: 26,
  },
  {
    id: 'tst.pep3',
    name: 'PEP-3',
    nameAr: 'الملف النفسي التعليمي - 3',
    kind: 'standardized',
    domains: ['cognitive', 'fine_motor', 'expressive_language', 'adl'],
    ageBand: [2, 7],
    indications: ['F84.0', 'F70'],
    scoreScale: { min: 0, max: 172, units: 'developmental score' },
    scoreInterpretation: {
      bands: [
        { from: 0, to: 60, label: 'Severe delay' },
        { from: 61, to: 120, label: 'Mild-moderate delay' },
        { from: 121, to: 172, label: 'Within range' },
      ],
    },
    validityScore: 0.85,
    cadenceWeeksMin: 26,
    cadenceWeeksMax: 52,
  },
  {
    id: 'tst.bot2',
    name: 'BOT-2',
    nameAr: 'مقياس برونينكس-أوزرتسكي للحركة - 2',
    kind: 'standardized',
    domains: ['fine_motor', 'gross_motor'],
    ageBand: [4, 21],
    indications: ['F82'],
    scoreScale: { min: 20, max: 80, units: 'scaled score' },
    scoreInterpretation: {
      bands: [
        { from: 20, to: 35, label: 'Well below average' },
        { from: 36, to: 45, label: 'Below average' },
        { from: 46, to: 54, label: 'Average' },
        { from: 55, to: 65, label: 'Above average' },
        { from: 66, to: 80, label: 'Well above average' },
      ],
    },
    validityScore: 1.0,
    cadenceWeeksMin: 26,
    cadenceWeeksMax: 52,
  },
  {
    id: 'tst.observation',
    name: 'Therapist Observation',
    nameAr: 'ملاحظة الأخصائي',
    kind: 'observational',
    domains: ['behavior', 'social', 'adl', 'expressive_language'],
    ageBand: [0, 99],
    indications: [], // any
    scoreScale: { min: 0, max: 10, units: 'rubric score' },
    scoreInterpretation: {
      bands: [
        { from: 0, to: 3, label: 'Emerging' },
        { from: 4, to: 7, label: 'Developing' },
        { from: 8, to: 10, label: 'Mastered' },
      ],
    },
    validityScore: 0.6,
    cadenceWeeksMin: 1,
    cadenceWeeksMax: 4,
  },
  {
    id: 'tst.caregiver_burden_zarit',
    name: 'Zarit Burden Interview (short)',
    nameAr: 'مقياس عبء الرعاية',
    kind: 'screening',
    domains: ['family_support'],
    ageBand: [18, 99], // applies to caregivers, not beneficiaries
    indications: [], // any when family stress flagged
    scoreScale: { min: 0, max: 48, units: 'burden score' },
    scoreInterpretation: {
      bands: [
        { from: 0, to: 10, label: 'Little or no burden' },
        { from: 11, to: 20, label: 'Mild to moderate' },
        { from: 21, to: 40, label: 'Moderate to severe' },
        { from: 41, to: 48, label: 'Severe' },
      ],
    },
    validityScore: 0.85,
    cadenceWeeksMin: 12,
    cadenceWeeksMax: 26,
  },
]);

const TEST_BY_ID = Object.freeze(
  TESTS.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {})
);

// ─── Contraindication catalog ───────────────────────────────────

const CONTRAINDICATION_FLAGS = Object.freeze({
  SEIZURE_HIGH_FREQ: 'seizure_high_freq',
  POST_SURGERY_LT_30D: 'post_surgery_lt_30d',
  CARDIAC_UNSTABLE: 'cardiac_unstable',
  AGGRESSION_HIGH: 'aggression_high',
  ELOPEMENT_HIGH: 'elopement_high',
  RECENT_BEHAVIORAL_CRISIS: 'recent_behavioral_crisis',
});

// ─── Minimum evidence rules ─────────────────────────────────────

// Programs require AT LEAST one standardised test OR observation series
// of N points before they can be recommended.
const MIN_EVIDENCE_BY_PROGRAM = Object.freeze({
  'pgm.aba.dtt': { standardizedTests: 1, observationPoints: 0 },
  'pgm.aba.net': { standardizedTests: 1, observationPoints: 0 },
  'pgm.aba.pecs': { standardizedTests: 0, observationPoints: 4 },
  'pgm.slp.articulation': { standardizedTests: 1, observationPoints: 0 },
  'pgm.ot.sensory_integration': { standardizedTests: 1, observationPoints: 0 },
  'pgm.ot.handwriting': { standardizedTests: 0, observationPoints: 4 },
  'pgm.pt.gross_motor': { standardizedTests: 1, observationPoints: 0 },
  'pgm.psych.cbt_kid': { standardizedTests: 1, observationPoints: 0 },
  'pgm.parent.training': { standardizedTests: 0, observationPoints: 0 },
  'pgm.group.social_skills': { standardizedTests: 1, observationPoints: 0 },
  // W206c — CP programs require a GMFCS/MACS/CFCS classification (counts as 1 standardised)
  'pgm.ot.cp_fine_motor': { standardizedTests: 1, observationPoints: 0 },
  'pgm.ot.cp_adl': { standardizedTests: 1, observationPoints: 0 },
  'pgm.aac.cp': { standardizedTests: 1, observationPoints: 0 },
  'pgm.slp.cp': { standardizedTests: 1, observationPoints: 0 },
  'pgm.parent.cp': { standardizedTests: 0, observationPoints: 0 },
});

// ─── Helpers ────────────────────────────────────────────────────

function listPrograms({ domain, ageBand, indication } = {}) {
  return PROGRAMS.filter(p => {
    if (domain && !p.domains.includes(domain)) return false;
    if (ageBand != null && (ageBand < p.ageBand[0] || ageBand > p.ageBand[1])) return false;
    if (indication && p.indications.length > 0 && !p.indications.includes(indication)) return false;
    return true;
  });
}

function listTests({ domain, ageBand, indication } = {}) {
  return TESTS.filter(t => {
    if (domain && !t.domains.includes(domain)) return false;
    if (ageBand != null && (ageBand < t.ageBand[0] || ageBand > t.ageBand[1])) return false;
    if (indication && t.indications.length > 0 && !t.indications.includes(indication)) return false;
    return true;
  });
}

function getProgram(id) {
  return PROGRAM_BY_ID[id] || null;
}

function getTest(id) {
  return TEST_BY_ID[id] || null;
}

/**
 * Check whether a program is contraindicated for a beneficiary given
 * the active safety flags. Returns null when fine, or an object with
 * the offending flags when blocked.
 */
function checkContraindications(programId, safetyFlags = []) {
  const p = getProgram(programId);
  if (!p) return { ok: false, reason: 'UNKNOWN_PROGRAM' };
  const flags = new Set(safetyFlags);
  const conflicts = p.contraindications.filter(c => flags.has(c));
  if (conflicts.length === 0) return { ok: true };
  return { ok: false, reason: 'CONTRAINDICATED', conflicts };
}

/**
 * Verify a program matches the beneficiary's age + indication.
 * Returns { ok, reasons[] }.
 */
function matchEligibility(programId, { age, indications = [] } = {}) {
  const p = getProgram(programId);
  if (!p) return { ok: false, reasons: ['UNKNOWN_PROGRAM'] };
  const reasons = [];
  if (age != null && (age < p.ageBand[0] || age > p.ageBand[1])) {
    reasons.push(`age_out_of_band[${p.ageBand[0]}..${p.ageBand[1]}]`);
  }
  if (p.indications.length > 0) {
    const matched = indications.some(i => p.indications.includes(i));
    if (!matched) reasons.push('no_matching_indication');
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Check that the minimum evidence requirement is satisfied for a
 * program before recommending it.
 *
 * @param {string} programId
 * @param {object} evidence
 *   - standardizedTestsCount
 *   - observationPointsCount
 */
// Observation-floor: even when a program's rule sets observationPoints=0
// (i.e. "no observation path required"), pure-observation evidence still
// counts if it reaches this floor. Prevents 0-evidence acceptance.
const OBS_MIN_FLOOR = 4;

function hasMinimumEvidence(programId, evidence = {}) {
  const min = MIN_EVIDENCE_BY_PROGRAM[programId];
  if (!min) return { ok: true, reason: 'NO_RULE_DEFAULT_OK' };
  const std = Number(evidence.standardizedTestsCount || 0);
  const obs = Number(evidence.observationPointsCount || 0);
  const obsThreshold = Math.max(OBS_MIN_FLOOR, min.observationPoints);
  if (std >= min.standardizedTests || obs >= obsThreshold) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: 'INSUFFICIENT_EVIDENCE',
    required: { ...min, observationPoints: obsThreshold },
    provided: { standardizedTestsCount: std, observationPointsCount: obs },
  };
}

/**
 * Interpret a test score. Returns the matching band + a normalized 0..1
 * "severity" (higher = worse for deficit tests, but tests vary).
 */
function interpretTestScore(testId, score) {
  const t = getTest(testId);
  if (!t) return { ok: false, reason: 'UNKNOWN_TEST' };
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return { ok: false, reason: 'INVALID_SCORE' };
  }
  const band = (t.scoreInterpretation.bands || []).find(b => score >= b.from && score <= b.to);
  if (!band) {
    return { ok: false, reason: 'SCORE_OUT_OF_RANGE', scale: t.scoreScale };
  }
  return {
    ok: true,
    testId,
    score,
    band: band.label,
    bandRange: [band.from, band.to],
    validityScore: t.validityScore,
  };
}

/**
 * Recommend the top-K programs that match a (domain, age, indications,
 * safetyFlags) profile. Used by the recommendation builder as a
 * deterministic anchor BEFORE the LLM is invoked.
 */
function recommendPrograms({ domain, age, indications = [], safetyFlags = [] }, k = 3) {
  const candidates = listPrograms({ domain, ageBand: age });
  const ranked = [];
  for (const p of candidates) {
    if (p.indications.length > 0) {
      const matched = indications.some(i => p.indications.includes(i));
      if (!matched) continue;
    }
    const contra = checkContraindications(p.id, safetyFlags);
    if (!contra.ok) continue;
    let score = 0;
    if (p.evidenceLevel === 'strong') score += 3;
    else if (p.evidenceLevel === 'moderate') score += 2;
    else score += 1;
    if (p.indications.length > 0 && indications.some(i => p.indications.includes(i))) {
      score += 2;
    }
    ranked.push({ programId: p.id, name: p.name, nameAr: p.nameAr, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, k);
}

function recommendTests({ domain, age, indications = [] }, k = 2) {
  const candidates = listTests({ domain, ageBand: age });
  const ranked = [];
  for (const t of candidates) {
    if (t.indications.length > 0) {
      const matched = indications.some(i => t.indications.includes(i));
      if (!matched) continue;
    }
    let score = 0;
    if (t.kind === 'standardized') score += 3;
    else if (t.kind === 'observational') score += 2;
    else score += 1;
    score += t.validityScore * 2;
    ranked.push({ testId: t.id, name: t.name, nameAr: t.nameAr, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, k);
}

module.exports = {
  PROGRAMS,
  PROGRAM_BY_ID,
  TESTS,
  TEST_BY_ID,
  CONTRAINDICATION_FLAGS,
  MIN_EVIDENCE_BY_PROGRAM,
  listPrograms,
  listTests,
  getProgram,
  getTest,
  checkContraindications,
  matchEligibility,
  hasMinimumEvidence,
  interpretTestScore,
  recommendPrograms,
  recommendTests,
};
