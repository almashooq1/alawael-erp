'use strict';

/**
 * flacc.js — W706 scoring module for the FLACC observational pain scale
 * (Merkel, Voepel-Lewis, Shayevitz & Malviya 1997) — behavioural pain
 * assessment for individuals who cannot self-report (nonverbal beneficiaries,
 * young children, severe cognitive/communication impairment).
 *
 * 5 categories — Face, Legs, Activity, Cry, Consolability — each scored 0–2
 * by direct observation. value = sum (0–10). Higher = more pain →
 * lower_better.
 *
 * Interpretation (common clinical convention):
 *   0     Relaxed / comfortable
 *   1–3   Mild discomfort
 *   4–6   Moderate pain
 *   7–10  Severe pain / discomfort
 *
 * This is highly relevant to a disability population where many beneficiaries
 * are nonverbal — it lets the care team quantify and trend pain that would
 * otherwise go undocumented.
 *
 * The FLACC scale is widely reproduced in the clinical literature and is
 * freely usable with attribution to its authors (University of Michigan).
 *
 * rawShape: 'item_array' — 5-length array of integers 0–2,
 * order: [Face, Legs, Activity, Cry, Consolability].
 */

const { standardDelta } = require('./contract');

const ITEM_COUNT = 5;
const ITEM_MAX = 2;
const MAX_SCORE = 10;

const RAW_ITEMS = [
  {
    n: 1,
    key: 'face',
    ar: 'الوجه',
    en: 'Face',
    opts: [
      {
        value: 0,
        ar: 'تعبير محايد أو ابتسامة',
        en: 'No particular expression or smile',
      },
      {
        value: 1,
        ar: 'تجهّم أحيانًا، انسحاب، عدم اهتمام',
        en: 'Occasional grimace or frown; withdrawn, disinterested',
        atRisk: true,
      },
      {
        value: 2,
        ar: 'ارتعاش متكرر للذقن، إطباق الفكين',
        en: 'Frequent to constant frown, clenched jaw, quivering chin',
        atRisk: true,
      },
    ],
  },
  {
    n: 2,
    key: 'legs',
    ar: 'الساقان',
    en: 'Legs',
    opts: [
      { value: 0, ar: 'وضع طبيعي أو مسترخٍ', en: 'Normal position or relaxed' },
      { value: 1, ar: 'قلق، تململ، توتّر', en: 'Uneasy, restless, tense', atRisk: true },
      { value: 2, ar: 'ركل أو سحب الساقين للأعلى', en: 'Kicking or legs drawn up', atRisk: true },
    ],
  },
  {
    n: 3,
    key: 'activity',
    ar: 'النشاط',
    en: 'Activity',
    opts: [
      {
        value: 0,
        ar: 'مستلقٍ بهدوء، وضع طبيعي، حركة سهلة',
        en: 'Lying quietly, normal position, moves easily',
      },
      {
        value: 1,
        ar: 'تلوٍّ، تحرّك ذهابًا وإيابًا، توتّر',
        en: 'Squirming, shifting back and forth, tense',
        atRisk: true,
      },
      {
        value: 2,
        ar: 'متقوّس، متيبّس، أو يرتجف',
        en: 'Arched, rigid, or jerking',
        atRisk: true,
      },
    ],
  },
  {
    n: 4,
    key: 'cry',
    ar: 'البكاء',
    en: 'Cry',
    opts: [
      { value: 0, ar: 'لا بكاء (مستيقظ أو نائم)', en: 'No cry (awake or asleep)' },
      {
        value: 1,
        ar: 'أنين أو تأوّه، شكوى متقطّعة',
        en: 'Moans or whimpers, occasional complaint',
        atRisk: true,
      },
      {
        value: 2,
        ar: 'بكاء مستمر، صراخ أو نشيج، شكوى متكرّرة',
        en: 'Crying steadily, screams or sobs, frequent complaints',
        atRisk: true,
      },
    ],
  },
  {
    n: 5,
    key: 'consolability',
    ar: 'القابلية للتهدئة',
    en: 'Consolability',
    opts: [
      { value: 0, ar: 'هادئ، مطمئن، لا يحتاج تهدئة', en: 'Content, relaxed' },
      {
        value: 1,
        ar: 'يطمئن باللمس أو العناق أو الحديث؛ يمكن تشتيته',
        en: 'Reassured by touching, hugging, or talking; distractible',
        atRisk: true,
      },
      {
        value: 2,
        ar: 'صعب التهدئة أو الإراحة',
        en: 'Difficult to console or comfort',
        atRisk: true,
      },
    ],
  },
];

const itemBank = {
  instrumentName_ar: 'مقياس فلاك السلوكي لتقييم الألم (للأشخاص غير القادرين على التعبير اللفظي)',
  instrumentName_en: 'FLACC Behavioral Pain Scale',
  instrumentVersion: 'FLACC (1997)',
  respondent: 'clinician',
  estimatedMinutes: 3,
  responseScaleNote_ar:
    'يقيّم المختصّ كل فئة من الفئات الخمس بالملاحظة المباشرة (0–2)، والمجموع من 0 إلى 10.',
  responseScaleNote_en:
    'The clinician rates each of the five categories by direct observation (0–2); total ranges 0–10.',
  domains: RAW_ITEMS.map(it => ({ key: it.key, name_ar: it.ar, name_en: it.en })),
  items: RAW_ITEMS.map(it => ({
    number: it.n,
    domain: it.key,
    text_ar: it.ar,
    text_en: it.en,
    responseOptions: it.opts.map(o => ({
      value: o.value,
      label_ar: o.ar,
      label_en: o.en,
      atRisk: o.atRisk || undefined,
    })),
  })),
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== ITEM_COUNT) {
    errors.push(`FLACC has ${ITEM_COUNT} categories — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v > ITEM_MAX) {
      errors.push(`category ${i + 1}: must be integer 0-${ITEM_MAX} — got ${JSON.stringify(v)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) {
    throw new Error(`FLACC: invalid raw items — ${v.errors.join('; ')}`);
  }
  const total = rawItems.reduce((acc, item) => acc + item, 0);
  return {
    value: total,
    subscales: {
      face: rawItems[0],
      legs: rawItems[1],
      activity: rawItems[2],
      cry: rawItems[3],
      consolability: rawItems[4],
    },
    notes: { method: 'sum_of_5_categories' },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('FLACC.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > MAX_SCORE) {
    throw new Error(`FLACC.interpret: derivedValue ${derivedValue} outside 0-${MAX_SCORE}`);
  }
  if (derivedValue === 0) {
    return {
      band: 'comfortable',
      tier: 'L0',
      label_ar: 'مرتاح / مسترخٍ',
      label_en: 'Relaxed / comfortable',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'لا مؤشّر على ألم — متابعة روتينية.',
      action_en: 'No pain indicated — routine monitoring.',
    };
  }
  if (derivedValue <= 3) {
    return {
      band: 'mild',
      tier: 'L1',
      label_ar: 'انزعاج خفيف',
      label_en: 'Mild discomfort',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'إجراءات راحة غير دوائية وإعادة تقييم.',
      action_en: 'Non-pharmacological comfort measures and reassessment.',
    };
  }
  if (derivedValue <= 6) {
    return {
      band: 'moderate',
      tier: 'L2',
      label_ar: 'ألم متوسط',
      label_en: 'Moderate pain',
      severity: 'moderate',
      color: '#ef6c00',
      action_ar: 'تدخّل لتسكين الألم وإبلاغ الفريق الطبي؛ إعادة تقييم خلال فترة قصيرة.',
      action_en: 'Pain-relief intervention and notify the medical team; reassess shortly.',
    };
  }
  return {
    band: 'severe',
    tier: 'L3',
    label_ar: 'ألم شديد',
    label_en: 'Severe pain',
    severity: 'severe',
    color: '#b71c1c',
    action_ar: 'تدخّل عاجل لتسكين الألم وتقييم طبي فوري للسبب.',
    action_en: 'Urgent analgesia and immediate medical evaluation of the cause.',
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
  measureCode: 'FLACC',
  engineVersion: '1.0.0',
  derivedType: 'sum',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: ITEM_COUNT,
  scoreRange: { min: 0, max: MAX_SCORE },
  cutoff: 4, // ≥4 → moderate+ pain warranting intervention
  subscaleDerivedTypes: {
    face: 'sum',
    legs: 'sum',
    activity: 'sum',
    cry: 'sum',
    consolability: 'sum',
  },
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
