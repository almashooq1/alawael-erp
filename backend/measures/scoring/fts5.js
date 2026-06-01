'use strict';

/**
 * fts5.js — W712 scoring module for the Five Times Sit-to-Stand Test (5×STS).
 *
 * A timed functional test of lower-limb strength, transfer ability and
 * dynamic balance: the time (seconds) to stand fully and sit five times,
 * arms folded across the chest. Lower (faster) = better.
 *
 * Widely used fall-risk / frailty screen. Common adult cut-points:
 *   ≥ 12 s   → increased fall risk
 *   ≥ 15 s   → frailty / marked impairment
 * Unable to complete is recorded separately by the clinician.
 *
 * Public domain; free clinical use. rawShape: 'item_array' (single value =
 * seconds, a positive number; non-integer allowed).
 */

const { standardDelta } = require('./contract');

const SCORE_MIN = 0;
const SCORE_MAX = 120; // generous upper bound (seconds); UI records "unable" separately
const CUTOFF = 12; // ≥ 12 s → increased fall risk

const itemBank = {
  instrumentName_ar: 'اختبار الوقوف من الجلوس خمس مرات (5×STS)',
  instrumentName_en: 'Five Times Sit-to-Stand Test (5×STS)',
  instrumentVersion: '5×STS (timed, seconds)',
  respondent: 'clinician_measured',
  estimatedMinutes: 2,
  responseScaleNote_ar:
    'يُسجَّل الزمن بالثواني لإكمال خمس دورات وقوف-جلوس كاملة والذراعان مطويتان على الصدر. أقل = أفضل.',
  responseScaleNote_en:
    'Record the time in seconds to complete five full stand–sit cycles with arms folded across the chest. Lower = better.',
  items: [
    {
      number: 1,
      text_ar: 'الزمن (بالثواني) لإكمال خمس دورات وقوف-جلوس متتالية',
      text_en: 'Time (seconds) to complete five consecutive sit-to-stand cycles',
    },
  ],
};

function validateRaw(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems)) {
    errors.push('rawItems must be an array');
    return { ok: false, errors };
  }
  if (rawItems.length !== 1) {
    errors.push(`5×STS expects exactly 1 value — got ${rawItems.length}`);
  }
  const v = rawItems[0];
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > SCORE_MAX) {
    errors.push(
      `time must be a positive number of seconds ≤ ${SCORE_MAX} — got ${JSON.stringify(v)}`
    );
  }
  return { ok: errors.length === 0, errors };
}

function computeDerived(rawItems /*, ctx */) {
  const v = validateRaw(rawItems);
  if (!v.ok) throw new Error(`5×STS: invalid input — ${v.errors.join('; ')}`);
  const seconds = Math.round(rawItems[0] * 10) / 10;
  return {
    value: seconds,
    notes: { method: 'timed', unit: 'seconds', increasedFallRisk: seconds >= CUTOFF },
  };
}

function interpret(derivedValue /*, ctx */) {
  if (!Number.isFinite(derivedValue) || derivedValue <= SCORE_MIN || derivedValue > SCORE_MAX) {
    throw new Error(`5×STS.interpret: time ${derivedValue} out of range (0, ${SCORE_MAX}]`);
  }
  if (derivedValue < CUTOFF) {
    return {
      band: 'normal_performance',
      tier: 'L0',
      label_ar: 'أداء طبيعي',
      label_en: 'Normal performance',
      severity: 'normal',
      color: '#2e7d32',
      action_ar: 'قوة وتوازن وظيفيان مناسبان؛ حافظ على برنامج النشاط الحالي.',
      action_en: 'Adequate functional strength and balance; maintain current activity programme.',
    };
  }
  if (derivedValue < 15) {
    return {
      band: 'increased_fall_risk',
      tier: 'L1',
      label_ar: 'خطر سقوط متزايد',
      label_en: 'Increased fall risk',
      severity: 'mild',
      color: '#9e9d24',
      action_ar: 'برنامج تقوية للأطراف السفلية وتدريب توازن ومراجعة بيئة السقوط.',
      action_en: 'Lower-limb strengthening, balance training and fall-environment review.',
    };
  }
  if (derivedValue < 20) {
    return {
      band: 'marked_impairment',
      tier: 'L2',
      label_ar: 'ضعف وظيفي ملحوظ',
      label_en: 'Marked functional impairment',
      severity: 'severe',
      color: '#ef6c00',
      action_ar: 'تأهيل مكثّف موجّه ووسائل مساعدة على التنقل وتقييم خطر السقوط الرسمي.',
      action_en: 'Intensive targeted rehab, mobility aids and a formal fall-risk assessment.',
    };
  }
  return {
    band: 'severe_impairment',
    tier: 'L3',
    label_ar: 'ضعف وظيفي شديد',
    label_en: 'Severe functional impairment',
    severity: 'critical',
    color: '#c62828',
    action_ar: 'احتياطات سقوط عالية، دعم تنقّل، ومراجعة فريق تأهيل عاجلة.',
    action_en: 'High fall precautions, mobility support and an urgent rehab-team review.',
  };
}

function delta(prev, curr, measure) {
  const base = standardDelta(prev, curr, measure, 'lower_better');
  if (!base) return null;
  const risk = t => t >= CUTOFF;
  return {
    ...base,
    fallRiskCrossed:
      prev != null && curr != null && !risk(prev) && risk(curr)
        ? true
        : prev != null && curr != null && risk(prev) && !risk(curr)
          ? false
          : null,
  };
}

module.exports = {
  measureCode: 'FTS5',
  engineVersion: '1.0.0',
  derivedType: 'algorithm',
  direction: 'lower_better',
  rawShape: 'item_array',
  expectedItemCount: 1,
  scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
  cutoff: CUTOFF,
  validateRaw,
  computeDerived,
  interpret,
  delta,
  itemBank,
};
