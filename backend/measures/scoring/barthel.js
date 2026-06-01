'use strict';

/**
 * barthel.js — W706 scoring module for the Barthel Index of Activities of
 * Daily Living (Mahoney & Barthel 1965). A 10-item WEIGHTED ordinal scale
 * of functional independence in basic ADLs. Total 0–100 in steps of 5;
 * higher = more independent → higher_better.
 *
 * This is a cornerstone outcome in rehabilitation — it quantifies how much
 * help a beneficiary needs across feeding, hygiene, continence, transfers
 * and mobility, and is sensitive to functional gains over an episode of care.
 *
 * Per-item maxima differ (that is why derivedType = 'weighted_sum'):
 *   feeding 10 · bathing 5 · grooming 5 · dressing 10 · bowels 10 ·
 *   bladder 10 · toilet 10 · transfers 15 · mobility 15 · stairs 10  = 100
 *
 * Interpretation (widely used dependency bands):
 *   0–20    Total dependency
 *   21–60   Severe dependency
 *   61–90   Moderate dependency
 *   91–99   Slight dependency
 *   100     Independent
 *
 * The Barthel Index is in the public domain and free for clinical use.
 *
 * rawShape: 'item_array' — 10-length array, one allowed weighted value per
 * item (NOT 0–N), order matches ITEMS below.
 */

const { standardDelta } = require('./contract');

const ITEMS = [
  {
    n: 1,
    key: 'feeding',
    ar: 'الأكل',
    en: 'Feeding',
    opts: [
      { value: 0, ar: 'غير قادر', en: 'Unable', atRisk: true },
      {
        value: 5,
        ar: 'يحتاج مساعدة (تقطيع/دهن)',
        en: 'Needs help cutting, spreading',
        atRisk: true,
      },
      { value: 10, ar: 'مستقل', en: 'Independent' },
    ],
  },
  {
    n: 2,
    key: 'bathing',
    ar: 'الاستحمام',
    en: 'Bathing',
    opts: [
      { value: 0, ar: 'يعتمد على الغير', en: 'Dependent', atRisk: true },
      { value: 5, ar: 'مستقل', en: 'Independent' },
    ],
  },
  {
    n: 3,
    key: 'grooming',
    ar: 'العناية الشخصية',
    en: 'Grooming',
    opts: [
      {
        value: 0,
        ar: 'يحتاج مساعدة في العناية الشخصية',
        en: 'Needs help with personal care',
        atRisk: true,
      },
      { value: 5, ar: 'مستقل (وجه/شعر/أسنان/حلاقة)', en: 'Independent (face/hair/teeth/shaving)' },
    ],
  },
  {
    n: 4,
    key: 'dressing',
    ar: 'ارتداء الملابس',
    en: 'Dressing',
    opts: [
      { value: 0, ar: 'يعتمد على الغير', en: 'Dependent', atRisk: true },
      {
        value: 5,
        ar: 'يحتاج مساعدة جزئية',
        en: 'Needs help but can do about half unaided',
        atRisk: true,
      },
      {
        value: 10,
        ar: 'مستقل (بما فيه الأزرار والسحّابات)',
        en: 'Independent (incl. buttons, zips)',
      },
    ],
  },
  {
    n: 5,
    key: 'bowels',
    ar: 'التحكّم بالأمعاء',
    en: 'Bowels',
    opts: [
      { value: 0, ar: 'سلس / لا تحكّم', en: 'Incontinent', atRisk: true },
      { value: 5, ar: 'حادثة عرضية', en: 'Occasional accident', atRisk: true },
      { value: 10, ar: 'متحكّم', en: 'Continent' },
    ],
  },
  {
    n: 6,
    key: 'bladder',
    ar: 'التحكّم بالمثانة',
    en: 'Bladder',
    opts: [
      {
        value: 0,
        ar: 'سلس / قسطرة غير قادر على إدارتها',
        en: 'Incontinent, or catheterized and unable to manage',
        atRisk: true,
      },
      { value: 5, ar: 'حادثة عرضية', en: 'Occasional accident', atRisk: true },
      { value: 10, ar: 'متحكّم', en: 'Continent' },
    ],
  },
  {
    n: 7,
    key: 'toilet',
    ar: 'استخدام دورة المياه',
    en: 'Toilet use',
    opts: [
      { value: 0, ar: 'يعتمد على الغير', en: 'Dependent', atRisk: true },
      { value: 5, ar: 'يحتاج بعض المساعدة', en: 'Needs some help', atRisk: true },
      {
        value: 10,
        ar: 'مستقل (الجلوس/النهوض/الملابس/التنظيف)',
        en: 'Independent (on/off, dressing, wiping)',
      },
    ],
  },
  {
    n: 8,
    key: 'transfers',
    ar: 'الانتقال (سرير ↔ كرسي)',
    en: 'Transfers (bed to chair)',
    opts: [
      { value: 0, ar: 'غير قادر، لا توازن للجلوس', en: 'Unable, no sitting balance', atRisk: true },
      {
        value: 5,
        ar: 'مساعدة كبيرة (شخص أو شخصان)',
        en: 'Major help (one or two people)',
        atRisk: true,
      },
      {
        value: 10,
        ar: 'مساعدة بسيطة (لفظية أو جسدية)',
        en: 'Minor help (verbal or physical)',
        atRisk: true,
      },
      { value: 15, ar: 'مستقل', en: 'Independent' },
    ],
  },
  {
    n: 9,
    key: 'mobility',
    ar: 'الحركة على سطح مستوٍ',
    en: 'Mobility (on level surfaces)',
    opts: [
      { value: 0, ar: 'غير متحرّك أو < 50 مترًا', en: 'Immobile or < 50 m', atRisk: true },
      {
        value: 5,
        ar: 'مستقل بكرسي متحرّك > 50 مترًا',
        en: 'Wheelchair independent > 50 m',
        atRisk: true,
      },
      {
        value: 10,
        ar: 'يمشي بمساعدة شخص > 50 مترًا',
        en: 'Walks with help of one person > 50 m',
        atRisk: true,
      },
      {
        value: 15,
        ar: 'مستقل (قد يستخدم وسيلة مساعدة) > 50 مترًا',
        en: 'Independent (may use aid) > 50 m',
      },
    ],
  },
  {
    n: 10,
    key: 'stairs',
    ar: 'صعود/نزول الدرج',
    en: 'Stairs',
    opts: [
      { value: 0, ar: 'غير قادر', en: 'Unable', atRisk: true },
      {
        value: 5,
        ar: 'يحتاج مساعدة (لفظية/جسدية/أداة)',
        en: 'Needs help (verbal, physical, aid)',
        atRisk: true,
      },
      { value: 10, ar: 'مستقل', en: 'Independent' },
    ],
  },
];

const ALLOWED = ITEMS.map(it => it.opts.map(o => o.value));
const MAX_SCORE = 100;
const MCID = 9; // commonly cited minimal clinically important difference

const itemBank = {
  instrumentName_ar: 'مؤشّر بارثل لأنشطة الحياة اليومية',
  instrumentName_en: 'Barthel Index of Activities of Daily Living',
  instrumentVersion: 'Mahoney & Barthel (1965)',
  respondent: 'clinician',
  estimatedMinutes: 5,
  responseScaleNote_ar:
    'يختار المختصّ لكل بند مستوى الاستقلالية الأنسب بقيمته الموزونة؛ المجموع من 0 إلى 100.',
  responseScaleNote_en:
    'For each item the clinician selects the best-fitting independence level with its weighted value; total 0–100.',
  domains: ITEMS.map(it => ({ key: it.key, name_ar: it.ar, name_en: it.en })),
  items: ITEMS.map(it => ({
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
  if (rawItems.length !== ITEMS.length) {
    errors.push(`Barthel has ${ITEMS.length} items — got ${rawItems.length}`);
  }
  rawItems.forEach((v, i) => {
    const allowed = ALLOWED[i];
    if (!allowed || !allowed.includes(v)) {
      errors.push(
        `item ${i + 1} (${ITEMS[i] ? ITEMS[i].key : '?'}): value must be one of ${
          allowed ? allowed.join('/') : 'n/a'
        } — got ${JSON.stringify(v)}`
      );
    }
  });
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`Barthel: invalid raw items — ${v.errors.join('; ')}`);
  const total = rawItems.reduce((acc, x) => acc + x, 0);
  const subscales = {};
  ITEMS.forEach((it, i) => {
    subscales[it.key] = rawItems[i];
  });
  return { value: total, subscales, notes: { method: 'weighted_sum', max: MAX_SCORE } };
}

function interpret(derivedValue /*, ctx */) {
  if (typeof derivedValue !== 'number') {
    throw new Error('Barthel.interpret: derivedValue must be a number');
  }
  if (derivedValue < 0 || derivedValue > MAX_SCORE) {
    throw new Error(`Barthel.interpret: derivedValue ${derivedValue} outside 0-${MAX_SCORE}`);
  }
  if (derivedValue <= 20) {
    return band(
      'total_dependency',
      'L4',
      'اعتماد كلّي',
      'Total dependency',
      'critical',
      '#b71c1c',
      'يحتاج رعاية ومساعدة كاملة في أنشطة الحياة اليومية.',
      'Requires full assistance across daily-living activities.'
    );
  }
  if (derivedValue <= 60) {
    return band(
      'severe_dependency',
      'L3',
      'اعتماد شديد',
      'Severe dependency',
      'severe',
      '#c62828',
      'يحتاج مساعدة كبيرة؛ خطة تأهيل مكثّفة لتعزيز الاستقلالية.',
      'Needs substantial help; intensive rehabilitation to build independence.'
    );
  }
  if (derivedValue <= 90) {
    return band(
      'moderate_dependency',
      'L2',
      'اعتماد متوسط',
      'Moderate dependency',
      'moderate',
      '#ef6c00',
      'استقلالية جزئية؛ استهداف البنود المتبقّية في خطة العلاج.',
      'Partial independence; target remaining items in the plan of care.'
    );
  }
  if (derivedValue <= 99) {
    return band(
      'slight_dependency',
      'L1',
      'اعتماد طفيف',
      'Slight dependency',
      'mild',
      '#9e9d24',
      'شبه مستقل؛ دعم بسيط في بند أو بندين.',
      'Near-independent; minor support in one or two items.'
    );
  }
  return band(
    'independent',
    'L0',
    'مستقل',
    'Independent',
    'normal',
    '#2e7d32',
    'مستقل في جميع أنشطة الحياة اليومية الأساسية.',
    'Independent in all basic activities of daily living.'
  );
}

function band(b, tier, label_ar, label_en, severity, color, action_ar, action_en) {
  return { band: b, tier, label_ar, label_en, severity, color, action_ar, action_en };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'higher_better');
  if (!base) return null;
  const bandOf = s => interpret(s).band;
  return {
    ...base,
    mcidMet: prev != null && curr != null ? Math.abs(curr - prev) >= MCID : null,
    bandChange:
      prev != null && curr != null && bandOf(prev) !== bandOf(curr)
        ? `${bandOf(prev)}_to_${bandOf(curr)}`
        : null,
  };
}

module.exports = {
  measureCode: 'BARTHEL',
  engineVersion: '1.0.0',
  derivedType: 'weighted_sum',
  direction: 'higher_better',
  rawShape: 'item_array',
  expectedItemCount: ITEMS.length,
  scoreRange: { min: 0, max: MAX_SCORE },
  cutoff: 60, // ≤60 → severe+ dependency
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
