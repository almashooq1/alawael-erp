'use strict';

/**
 * assessmentCombinationRules.service.js — Wave 208
 *
 * Rules that fire only when MULTIPLE measure interpretations
 * intersect in clinically meaningful ways. The W206 engine's
 * GOAL_TEMPLATES table fires goal templates independently per
 * (measure, tier) — useful, but blind to compound cases.
 *
 * Example: GMFCS-5 alone gets a "preventive positioning" goal.
 * CFCS-5 alone gets an AAC-priority goal. Together (a non-
 * ambulatory non-communicative child) the clinical priority
 * is dramatically higher — they need urgent multi-disciplinary
 * AAC + caregiver-led communication training, not the two
 * templates summed.
 *
 * Each rule:
 *   • a `when(interpretations)` predicate over the engine's
 *     normalized interpretation shape
 *   • a `goals[]` static list (uses same SMART scaffold as
 *     GOAL_TEMPLATES)
 *   • a `severity` tag for sorting (CRITICAL > HIGH > STANDARD)
 *
 * Pure module — no DB, no engine import. The engine calls
 * `applyCombinationRules(interpretations)` and merges the
 * returned goals into its output (deduped against existing
 * templates by title).
 */

const DOMAINS = Object.freeze({
  MOTOR: 'motor',
  SELF_CARE: 'self_care',
  COMMUNICATION: 'communication',
  COGNITIVE: 'cognitive',
  BEHAVIOR: 'behavior',
  SOCIAL: 'social',
  ADAPTIVE: 'adaptive',
});

// Helper: find an interpretation by measureKey, ok=true only
function findOk(interpretations, measureKey) {
  return (interpretations || []).find(i => i && i.ok && i.measureKey === measureKey) || null;
}

// Helper: numeric tier (for ordinal measures only)
function tierNum(interp) {
  if (!interp || !interp.tier) return null;
  const n = Number(interp.tier);
  return Number.isInteger(n) ? n : null;
}

const RULES = Object.freeze([
  // ─── R1: Severe CP non-ambulatory + non-communicator ───────
  {
    id: 'R1_CP_NONAMB_NONCOMM',
    label_ar: 'حالة شلل دماغي شديدة: غير قادر على المشي + غير قادر على التواصل',
    severity: 'CRITICAL',
    when: interps => {
      const gmfcs = tierNum(findOk(interps, 'GMFCS'));
      const cfcs = tierNum(findOk(interps, 'CFCS'));
      return gmfcs !== null && cfcs !== null && gmfcs >= 4 && cfcs >= 4;
    },
    goals: [
      {
        domain: DOMAINS.COMMUNICATION,
        title: 'حزمة AAC عاجلة + تدريب مكثف للمحيطين (أولوية حرجة)',
        specific:
          'تأسيس نظام AAC مرتبط بمستوى MACS خلال 30 يوماً + تدريب 3 من المحيطين على فك الشيفرة',
        measurable: 'عدد الرسائل التعبيرية الناجحة يومياً + اختبار قبل/بعد للأسرة',
        achievable: 'مع تنسيق متعدد التخصصات (SLP + OT + أسرة)',
        relevant: 'حالة GMFCS-4/5 مع CFCS-4/5 تعني عزلاً تواصلياً كاملاً بدون تدخل',
        timeBoundDays: 30,
        domainLabel_ar: 'تواصل بديل عاجل',
      },
      {
        domain: DOMAINS.SELF_CARE,
        title: 'تقييم وضعية + كرسي متحرك متخصص',
        specific: 'إنجاز تقييم seating clinic + توصية بكرسي متحرك مخصص ومقاعد دعم خلال 60 يوماً',
        measurable: 'تاريخ موعد العيادة + توصية مكتوبة + توقيع متعدد التخصصات',
        achievable: 'موعد متاح في عيادة الكراسي المتحركة المتخصصة',
        relevant: 'الوضعية الصحيحة شرط لسلامة الجلد + استخدام AAC + جودة الحياة',
        timeBoundDays: 60,
        domainLabel_ar: 'وضعية وكرسي متحرك',
      },
    ],
  },

  // ─── R2: Early intensive intervention for autism + delay ───
  {
    id: 'R2_EARLY_INTENSIVE_AUTISM',
    label_ar: 'تدخل مبكر مكثف: توحد + تأخر تكيفي + عمر <6',
    severity: 'CRITICAL',
    when: interps => {
      const scq = findOk(interps, 'SCQ');
      const cars = findOk(interps, 'CARS2');
      const vine = findOk(interps, 'Vineland3');
      const autismFlag =
        (scq && scq.tier === 'above_cutoff') ||
        (cars && (cars.tier === 'severe' || cars.tier === 'mild_moderate'));
      const lowVineland = vine && (vine.tier === 'very_low' || vine.tier === 'low');
      return autismFlag && lowVineland;
    },
    goals: [
      {
        domain: DOMAINS.BEHAVIOR,
        title: 'برنامج ABA مكثف 25-40 ساعة/أسبوع — نافذة التدخل المبكر',
        specific: 'بدء برنامج ABA مكثف ≥25 ساعة/أسبوع خلال 21 يوماً، مع مراجعة شهرية للهدف',
        measurable: 'ساعات الجلسات الفعلية/الأسبوع + معدل اكتساب المهارات',
        achievable: 'مع توفر BCBA معتمد وغرفة جلسات مخصصة',
        relevant: 'نافذة المرونة العصبية في عمر <6 — تأخير شهر = خسارة مكاسب طويلة المدى',
        timeBoundDays: 21,
        domainLabel_ar: 'تدخل مبكر مكثف',
      },
      {
        domain: DOMAINS.ADAPTIVE,
        title: 'تدريب الأسرة على استراتيجيات NET/DTT اليومية',
        specific: 'تدريب الوالدين على 5 استراتيجيات يومية لتعميم مكاسب ABA في المنزل',
        measurable: 'اختبار قبل/بعد + سجل تطبيق منزلي أسبوعي',
        achievable: 'مع دعم BCBA أسبوعي',
        relevant: 'تعميم البيئة شرط لانتقال المكاسب من العيادة للحياة',
        timeBoundDays: 60,
        domainLabel_ar: 'تدريب أسرة',
      },
    ],
  },

  // ─── R3: Manual + communication double-impairment in CP ────
  {
    id: 'R3_MACS_CFCS_DUAL',
    label_ar: 'إعاقة يدوية + تواصلية في الشلل الدماغي (≥3 في الاثنين)',
    severity: 'HIGH',
    when: interps => {
      const macs = tierNum(findOk(interps, 'MACS'));
      const cfcs = tierNum(findOk(interps, 'CFCS'));
      return macs !== null && cfcs !== null && macs >= 3 && cfcs >= 3;
    },
    goals: [
      {
        domain: DOMAINS.COMMUNICATION,
        title: 'تقييم تشغيل AAC بنظام eye-gaze أو مفتاح بدلاً من اللمس',
        specific: 'تقييم 3 طرق تشغيل بديلة للـ AAC (نظرة عين / مفتاح رأس / لمسة كف) واختيار الأنسب',
        measurable: 'دقة الاختيار في 20 محاولة لكل طريقة',
        achievable: 'مع توفر معدات AAC متخصصة',
        relevant: 'MACS≥3 يصعّب لمس الشاشة الأمامي → AAC العادي لن يعمل',
        timeBoundDays: 45,
        domainLabel_ar: 'AAC بطرق بديلة',
      },
    ],
  },

  // ─── R4: Adult independence + caregiver strain ─────────────
  {
    id: 'R4_FIM_MOD_CSI_HIGH',
    label_ar: 'مستفيد بالغ معتمد + مقدم رعاية مُجهَد',
    severity: 'HIGH',
    when: interps => {
      const fim = findOk(interps, 'FIM');
      const csi = findOk(interps, 'CSI');
      const fimNeedsHelp = fim && ['severe', 'moderate'].includes(fim.tier);
      const csiHigh = csi && csi.tier === 'high';
      return fimNeedsHelp && csiHigh;
    },
    goals: [
      {
        domain: DOMAINS.ADAPTIVE,
        title: 'خدمة استراحة + مجموعة دعم لمقدم الرعاية (أولوية أسبوعية)',
        specific:
          'حجز ساعات استراحة (respite care) 4 ساعات/أسبوع + ضم مقدم الرعاية لمجموعة دعم أقران شهرية',
        measurable: 'ساعات الاستراحة المسجلة + حضور جلسات المجموعة',
        achievable: 'مع توفر برنامج استراحة معتمد ومجموعة دعم نشطة',
        relevant: 'CSI عالٍ يهدد استمرارية الرعاية للمستفيد المعتمد — يجب التدخل قبل الانهيار',
        timeBoundDays: 14,
        domainLabel_ar: 'دعم مقدم الرعاية',
      },
    ],
  },

  // ─── R5: Fall risk + adult cognitive/communication impairment ─
  {
    id: 'R5_BERG_HIGH_COGNITIVE',
    label_ar: 'خطر سقوط عالٍ مع ضعف معرفي/تواصلي',
    severity: 'HIGH',
    when: interps => {
      const berg = findOk(interps, 'BergBalance');
      const cfcs = tierNum(findOk(interps, 'CFCS'));
      const bergHigh = berg && berg.tier === 'high_fall_risk';
      const cfcsBad = cfcs !== null && cfcs >= 3;
      return bergHigh && cfcsBad;
    },
    goals: [
      {
        domain: DOMAINS.MOTOR,
        title: 'بيئة آمنة + جرس استدعاء بصري للسقوط',
        specific: 'تركيب نظام تنبيه بصري/اهتزازي (لا يعتمد على نداء صوتي) + إزالة 5 عوائق سقوط',
        measurable: 'قائمة فحص مكتملة + اختبار النظام أسبوعياً',
        achievable: 'مع توفر معدات تنبيه + فني تركيب',
        relevant: 'خطر سقوط عالٍ + تواصل ضعيف = المستفيد قد لا يستطيع طلب مساعدة بعد السقوط',
        timeBoundDays: 30,
        domainLabel_ar: 'سلامة منزلية مع تواصل بديل',
      },
    ],
  },
]);

/**
 * Apply all rules against an interpretations list.
 * Returns the matched rules' goals (flat) + metadata about which rules fired.
 */
function applyCombinationRules(interpretations) {
  const matched = [];
  const allGoals = [];
  for (const rule of RULES) {
    let fires = false;
    try {
      fires = rule.when(interpretations);
    } catch {
      // Predicate threw — treat as no-match (don't poison the bundle)
      fires = false;
    }
    if (!fires) continue;
    matched.push({
      ruleId: rule.id,
      label_ar: rule.label_ar,
      severity: rule.severity,
      goalCount: rule.goals.length,
    });
    for (const g of rule.goals) {
      allGoals.push({
        ...g,
        baseline: rule.label_ar,
        confidence: rule.severity === 'CRITICAL' ? 'high' : 'high',
        combinationRule: rule.id,
        evidence: (interpretations || [])
          .filter(i => i && i.ok)
          .map(i => ({
            measureKey: i.measureKey,
            tier: i.tier,
            tierLabel_ar: i.tierLabel_ar,
            score: i.score,
          })),
      });
    }
  }
  return { matchedRules: matched, goals: allGoals };
}

module.exports = {
  applyCombinationRules,
  RULES,
};
