'use strict';

/**
 * mchat-r.js — W554 scoring module for the Modified Checklist for Autism
 * in Toddlers, Revised with Follow-Up (M-CHAT-R/F; Robins, Fein & Barton
 * 2009). Caregiver-completed autism screening for children aged 16–30
 * months.
 *
 * 20 yes/no items. The TOTAL score is the count of "at-risk" responses
 * (0–20). For most items "No" is the at-risk response; for items 2, 5 and
 * 12 the at-risk response is "Yes" (reverse-scored — wondering about
 * deafness, unusual finger movements, distress at everyday noise).
 *
 * Risk bands (official M-CHAT-R/F scoring):
 *   0–2   LOW    — no further action unless routine surveillance flags concern
 *   3–7   MEDIUM — administer the Follow-Up interview; refer if it stays ≥2
 *   8–20  HIGH   — bypass Follow-Up; refer immediately for diagnostic eval
 *                  + early-intervention services
 *
 * direction: lower_better (fewer at-risk responses = lower autism risk).
 *
 * M-CHAT-R/F is a SCREENING instrument, not an outcome measure — MCID is
 * not applicable; the Measure document carries mcid.status='not_applicable'.
 * It is included in this engine so the digital-administration UI can render
 * the bilingual questionnaire and auto-score it.
 *
 * rawShape: 'item_array' — computeDerived expects a 20-length array of
 * response values where 1 = "Yes" (نعم) and 0 = "No" (لا), 0-based by item.
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 20;
// 1-based item numbers whose AT-RISK answer is "Yes" (all others: "No").
const REVERSE_ITEMS = new Set([2, 5, 12]);
const LOW_MAX = 2; // 0–2
const MEDIUM_MAX = 7; // 3–7  (≥8 is HIGH)

// ─── Item content (official M-CHAT-R/F wording + MSA Arabic) ────────────────
// `atRiskValue` is the response value that counts toward the total.
const RAW_ITEMS = [
  {
    n: 1,
    ar: 'إذا أشرتَ إلى شيء في الجهة الأخرى من الغرفة، هل ينظر طفلك إليه؟',
    en: 'If you point at something across the room, does your child look at it?',
  },
  {
    n: 2,
    ar: 'هل تساءلتَ يومًا عمّا إذا كان طفلك أصمّ؟',
    en: 'Have you ever wondered if your child might be deaf?',
  },
  {
    n: 3,
    ar: 'هل يمارس طفلك اللعب التخيّلي أو الإيهامي؟',
    en: 'Does your child play pretend or make-believe?',
  },
  {
    n: 4,
    ar: 'هل يحب طفلك تسلّق الأشياء؟',
    en: 'Does your child like climbing on things?',
  },
  {
    n: 5,
    ar: 'هل يقوم طفلك بحركات غير اعتيادية بأصابعه قرب عينيه؟',
    en: 'Does your child make unusual finger movements near his or her eyes?',
  },
  {
    n: 6,
    ar: 'هل يشير طفلك بإصبع واحد ليطلب شيئًا أو ليحصل على مساعدة؟',
    en: 'Does your child point with one finger to ask for something or to get help?',
  },
  {
    n: 7,
    ar: 'هل يشير طفلك بإصبع واحد ليُريك شيئًا مثيرًا للاهتمام؟',
    en: 'Does your child point with one finger to show you something interesting?',
  },
  {
    n: 8,
    ar: 'هل طفلك مهتمّ بالأطفال الآخرين؟',
    en: 'Is your child interested in other children?',
  },
  {
    n: 9,
    ar: 'هل يُريك طفلك الأشياء بإحضارها إليك أو رفعها أمامك — لا لطلب المساعدة بل لمشاركتك إياها؟',
    en: 'Does your child show you things by bringing them to you or holding them up for you to see — not to get help, but just to share?',
  },
  {
    n: 10,
    ar: 'هل يستجيب طفلك عندما تناديه باسمه؟',
    en: 'Does your child respond when you call his or her name?',
  },
  {
    n: 11,
    ar: 'عندما تبتسم لطفلك، هل يبادلك الابتسامة؟',
    en: 'When you smile at your child, does he or she smile back at you?',
  },
  {
    n: 12,
    ar: 'هل ينزعج طفلك من الأصوات اليومية الاعتيادية؟',
    en: 'Does your child get upset by everyday noises?',
  },
  {
    n: 13,
    ar: 'هل يمشي طفلك؟',
    en: 'Does your child walk?',
  },
  {
    n: 14,
    ar: 'هل ينظر طفلك في عينيك أثناء حديثك معه أو لعبك معه أو إلباسه؟',
    en: 'Does your child look you in the eye when you are talking to him or her, playing with him or her, or dressing him or her?',
  },
  {
    n: 15,
    ar: 'هل يحاول طفلك تقليد ما تفعله؟',
    en: 'Does your child try to copy what you do?',
  },
  {
    n: 16,
    ar: 'إذا أدرتَ رأسك لتنظر إلى شيء، هل ينظر طفلك حوله ليرى ما تنظر إليه؟',
    en: 'If you turn your head to look at something, does your child look around to see what you are looking at?',
  },
  {
    n: 17,
    ar: 'هل يحاول طفلك أن يجعلك تنظر إليه؟',
    en: 'Does your child try to get you to watch him or her?',
  },
  {
    n: 18,
    ar: 'هل يفهم طفلك عندما تطلب منه القيام بشيء؟',
    en: 'Does your child understand when you tell him or her to do something?',
  },
  {
    n: 19,
    ar: 'إذا حدث شيء جديد، هل ينظر طفلك إلى وجهك ليرى شعورك تجاهه؟',
    en: 'If something new happens, does your child look at your face to see how you feel about it?',
  },
  {
    n: 20,
    ar: 'هل يحب طفلك الأنشطة الحركية (مثل التأرجح أو القفز على ركبتيك)؟',
    en: 'Does your child like movement activities?',
  },
];

// ─── Item bank (W553 contract) ─────────────────────────────────────────────
const itemBank = {
  instrumentName_ar: 'قائمة الفحص المعدّلة للتوحّد لدى الأطفال الصغار — مع المتابعة',
  instrumentName_en: 'Modified Checklist for Autism in Toddlers, Revised with Follow-Up',
  instrumentVersion: 'R/F-2009',
  ageRange: { minMonths: 16, maxMonths: 30 },
  respondent: 'caregiver',
  estimatedMinutes: 10,
  responseScaleNote_ar:
    'أجب بـ«نعم» أو «لا» عن السلوك المعتاد لطفلك. إذا لاحظتَ السلوك مرّة أو مرّتين فقط فأجب بـ«لا».',
  responseScaleNote_en:
    "Answer Yes or No based on your child's usual behaviour. If the behaviour was seen only once or twice, answer No.",
  items: RAW_ITEMS.map(it => ({
    number: it.n,
    text_ar: it.ar,
    text_en: it.en,
    reverseScored: REVERSE_ITEMS.has(it.n),
    responseOptions: [
      { value: 1, label_ar: 'نعم', label_en: 'Yes', atRisk: REVERSE_ITEMS.has(it.n) },
      { value: 0, label_ar: 'لا', label_en: 'No', atRisk: !REVERSE_ITEMS.has(it.n) },
    ],
  })),
};

// ─── Scoring ────────────────────────────────────────────────────────────────

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`M-CHAT-R/F has ${ITEM_COUNT} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (v !== 0 && v !== 1) {
      errors.push(`item ${i + 1}: must be 1 (Yes) or 0 (No) — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function _isAtRisk(itemNumber, value) {
  // For reverse items the at-risk answer is "Yes" (1); for all others "No" (0).
  return REVERSE_ITEMS.has(itemNumber) ? value === 1 : value === 0;
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`M-CHAT-R/F: invalid raw items — ${v.errors.join('; ')}`);
  }
  const flaggedItems = [];
  let total = 0;
  rawItems.forEach((value, idx) => {
    const itemNumber = idx + 1;
    if (_isAtRisk(itemNumber, value)) {
      total += 1;
      flaggedItems.push(itemNumber);
    }
  });
  return {
    value: total,
    notes: {
      flaggedItems,
      reverseItems: [...REVERSE_ITEMS],
      method: 'count_at_risk_responses',
    },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('M-CHAT-R/F.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > ITEM_COUNT) {
    throw new Error(`M-CHAT-R/F.interpret: derivedValue ${derivedValue} outside 0-${ITEM_COUNT}`);
  }
  if (derivedValue <= LOW_MAX) {
    return {
      band: 'low_risk',
      tier: 'L1',
      label_ar: 'خطر منخفض',
      label_en: 'Low risk',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا حاجة لإجراء إضافي ما لم تظهر مؤشرات في المتابعة النمائية الروتينية.',
      action_en: 'No further action unless routine developmental surveillance raises concern.',
      followUpRequired: false,
    };
  }
  if (derivedValue <= MEDIUM_MAX) {
    return {
      band: 'medium_risk',
      tier: 'L2',
      label_ar: 'خطر متوسط',
      label_en: 'Medium risk',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar:
        'إجراء مقابلة المتابعة (Follow-Up). إذا بقيت الدرجة ≥ 2 بعد المتابعة، يُحوَّل لتقييم تشخيصي وتدخّل مبكّر.',
      action_en:
        'Administer the Follow-Up interview. If the Follow-Up score remains ≥2, refer for diagnostic evaluation and early intervention.',
      followUpRequired: true,
    };
  }
  return {
    band: 'high_risk',
    tier: 'L3',
    label_ar: 'خطر مرتفع',
    label_en: 'High risk',
    severity: 'severe',
    color: '#b71c1c',
    action_ar:
      'تجاوز مقابلة المتابعة والتحويل المباشر لتقييم تشخيصي شامل (ADOS-2 / ADI-R) وبدء خدمات التدخّل المبكّر.',
    action_en:
      'Bypass the Follow-Up and refer immediately for a comprehensive diagnostic evaluation (ADOS-2 / ADI-R) and early-intervention services.',
    followUpRequired: false,
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const bandOf = s => (s <= LOW_MAX ? 'low' : s <= MEDIUM_MAX ? 'medium' : 'high');
  return {
    ...base,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'M-CHAT-R',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: ITEM_COUNT },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
