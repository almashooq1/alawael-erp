'use strict';

/**
 * fmea.registry.js — World-Class QMS Phase 29 Commit 1.
 *
 * Canonical reference data for Failure Mode and Effects Analysis (FMEA)
 * and Healthcare FMEA (HFMEA). Pure data, no I/O.
 *
 * Standards:
 *   • AIAG-VDA FMEA Handbook (2019) — industrial DFMEA/PFMEA
 *   • VA NCPS HFMEA (2002, refreshed 2019) — healthcare 5-step process
 *   • IEC 60812:2018 — Failure modes and effects analysis (FMEA and FMECA)
 *   • IHI 6-step healthcare FMEA
 *   • JCAHO / JCI proactive risk assessment requirement
 *
 * The registry covers:
 *   • Lifecycle statuses + legal transitions
 *   • FMEA types (DFMEA / PFMEA / SFMEA / HFMEA / Process / Equipment / Software)
 *   • Severity / Occurrence / Detection ratings on 1-10 scale (AIAG) and
 *     1-5 scale (HFMEA "Hazard Score Matrix" — 4×5 grid).
 *   • Action priority bands derived from RPN (Risk Priority Number) and AP
 *     (Action Priority) per AIAG-VDA.
 *   • HFMEA Decision Tree fields (single-point-weakness, existing-control,
 *     detectable) — VA NCPS step 4.
 *   • Recommended action types + default SLA per priority.
 */

// ── Lifecycle ──────────────────────────────────────────────────────

const FMEA_STATUSES = Object.freeze([
  'draft', // worksheet being authored
  'in_review', // submitted for facilitator / team review
  'team_signed', // multi-disciplinary team has signed off on analysis
  'actions_open', // recommended actions assigned, in-flight
  'actions_completed', // every action closed; awaiting effectiveness check
  'verified', // post-implementation RPN/HS recomputed and approved
  'archived', // superseded or product retired
  'cancelled', // worksheet abandoned before completion
]);

const TERMINAL_STATUSES = Object.freeze(['verified', 'archived', 'cancelled']);

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: ['in_review', 'cancelled'],
  in_review: ['team_signed', 'draft', 'cancelled'],
  team_signed: ['actions_open', 'cancelled'],
  actions_open: ['actions_completed', 'cancelled'],
  actions_completed: ['verified', 'actions_open'], // re-open if effectiveness fails
  verified: ['archived'],
  archived: [],
  cancelled: [],
});

// ── FMEA Types ─────────────────────────────────────────────────────

const FMEA_TYPES = Object.freeze([
  {
    code: 'hfmea',
    nameAr: 'تحليل أخطاء الرعاية الصحية',
    nameEn: 'Healthcare FMEA',
    scale: 'hfmea_5', // VA NCPS — 1-5 severity, 1-4 probability
    standard: 'VA-NCPS / JCAHO PR.5',
  },
  {
    code: 'pfmea',
    nameAr: 'FMEA لعمليات تشغيلية',
    nameEn: 'Process FMEA',
    scale: 'aiag_10', // 1-10 each on S/O/D
    standard: 'AIAG-VDA 2019',
  },
  {
    code: 'dfmea',
    nameAr: 'FMEA للتصميم',
    nameEn: 'Design FMEA',
    scale: 'aiag_10',
    standard: 'AIAG-VDA 2019',
  },
  {
    code: 'sfmea',
    nameAr: 'FMEA لنظم المعلومات',
    nameEn: 'Software / System FMEA',
    scale: 'aiag_10',
    standard: 'IEC 60812:2018',
  },
  {
    code: 'efmea',
    nameAr: 'FMEA للمعدات الطبية',
    nameEn: 'Equipment / Asset FMEA',
    scale: 'aiag_10',
    standard: 'IEC 60812:2018',
  },
  {
    code: 'ufmea',
    nameAr: 'FMEA لتجربة المستخدم',
    nameEn: 'User-experience FMEA',
    scale: 'aiag_10',
    standard: 'IEC 62366-1:2015',
  },
]);

// ── HFMEA 1-5 severity (clinical impact) ───────────────────────────

const HFMEA_SEVERITY = Object.freeze([
  {
    score: 1,
    code: 'minor',
    nameAr: 'طفيف',
    nameEn: 'Minor',
    description: 'No injury or inconvenience to the beneficiary.',
  },
  {
    score: 2,
    code: 'moderate',
    nameAr: 'متوسط',
    nameEn: 'Moderate',
    description: 'Increased length of stay or increased level of care for 1-2 beneficiaries.',
  },
  {
    score: 3,
    code: 'major',
    nameAr: 'كبير',
    nameEn: 'Major',
    description:
      'Permanent lessening of bodily function; surgical intervention required; increased LOS for 3+ beneficiaries.',
  },
  {
    score: 4,
    code: 'catastrophic',
    nameAr: 'كارثي',
    nameEn: 'Catastrophic',
    description:
      'Death or major permanent loss of function (sensory, motor, physiologic, or intellectual).',
  },
  // VA NCPS uses a 1-4 severity scale; we extend to 5 to add "near-miss"
  // because Saudi CBAHI inspections want a no-harm category recorded.
  {
    score: 5,
    code: 'near_miss',
    nameAr: 'وشيك دون أذى',
    nameEn: 'Near-miss (no harm)',
    description: 'Event reached the beneficiary but caused no harm; recorded for trend analysis.',
  },
]);

// ── HFMEA 1-4 probability (occurrence frequency) ───────────────────

const HFMEA_PROBABILITY = Object.freeze([
  {
    score: 1,
    code: 'remote',
    nameAr: 'نادر',
    nameEn: 'Remote',
    description: 'Unlikely to occur (may happen sometime in 5-30 years).',
  },
  {
    score: 2,
    code: 'uncommon',
    nameAr: 'غير شائع',
    nameEn: 'Uncommon',
    description: 'Possible to occur (may happen sometime in 2-5 years).',
  },
  {
    score: 3,
    code: 'occasional',
    nameAr: 'عرضي',
    nameEn: 'Occasional',
    description: 'Probable to occur (several times in 1-2 years).',
  },
  {
    score: 4,
    code: 'frequent',
    nameAr: 'متكرر',
    nameEn: 'Frequent',
    description: 'Likely to occur immediately or within a short period (several times per year).',
  },
]);

// ── AIAG 1-10 Severity (industrial / process) ──────────────────────

const AIAG_SEVERITY = Object.freeze([
  {
    score: 10,
    code: 'hazardous_no_warning',
    nameAr: 'خطير بلا إنذار',
    nameEn: 'Hazardous without warning',
  },
  {
    score: 9,
    code: 'hazardous_with_warning',
    nameAr: 'خطير مع إنذار',
    nameEn: 'Hazardous with warning',
  },
  { score: 8, code: 'very_high', nameAr: 'عالي جداً', nameEn: 'Very high — system inoperable' },
  {
    score: 7,
    code: 'high',
    nameAr: 'عالي',
    nameEn: 'High — system operable at reduced performance',
  },
  { score: 6, code: 'moderate', nameAr: 'متوسط', nameEn: 'Moderate — most customers affected' },
  { score: 5, code: 'low', nameAr: 'منخفض', nameEn: 'Low — average customer affected' },
  {
    score: 4,
    code: 'very_low',
    nameAr: 'منخفض جداً',
    nameEn: 'Very low — discriminating customer affected',
  },
  { score: 3, code: 'minor', nameAr: 'بسيط', nameEn: 'Minor — minor nuisance' },
  { score: 2, code: 'very_minor', nameAr: 'بسيط جداً', nameEn: 'Very minor — slight nuisance' },
  { score: 1, code: 'none', nameAr: 'لا يوجد', nameEn: 'None — no effect' },
]);

// ── AIAG 1-10 Occurrence ───────────────────────────────────────────

const AIAG_OCCURRENCE = Object.freeze([
  {
    score: 10,
    code: 'very_high_persistent',
    nameAr: 'مرتفع جداً',
    nameEn: '≥1 in 2 — persistent failure',
  },
  { score: 9, code: 'very_high_frequent', nameAr: 'مرتفع', nameEn: '1 in 3' },
  { score: 8, code: 'high', nameAr: 'مرتفع', nameEn: '1 in 8' },
  { score: 7, code: 'high_repeated', nameAr: 'مرتفع متكرر', nameEn: '1 in 20' },
  { score: 6, code: 'moderate', nameAr: 'متوسط', nameEn: '1 in 80' },
  { score: 5, code: 'moderate_occasional', nameAr: 'متوسط عرضي', nameEn: '1 in 400' },
  { score: 4, code: 'moderate_rare', nameAr: 'متوسط نادر', nameEn: '1 in 2000' },
  { score: 3, code: 'low', nameAr: 'منخفض', nameEn: '1 in 15000' },
  { score: 2, code: 'low_isolated', nameAr: 'منخفض معزول', nameEn: '1 in 150000' },
  {
    score: 1,
    code: 'remote',
    nameAr: 'نادر جداً',
    nameEn: '≤1 in 1500000 — failure eliminated through preventive control',
  },
]);

// ── AIAG 1-10 Detection ────────────────────────────────────────────

const AIAG_DETECTION = Object.freeze([
  {
    score: 10,
    code: 'absolute_uncertainty',
    nameAr: 'لا يمكن الاكتشاف',
    nameEn: 'Absolute uncertainty — no control can detect',
  },
  {
    score: 9,
    code: 'very_remote',
    nameAr: 'نادر جداً',
    nameEn: 'Very remote — only indirect / random checks',
  },
  { score: 8, code: 'remote', nameAr: 'نادر', nameEn: 'Remote — visual / manual checks only' },
  { score: 7, code: 'very_low', nameAr: 'منخفض جداً', nameEn: 'Very low — double visual check' },
  { score: 6, code: 'low', nameAr: 'منخفض', nameEn: 'Low — charting + SPC' },
  { score: 5, code: 'moderate', nameAr: 'متوسط', nameEn: 'Moderate — SPC with reaction plan' },
  {
    score: 4,
    code: 'moderate_high',
    nameAr: 'متوسط مرتفع',
    nameEn: 'Moderately high — error-proofing with gauging',
  },
  { score: 3, code: 'high', nameAr: 'مرتفع', nameEn: 'High — automated gauging at source' },
  {
    score: 2,
    code: 'very_high',
    nameAr: 'مرتفع جداً',
    nameEn: 'Very high — error-proofing prevents transmission',
  },
  {
    score: 1,
    code: 'almost_certain',
    nameAr: 'مؤكد',
    nameEn: 'Almost certain — failure cannot occur (poka-yoke)',
  },
]);

// ── AIAG-VDA 2019 Action Priority (replaces single RPN cut-off) ────
//
// Replaces the simplistic "RPN > X" rule used pre-2019 with a 3-axis
// matrix that prioritises HIGH severity even when occurrence is low.

const AIAG_ACTION_PRIORITY = Object.freeze({
  high: { code: 'H', nameAr: 'إجراء فوري إلزامي', nameEn: 'Immediate action required', slaDays: 7 },
  medium: { code: 'M', nameAr: 'إجراء مطلوب', nameEn: 'Action required', slaDays: 30 },
  low: { code: 'L', nameAr: 'إجراء وقائي', nameEn: 'Action recommended', slaDays: 90 },
});

/**
 * AIAG-VDA action-priority lookup. Severity-dominant: any S=9-10
 * automatically lands in H regardless of O/D.
 */
function aiagActionPriority({ severity, occurrence, detection }) {
  const S = Number(severity);
  const O = Number(occurrence);
  const D = Number(detection);
  if (S >= 9) return 'high';
  if (S >= 7) {
    if (O >= 4 || (O >= 2 && D >= 7)) return 'high';
    return 'medium';
  }
  if (S >= 4) {
    if (O >= 7 && D >= 7) return 'high';
    if (O >= 5 || (O >= 3 && D >= 5)) return 'medium';
    return 'low';
  }
  if (S >= 2) {
    if (O >= 8 && D >= 8) return 'medium';
    return 'low';
  }
  return 'low';
}

// ── HFMEA Hazard Score Matrix (4×5) ────────────────────────────────
//
// Score = severity × probability. Anything ≥8 is automatically actionable.
// Anything 4-7 must run through the HFMEA Decision Tree (next constant).

function hfmeaHazardScore({ severity, probability }) {
  return Number(severity) * Number(probability);
}

function hfmeaIsActionable(hazardScore) {
  return hazardScore >= 8;
}

// ── HFMEA Decision Tree fields (step 4) ────────────────────────────
//
// For each failure mode whose hazard score falls in the "borderline"
// band (4-7), the team must answer these three questions:

const HFMEA_DECISION_TREE = Object.freeze([
  {
    code: 'single_point_weakness',
    nameAr: 'هل يمثل نقطة فشل وحيدة؟',
    nameEn: 'Single-point weakness?',
    helpAr: 'هل سيؤدي فشل هذه النقطة وحدها إلى فشل النظام كاملاً؟',
    helpEn: 'Would failure at this point alone cause system failure?',
  },
  {
    code: 'existing_control',
    nameAr: 'هل توجد ضوابط رقابية كافية؟',
    nameEn: 'Adequate existing control measure?',
    helpAr: 'هل توجد رقابة فعّالة قائمة الآن تكتشف الفشل قبل وصوله للمستفيد؟',
    helpEn:
      'Is there an effective control that would detect this failure before it reaches the beneficiary?',
  },
  {
    code: 'detectability',
    nameAr: 'هل يمكن اكتشافه مبكراً؟',
    nameEn: 'Detectable?',
    helpAr: 'هل يمكن للموظف اكتشاف الخلل قبل أن يصل للمستفيد؟',
    helpEn: 'Can staff detect this failure before it reaches the beneficiary?',
  },
]);

/**
 * HFMEA decision-tree resolver: returns whether the failure mode
 * proceeds to action, after the team has answered the three booleans.
 *
 * Per VA NCPS Step 4:
 *   • If single-point weakness AND no adequate control → proceed
 *   • If single-point weakness AND control exists AND not detectable → proceed
 *   • Otherwise → stop (no action plan needed)
 */
function hfmeaProceedToAction({ singlePointWeakness, existingControl, detectability }) {
  if (!singlePointWeakness) return false;
  if (!existingControl) return true;
  if (!detectability) return true;
  return false;
}

// ── Recommended action types ───────────────────────────────────────

const ACTION_TYPES = Object.freeze([
  { code: 'eliminate', nameAr: 'إزالة السبب', nameEn: 'Eliminate root cause', preference: 1 },
  { code: 'control', nameAr: 'إضافة رقابة', nameEn: 'Add control', preference: 2 },
  { code: 'accept', nameAr: 'قبول مع تخفيف', nameEn: 'Accept with mitigation', preference: 3 },
]);

// ── Required attendee roles for an HFMEA team ──────────────────────
//
// VA NCPS Step 1 — assemble a multi-disciplinary team. JCAHO PR.5
// requires representation from each affected department.

const HFMEA_REQUIRED_ROLES = Object.freeze([
  'quality_manager',
  'medical_director',
  'nursing_supervisor',
  'subject_matter_expert',
  'frontline_practitioner', // someone who actually performs the process
  'patient_safety_officer',
]);

const HFMEA_QUORUM_MIN = 4;

// ── Validation helpers ─────────────────────────────────────────────

function validateRating({ scale, severity, occurrence, detection, probability }) {
  if (scale === 'hfmea_5') {
    const sOk = Number.isInteger(severity) && severity >= 1 && severity <= 5;
    const pOk = Number.isInteger(probability) && probability >= 1 && probability <= 4;
    return {
      ok: sOk && pOk,
      errors: [...(sOk ? [] : ['severity']), ...(pOk ? [] : ['probability'])],
    };
  }
  if (scale === 'aiag_10') {
    const sOk = Number.isInteger(severity) && severity >= 1 && severity <= 10;
    const oOk = Number.isInteger(occurrence) && occurrence >= 1 && occurrence <= 10;
    const dOk = Number.isInteger(detection) && detection >= 1 && detection <= 10;
    return {
      ok: sOk && oOk && dOk,
      errors: [
        ...(sOk ? [] : ['severity']),
        ...(oOk ? [] : ['occurrence']),
        ...(dOk ? [] : ['detection']),
      ],
    };
  }
  return { ok: false, errors: ['unknown scale: ' + scale] };
}

function validateTeamComposition(attendees) {
  if (!Array.isArray(attendees) || attendees.length < HFMEA_QUORUM_MIN) {
    return { ok: false, reason: `team must include at least ${HFMEA_QUORUM_MIN} members` };
  }
  const rolesPresent = new Set(attendees.filter(a => a.present !== false).map(a => a.role));
  const missing = HFMEA_REQUIRED_ROLES.filter(r => !rolesPresent.has(r));
  if (missing.length > 0) return { ok: false, reason: 'missing required roles', missing };
  return { ok: true };
}

module.exports = {
  // lifecycle
  FMEA_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  // types
  FMEA_TYPES,
  // scales
  HFMEA_SEVERITY,
  HFMEA_PROBABILITY,
  AIAG_SEVERITY,
  AIAG_OCCURRENCE,
  AIAG_DETECTION,
  // action priority
  AIAG_ACTION_PRIORITY,
  aiagActionPriority,
  // hfmea
  hfmeaHazardScore,
  hfmeaIsActionable,
  HFMEA_DECISION_TREE,
  hfmeaProceedToAction,
  // actions
  ACTION_TYPES,
  // team
  HFMEA_REQUIRED_ROLES,
  HFMEA_QUORUM_MIN,
  // validators
  validateRating,
  validateTeamComposition,
};
