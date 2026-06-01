'use strict';

/**
 * phq9.js — W706 scoring module for the Patient Health Questionnaire-9
 * (PHQ-9; Kroenke, Spitzer & Williams 2001) — depression severity / screening.
 *
 * 9 items, each rated over the last two weeks on a 0–3 frequency scale:
 *   0 Not at all · 1 Several days · 2 More than half the days · 3 Nearly every day
 *
 * value = sum of all 9 items (0–27). Higher = more depressive burden →
 * lower_better.
 *
 * Severity bands (Kroenke 2001):
 *   0–4    Minimal / none
 *   5–9    Mild
 *   10–14  Moderate
 *   15–19  Moderately severe
 *   20–27  Severe
 *
 * Item 9 ("thoughts that you would be better off dead, or of hurting
 * yourself") is a CRITICAL safety item: ANY non-zero response triggers a
 * suicidality flag regardless of the total score — surfaced in
 * computeDerived().notes.criticalFlag for the alerting layer.
 *
 * PHQ-9 is a SCREENING instrument — a positive screen warrants clinical
 * confirmation, not a diagnosis. It is freely available for use without
 * permission (developed with an educational grant from Pfizer; reproduction
 * for clinical use is explicitly permitted).
 *
 * rawShape: 'item_array' — computeDerived expects a 9-length array of
 * integers 0–3, 0-based by item.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 9;
const ITEM_MAX = 3;
const MAX_SCORE = 27;
const CRITICAL_ITEM = 9; // 1-based — suicidal ideation

const RAW_ITEMS = [
  {
    n: 1,
    ar: 'قلة الاهتمام أو المتعة في القيام بالأشياء',
    en: 'Little interest or pleasure in doing things',
  },
  {
    n: 2,
    ar: 'الشعور بالإحباط أو الاكتئاب أو فقدان الأمل',
    en: 'Feeling down, depressed, or hopeless',
  },
  {
    n: 3,
    ar: 'صعوبة في النوم أو الاستمرار فيه، أو النوم أكثر من اللازم',
    en: 'Trouble falling or staying asleep, or sleeping too much',
  },
  { n: 4, ar: 'الشعور بالتعب أو قلة الطاقة', en: 'Feeling tired or having little energy' },
  { n: 5, ar: 'ضعف الشهية أو الإفراط في الأكل', en: 'Poor appetite or overeating' },
  {
    n: 6,
    ar: 'الشعور بالسوء تجاه نفسك — أنك فاشل أو خذلت نفسك أو عائلتك',
    en: 'Feeling bad about yourself — that you are a failure or have let yourself or your family down',
  },
  {
    n: 7,
    ar: 'صعوبة التركيز على الأشياء، كقراءة الصحيفة أو مشاهدة التلفاز',
    en: 'Trouble concentrating on things, such as reading or watching television',
  },
  {
    n: 8,
    ar: 'التحرّك أو الكلام ببطء ملحوظ، أو على العكس التململ وكثرة الحركة',
    en: 'Moving or speaking so slowly that others noticed — or being fidgety and restless',
  },
  {
    n: 9,
    ar: 'أفكار بأنك ستكون أفضل لو كنت ميتًا، أو أفكار بإيذاء نفسك',
    en: 'Thoughts that you would be better off dead, or of hurting yourself',
    critical: true,
  },
];

const RESPONSE_OPTIONS = [
  { value: 0, label_ar: 'إطلاقًا', label_en: 'Not at all' },
  { value: 1, label_ar: 'عدة أيام', label_en: 'Several days' },
  { value: 2, label_ar: 'أكثر من نصف الأيام', label_en: 'More than half the days', atRisk: true },
  { value: 3, label_ar: 'تقريبًا كل يوم', label_en: 'Nearly every day', atRisk: true },
];

const itemBank = {
  instrumentName_ar: 'استبيان صحة المريض - 9 (فرز الاكتئاب)',
  instrumentName_en: 'Patient Health Questionnaire-9 (PHQ-9)',
  instrumentVersion: 'PHQ-9',
  respondent: 'self',
  estimatedMinutes: 4,
  responseScaleNote_ar: 'خلال الأسبوعين الماضيين، كم مرة أزعجتك أيّ من المشكلات التالية؟',
  responseScaleNote_en:
    'Over the last two weeks, how often have you been bothered by any of the following problems?',
  items: RAW_ITEMS.map(it => ({
    number: it.n,
    text_ar: it.ar,
    text_en: it.en,
    critical: it.critical || undefined,
    responseOptions: RESPONSE_OPTIONS,
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`PHQ-9 has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v > ITEM_MAX) {
      errors.push(`item ${i + 1}: must be integer 0-${ITEM_MAX} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`PHQ-9: invalid raw items — ${v.errors.join('; ')}`);
  }
  const total = rawItems.reduce((acc, item) => acc + item, 0);
  const criticalValue = rawItems[CRITICAL_ITEM - 1];
  return {
    value: total,
    notes: {
      method: 'sum_of_9_items',
      criticalItem: CRITICAL_ITEM,
      criticalValue,
      // ANY non-zero on the suicidality item is a safety flag, independent
      // of total severity. The alerting layer escalates on this.
      criticalFlag: criticalValue > 0,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('PHQ-9.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > MAX_SCORE) {
    throw new Error(`PHQ-9.interpret: derivedValue ${derivedValue} outside 0-${MAX_SCORE}`);
  }
  if (derivedValue <= 4) {
    return {
      band: 'minimal',
      tier: 'L0',
      label_ar: 'أعراض قليلة أو معدومة',
      label_en: 'Minimal or none',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا حاجة لتدخّل علاجي للاكتئاب — متابعة روتينية.',
      action_en: 'No depression-specific treatment indicated — routine monitoring.',
    };
  }
  if (derivedValue <= 9) {
    return {
      band: 'mild',
      tier: 'L1',
      label_ar: 'اكتئاب خفيف',
      label_en: 'Mild depression',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'مراقبة يقظة وإعادة تقييم خلال أسبوعين؛ دعم نفسي تثقيفي.',
      action_en: 'Watchful waiting; reassess in two weeks; psychoeducation/support.',
    };
  }
  if (derivedValue <= 14) {
    return {
      band: 'moderate',
      tier: 'L2',
      label_ar: 'اكتئاب متوسط',
      label_en: 'Moderate depression',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'خطة علاجية نشطة: إرشاد نفسي و/أو إحالة لتقييم دوائي.',
      action_en: 'Active treatment plan: counselling and/or referral for medication review.',
    };
  }
  if (derivedValue <= 19) {
    return {
      band: 'moderately_severe',
      tier: 'L3',
      label_ar: 'اكتئاب متوسط الشدة',
      label_en: 'Moderately severe depression',
      severity: 'severe',
      color: '#d84315',
      action_ar: 'علاج نشط مع إحالة لمختصّ نفسي/طبيب نفسي ومتابعة لصيقة.',
      action_en: 'Active treatment with referral to mental-health specialist and close follow-up.',
    };
  }
  return {
    band: 'severe',
    tier: 'L4',
    label_ar: 'اكتئاب شديد',
    label_en: 'Severe depression',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'إحالة عاجلة لطبيب نفسي؛ تقييم خطر الانتحار وبدء العلاج فورًا.',
    action_en: 'Urgent psychiatric referral; assess suicide risk and initiate treatment promptly.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const bandOf = s => interpret(s).band;
  return {
    ...base,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'PHQ-9',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: MAX_SCORE },
  cutoff: 10, // ≥10 → clinically significant (moderate+)
  criticalItem: CRITICAL_ITEM,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
