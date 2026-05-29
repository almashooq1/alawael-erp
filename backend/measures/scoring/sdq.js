'use strict';

/**
 * sdq.js — W565 scoring module for the Strengths and Difficulties
 * Questionnaire (SDQ; Goodman 1997) — parent/caregiver report (P4-17).
 *
 * 25 items across 5 subscales of 5 items each, rated 0 (Not True),
 * 1 (Somewhat True), 2 (Certainly True):
 *
 *   Emotional Symptoms      — items 3, 8, 13, 16, 24
 *   Conduct Problems        — items 5, 7, 12, 18, 22
 *   Hyperactivity/Inattention — items 2, 10, 15, 21, 25
 *   Peer Relationship Problems — items 6, 11, 14, 19, 23
 *   Prosocial Behaviour     — items 1, 4, 9, 17, 20  (a STRENGTH; excluded
 *                              from the Total Difficulties Score)
 *
 * Five items are reverse-scored (Certainly True = 0): 7, 11, 14, 21, 25.
 *
 * value (Total Difficulties Score) = Emotional + Conduct + Hyperactivity +
 * Peer subscale sums (0–40). Higher = more difficulties → lower_better.
 * The Prosocial subscale (0–10) is reported separately as a strength.
 *
 * Original 3-band parent cutoffs (Goodman 1997):
 *   0–13   Close to average (normal)
 *   14–16  Slightly raised (borderline)
 *   17–40  High / very high (abnormal — clinical concern)
 *
 * SDQ is freely available for non-commercial use (youthinmind / sdqinfo.org).
 * It is a SCREENING instrument — MCID not applicable.
 *
 * rawShape: 'item_array' — computeDerived expects a 25-length array of
 * integers 0–2, 0-based by item.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 25;
const NORMAL_MAX = 13; // 0–13
const BORDERLINE_MAX = 16; // 14–16  (≥17 abnormal)

// 1-based item numbers that are reverse-scored (Certainly True = 0).
const REVERSE_ITEMS = new Set([7, 11, 14, 21, 25]);

const SUBSCALES = {
  emotional: [3, 8, 13, 16, 24],
  conduct: [5, 7, 12, 18, 22],
  hyperactivity: [2, 10, 15, 21, 25],
  peer: [6, 11, 14, 19, 23],
  prosocial: [1, 4, 9, 17, 20],
};
// The four subscales summed into the Total Difficulties Score.
const DIFFICULTY_SUBSCALES = ['emotional', 'conduct', 'hyperactivity', 'peer'];

const DOMAINS = [
  { key: 'emotional', name_ar: 'الأعراض الانفعالية', name_en: 'Emotional Symptoms' },
  { key: 'conduct', name_ar: 'مشكلات السلوك', name_en: 'Conduct Problems' },
  {
    key: 'hyperactivity',
    name_ar: 'فرط الحركة/تشتّت الانتباه',
    name_en: 'Hyperactivity/Inattention',
  },
  { key: 'peer', name_ar: 'مشكلات العلاقة بالأقران', name_en: 'Peer Relationship Problems' },
  { key: 'prosocial', name_ar: 'السلوك الاجتماعي الإيجابي', name_en: 'Prosocial Behaviour' },
];

// number → { domain, ar, en }, in item order.
const RAW_ITEMS = [
  { n: 1, d: 'prosocial', ar: 'يراعي مشاعر الآخرين', en: "Considerate of other people's feelings" },
  {
    n: 2,
    d: 'hyperactivity',
    ar: 'كثير الحركة، لا يستطيع البقاء ساكنًا طويلًا',
    en: 'Restless, overactive, cannot stay still for long',
  },
  {
    n: 3,
    d: 'emotional',
    ar: 'كثيرًا ما يشكو من الصداع أو آلام المعدة أو الغثيان',
    en: 'Often complains of headaches, stomach-aches or sickness',
  },
  {
    n: 4,
    d: 'prosocial',
    ar: 'يشارك الأطفال الآخرين بسهولة (الحلوى، الألعاب، الأقلام...)',
    en: 'Shares readily with other children',
  },
  {
    n: 5,
    d: 'conduct',
    ar: 'كثيرًا ما تنتابه نوبات غضب أو حدّة طبع',
    en: 'Often has temper tantrums or hot tempers',
  },
  {
    n: 6,
    d: 'peer',
    ar: 'يميل إلى الانعزال واللعب بمفرده',
    en: 'Rather solitary, tends to play alone',
  },
  {
    n: 7,
    d: 'conduct',
    ar: 'مطيع عمومًا، وعادةً ينفّذ ما يطلبه الكبار',
    en: 'Generally obedient, usually does what adults request',
  },
  {
    n: 8,
    d: 'emotional',
    ar: 'لديه قلق كثير، ويبدو قلقًا في أحيان كثيرة',
    en: 'Many worries, often seems worried',
  },
  {
    n: 9,
    d: 'prosocial',
    ar: 'يساعد إذا تأذّى أحد أو انزعج أو مرض',
    en: 'Helpful if someone is hurt, upset or feeling ill',
  },
  {
    n: 10,
    d: 'hyperactivity',
    ar: 'يتململ أو يتلوّى باستمرار',
    en: 'Constantly fidgeting or squirming',
  },
  { n: 11, d: 'peer', ar: 'لديه صديق مقرّب واحد على الأقل', en: 'Has at least one good friend' },
  {
    n: 12,
    d: 'conduct',
    ar: 'كثيرًا ما يتشاجر مع الأطفال أو يتنمّر عليهم',
    en: 'Often fights with other children or bullies them',
  },
  {
    n: 13,
    d: 'emotional',
    ar: 'كثيرًا ما يكون تعيسًا أو محبَطًا أو يبكي',
    en: 'Often unhappy, down-hearted or tearful',
  },
  {
    n: 14,
    d: 'peer',
    ar: 'محبوب عمومًا من الأطفال الآخرين',
    en: 'Generally liked by other children',
  },
  {
    n: 15,
    d: 'hyperactivity',
    ar: 'يتشتّت انتباهه بسهولة، ولا يحافظ على التركيز',
    en: 'Easily distracted, concentration wanders',
  },
  {
    n: 16,
    d: 'emotional',
    ar: 'متوتّر أو متعلّق في المواقف الجديدة، ويفقد ثقته بسهولة',
    en: 'Nervous or clingy in new situations, easily loses confidence',
  },
  { n: 17, d: 'prosocial', ar: 'لطيف مع الأطفال الأصغر سنًّا', en: 'Kind to younger children' },
  { n: 18, d: 'conduct', ar: 'كثيرًا ما يكذب أو يغشّ', en: 'Often lies or cheats' },
  {
    n: 19,
    d: 'peer',
    ar: 'يتعرّض للمضايقة أو التنمّر من الأطفال الآخرين',
    en: 'Picked on or bullied by other children',
  },
  {
    n: 20,
    d: 'prosocial',
    ar: 'كثيرًا ما يتطوّع لمساعدة الآخرين (الوالدين، المعلّمين، الأطفال)',
    en: 'Often volunteers to help others',
  },
  {
    n: 21,
    d: 'hyperactivity',
    ar: 'يفكّر في الأمور قبل أن يتصرّف',
    en: 'Thinks things out before acting',
  },
  {
    n: 22,
    d: 'conduct',
    ar: 'يسرق من المنزل أو المدرسة أو أماكن أخرى',
    en: 'Steals from home, school or elsewhere',
  },
  {
    n: 23,
    d: 'peer',
    ar: 'ينسجم مع الكبار أكثر من انسجامه مع أقرانه',
    en: 'Gets on better with adults than with other children',
  },
  {
    n: 24,
    d: 'emotional',
    ar: 'لديه مخاوف كثيرة، ويُفزَع بسهولة',
    en: 'Many fears, easily scared',
  },
  {
    n: 25,
    d: 'hyperactivity',
    ar: 'ينجز المهام حتى نهايتها، ولديه انتباه جيّد',
    en: 'Sees tasks through to the end, good attention span',
  },
];

// Per-item response options. atRisk marks the clinically-concerning answer,
// which differs for reverse-scored items and is omitted for prosocial
// strengths (where a high score is desirable, not at-risk).
function _optionsFor(item) {
  const reverse = REVERSE_ITEMS.has(item.n);
  const prosocial = item.d === 'prosocial';
  return [
    {
      value: 0,
      label_ar: 'لا تنطبق',
      label_en: 'Not True',
      atRisk: !prosocial && reverse ? true : undefined,
    },
    { value: 1, label_ar: 'تنطبق إلى حدٍّ ما', label_en: 'Somewhat True' },
    {
      value: 2,
      label_ar: 'تنطبق تمامًا',
      label_en: 'Certainly True',
      atRisk: !prosocial && !reverse ? true : undefined,
    },
  ].map(o =>
    o.atRisk === undefined ? { value: o.value, label_ar: o.label_ar, label_en: o.label_en } : o
  );
}

const itemBank = {
  instrumentName_ar: 'استبيان نقاط القوة والصعوبات — تقرير مقدّم الرعاية',
  instrumentName_en: 'Strengths and Difficulties Questionnaire — Parent/Caregiver report',
  instrumentVersion: 'SDQ-P4-17',
  ageRange: { minMonths: 48, maxMonths: 204 },
  respondent: 'caregiver',
  estimatedMinutes: 8,
  responseScaleNote_ar:
    'استنادًا إلى سلوك طفلك خلال الأشهر الستة الماضية، حدّد مدى انطباق كلّ عبارة: «لا تنطبق» أو «إلى حدٍّ ما» أو «تنطبق تمامًا».',
  responseScaleNote_en:
    "Based on your child's behaviour over the last six months, mark each statement Not True, Somewhat True, or Certainly True.",
  domains: DOMAINS,
  items: RAW_ITEMS.map(it => ({
    number: it.n,
    text_ar: it.ar,
    text_en: it.en,
    domain: it.d,
    reverseScored: REVERSE_ITEMS.has(it.n),
    responseOptions: _optionsFor(it),
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`SDQ has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v > 2) {
      errors.push(`item ${i + 1}: must be integer 0-2 — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

// reverse items: Certainly True (2) → 0; otherwise the response value as-is.
function _itemScore(itemNumber, value) {
  return REVERSE_ITEMS.has(itemNumber) ? 2 - value : value;
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`SDQ: invalid raw items — ${v.errors.join('; ')}`);
  }
  const scoreByItem = {};
  rawItems.forEach((value, idx) => {
    const n = idx + 1;
    scoreByItem[n] = _itemScore(n, value);
  });

  const subscales = {};
  for (const [key, items] of Object.entries(SUBSCALES)) {
    subscales[key] = items.reduce((sum, n) => sum + scoreByItem[n], 0);
  }
  const total = DIFFICULTY_SUBSCALES.reduce((sum, k) => sum + subscales[k], 0);
  subscales.totalDifficulties = total;

  return {
    value: total,
    subscales,
    notes: {
      reverseItems: [...REVERSE_ITEMS],
      method: 'total_difficulties_sum_of_4_subscales',
      prosocialIsStrength: true,
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('SDQ.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > 40) {
    throw new Error(`SDQ.interpret: derivedValue ${derivedValue} outside 0-40`);
  }
  if (derivedValue <= NORMAL_MAX) {
    return {
      band: 'close_to_average',
      tier: 'L1',
      label_ar: 'ضمن المعدّل الطبيعي',
      label_en: 'Close to average',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا حاجة لإجراء إضافي ما لم تظهر مؤشرات أخرى — متابعة دورية.',
      action_en: 'No further action unless other concerns arise — routine monitoring.',
    };
  }
  if (derivedValue <= BORDERLINE_MAX) {
    return {
      band: 'slightly_raised',
      tier: 'L2',
      label_ar: 'مرتفع قليلًا — بحاجة للمتابعة',
      label_en: 'Slightly raised — monitor',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar:
        'مراجعة النطاقات الفرعية الأعلى وتعديل أهداف الخطة، مع إعادة التقييم خلال الفترة المحدّدة.',
      action_en:
        'Review the elevated subscales, adjust care-plan goals, and reassess within the standard interval.',
    };
  }
  return {
    band: 'high',
    tier: 'L3',
    label_ar: 'مرتفع — مدعاة للقلق السريري',
    label_en: 'High — clinical concern',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'تحويل لتقييم نفسي-سلوكي متخصّص وبدء خطة تدخّل مستهدفة.',
    action_en:
      'Refer for specialist psychological/behavioural evaluation and begin a targeted intervention plan.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const bandOf = s => (s <= NORMAL_MAX ? 'normal' : s <= BORDERLINE_MAX ? 'borderline' : 'high');
  return {
    ...base,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'SDQ',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: 40 },
  subscaleDerivedTypes: {
    emotional: 'sum',
    conduct: 'sum',
    hyperactivity: 'sum',
    peer: 'sum',
    prosocial: 'sum',
  },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
