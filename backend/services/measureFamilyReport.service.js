'use strict';

/**
 * measureFamilyReport.service.js — Wave 240
 *
 * Generates the family-friendly Arabic report from the W229
 * aggregateBeneficiary output. Closes the "أسرة المستفيد تريد معرفة:
 * هل تحسّن طفلي؟" gap from the original Outcomes architecture brief
 * (block 14: Clinical & Family-friendly Reporting).
 *
 * Design rules (from the architecture doc):
 *   - NO clinical jargon. "GMFCS-3" never appears; "يستطيع المشي مع
 *     أدوات مساعدة" does.
 *   - NO statistical concepts. Don't say "p<0.05" or "CI95".
 *   - Use ✓ / → / ⚠ icons + 3 color states (green/amber/red).
 *   - Per-measure: "كان X · الآن Y · الهدف Z" + one-line verdict.
 *   - Overall: one paragraph capturing the headline.
 *   - Single page A4, signed off.
 *
 * Composition:
 *   - Resolves familyFriendlyLabel_ar from W210 Measure.reporting
 *     when available; falls back to name_ar (catalog) → "هذا المقياس".
 *   - Translates W219 trend classifications + W221 alert types into
 *     family-readable verdicts.
 *   - MCID achievement → "حقّق طفلك الهدف السريري الأدنى"
 *     literature_pending → no claim ("التقدّم في تحسّن مستمر")
 *
 * No DB writes. Pure orchestration above W229 + W210 lookups.
 */

const mongoose = require('mongoose');

const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  Beneficiary: () => {
    try {
      return mongoose.model('Beneficiary');
    } catch {
      return null;
    }
  },
};

// ─── Pure translation tables ────────────────────────────────────────

/**
 * Trend classification → family-friendly Arabic phrasing.
 * Stable codes from W219 measures/trend/classify.js.
 */
const TREND_LABELS_AR = Object.freeze({
  insufficient_data: {
    label: 'نحتاج المزيد من الجلسات لإصدار حكم واضح',
    icon: '→',
    color: 'gray',
  },
  linear_improvement: {
    label: 'تحسّن مستمر وواضح',
    icon: '✓',
    color: 'green',
  },
  slow_improvement: {
    label: 'تحسّن تدريجي مع بعض التذبذب',
    icon: '✓',
    color: 'green',
  },
  plateau: {
    label: 'ثبات في الأداء — يحتاج تعديل في خطة العلاج',
    icon: '→',
    color: 'amber',
  },
  regression: {
    label: 'تراجع ملحوظ — يستوجب مراجعة فورية مع الفريق',
    icon: '⚠',
    color: 'red',
  },
  oscillation: {
    label: 'تذبذب في القياسات — سنتحقق من ثبات التطبيق',
    icon: '→',
    color: 'amber',
  },
});

/**
 * Overall status → headline + traffic-light.
 */
const OVERALL_HEADLINES_AR = Object.freeze({
  progressing: {
    headline: 'طفلك يحقّق تقدّماً ملموساً في الأهداف العلاجية',
    color: 'green',
    icon: '✓',
  },
  mixed: {
    headline: 'يحقّق طفلك بعض التقدّم، مع نقاط تحتاج متابعة',
    color: 'amber',
    icon: '→',
  },
  concerning: {
    headline: 'لاحظنا مؤشرات تستدعي مراجعة عاجلة لخطة العلاج',
    color: 'red',
    icon: '⚠',
  },
  insufficient: {
    headline: 'لم نُجرِ بعد ما يكفي من القياسات لإصدار تقرير. سنشاركك التحديث في الزيارة القادمة',
    color: 'gray',
    icon: '→',
  },
});

/**
 * Alert type → family-friendly explanation paragraph (one each, not
 * compounding). Only surfaced when count > 0.
 */
const ALERT_PARAGRAPHS_AR = Object.freeze({
  REGRESSION_DETECTED:
    'لاحظ الفريق تراجعاً في نتائج بعض المقاييس. سنناقش معك في الموعد القادم خطة مراجعة العلاج وأي تعديلات ضرورية.',
  PLATEAU_DETECTED:
    'وصل طفلك إلى مرحلة ثبات في إحدى المهارات. سنُعدّل أساليب التدريب لتحفيز خطوة تقدّم جديدة.',
  MCID_NOT_MET:
    'رغم انتظام الجلسات، لم يصل التحسّن بعد إلى الحد الذي نعتبره ذا أثر ملموس على حياة طفلك اليومية. سنراجع طريقة العلاج معك.',
});

// ─── Helpers ────────────────────────────────────────────────────────

function _formatScore(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return Math.round(n * 10) / 10;
}

function _verdictForMeasureRow(row) {
  // Composite signal: MCID achievement trumps trend; trend handles
  // the no-MCID case. INSUFFICIENT_DATA when trend is null.
  if (!row) {
    return { label: 'بيانات غير كافية', icon: '→', color: 'gray' };
  }
  if (row.mcidAchieved === true) {
    return {
      label: 'حقّق طفلك الحد الأدنى للتحسّن السريري — إنجاز ملموس',
      icon: '✓',
      color: 'green',
    };
  }
  const trendKey = row.trend || 'insufficient_data';
  return TREND_LABELS_AR[trendKey] || TREND_LABELS_AR.insufficient_data;
}

function _fallbackMeasureName(measureMeta, row) {
  if (measureMeta?.reporting?.familyFriendlyLabel_ar) {
    return measureMeta.reporting.familyFriendlyLabel_ar;
  }
  if (measureMeta?.name_ar) return measureMeta.name_ar;
  if (row?.measureName_ar) return row.measureName_ar;
  if (measureMeta?.name) return measureMeta.name;
  return 'هذا المقياس';
}

/**
 * Pull the {familyFriendlyLabel_ar, showInFamilyReport} hint for each
 * measure in the rollup. Reads `reporting` + `name_ar` from W210.
 */
async function _hydrateMeasureMeta(measureIds) {
  const Measure = M.Measure();
  if (!Measure || !measureIds.length) return new Map();
  const docs = await Measure.find({ _id: { $in: measureIds } })
    .select('name name_ar code reporting')
    .lean()
    .catch(() => []);
  return new Map(docs.map(d => [String(d._id), d]));
}

// ─── Service ────────────────────────────────────────────────────────

class MeasureFamilyReportSvc {
  /**
   * Generate the report for a beneficiary.
   *
   * @param {string|ObjectId} beneficiaryId
   * @param {Object} [opts]
   * @param {boolean} [opts.includeHiddenMeasures=false]
   *   By default, measures whose `reporting.showInFamilyReport` is
   *   explicitly false are dropped. Setting this true keeps them.
   * @returns {Promise<Object>} structured report
   */
  async generate(beneficiaryId, opts = {}) {
    const aggregator = require('./measureOutcomesAggregator.service');
    const rollup = await aggregator.aggregateBeneficiary(beneficiaryId);

    if (rollup.error === 'models_unavailable') {
      return {
        error: 'models_unavailable',
        beneficiaryId: String(beneficiaryId),
      };
    }

    const headline =
      OVERALL_HEADLINES_AR[rollup.overallStatus] || OVERALL_HEADLINES_AR.insufficient;

    // Empty rollup short-circuits.
    if (!rollup.measures || rollup.measures.length === 0) {
      return {
        beneficiaryId: rollup.beneficiaryId,
        generatedAt: new Date(),
        reportLanguage: 'ar',
        overallStatus: rollup.overallStatus,
        headline: headline.headline,
        headlineColor: headline.color,
        headlineIcon: headline.icon,
        measures: [],
        alertParagraphs: [],
        narrative: this._composeNarrative({
          headline,
          measureRows: [],
          alertsByType: rollup.alerts?.byType || {},
          goals: rollup.goals,
        }),
        signOff: this._composeSignOff(),
      };
    }

    // Resolve measure metadata in one batch round-trip.
    const measureIds = rollup.measures.map(m => m.measureId).filter(Boolean);
    const metaById = await _hydrateMeasureMeta(measureIds);

    // Build per-measure rows.
    const measureRows = rollup.measures
      .map(row => {
        const meta = metaById.get(String(row.measureId)) || {};
        const hidden = meta?.reporting?.showInFamilyReport === false;
        if (hidden && !opts.includeHiddenMeasures) return null;
        const verdict = _verdictForMeasureRow(row);
        return {
          measureCode: row.measureCode,
          name_ar: _fallbackMeasureName(meta, row),
          baselineScore: _formatScore(row.baselineScore),
          latestScore: _formatScore(row.latestScore),
          deltaFromBaseline: _formatScore(row.deltaFromBaseline),
          mcidAchieved: row.mcidAchieved === true,
          verdict_ar: verdict.label,
          verdictIcon: verdict.icon,
          verdictColor: verdict.color,
          // We deliberately do NOT include trend classification, slope,
          // r2, MCID values, or confidence in the family payload.
        };
      })
      .filter(Boolean);

    // Build alert paragraphs (one per type that fired).
    const alertParagraphs = Object.entries(rollup.alerts?.byType || {})
      .filter(([type, count]) => count > 0 && ALERT_PARAGRAPHS_AR[type])
      .map(([type]) => ({
        alertType: type,
        text_ar: ALERT_PARAGRAPHS_AR[type],
      }));

    const narrative = this._composeNarrative({
      headline,
      measureRows,
      alertsByType: rollup.alerts?.byType || {},
      goals: rollup.goals,
    });

    return {
      beneficiaryId: rollup.beneficiaryId,
      generatedAt: new Date(),
      reportLanguage: 'ar',
      overallStatus: rollup.overallStatus,
      headline: headline.headline,
      headlineColor: headline.color,
      headlineIcon: headline.icon,
      measures: measureRows,
      alertParagraphs,
      goals: {
        achieved: rollup.goals?.achieved || 0,
        active: rollup.goals?.active || 0,
        total: rollup.goals?.total || 0,
      },
      narrative,
      signOff: this._composeSignOff(),
    };
  }

  /**
   * One-paragraph narrative summary. Used as the report's opening
   * statement; downstream PDF/print can substitute their own template.
   */
  _composeNarrative({ headline, measureRows, alertsByType, goals }) {
    const parts = [headline.headline + '.'];

    if (measureRows.length > 0) {
      const improvements = measureRows.filter(r => r.verdictColor === 'green').length;
      const concerns = measureRows.filter(r => r.verdictColor === 'red').length;
      if (improvements > 0 && concerns === 0) {
        parts.push(
          `أظهرت نتائج ${improvements} مقياس${improvements > 1 ? '' : ''} تقدّماً واضحاً منذ البداية.`
        );
      } else if (improvements > 0 && concerns > 0) {
        parts.push(
          `لاحظنا تحسّناً في ${improvements} جانب${improvements > 1 ? '' : ''}، مع ${concerns} ` +
            `نقطة تحتاج مراجعة عاجلة.`
        );
      } else if (concerns > 0) {
        parts.push(`${concerns} من المقاييس تظهر تراجعاً يستدعي مراجعة سريعة لخطة العلاج.`);
      }
    }

    if (goals && goals.achieved > 0) {
      parts.push(
        `حقّق طفلك ${goals.achieved} ${goals.achieved === 1 ? 'هدفاً علاجياً' : 'أهداف علاجية'} بشكل كامل.`
      );
    }

    // First alert paragraph (we keep narrative focused; the dedicated
    // alertParagraphs field carries the full text per type).
    const firedAlertType = Object.keys(alertsByType || {}).find(
      t => alertsByType[t] > 0 && ALERT_PARAGRAPHS_AR[t]
    );
    if (firedAlertType) {
      parts.push('سنُناقش معك في الموعد القادم خطوات التحسين المقترحة.');
    }

    return parts.join(' ');
  }

  _composeSignOff() {
    return {
      requiresSignature: true,
      label_ar: 'يُرجى التوقيع على هذا التقرير عند الاستلام. للاستفسارات تواصل مع الفريق العلاجي.',
      signatureFields: [
        { role_ar: 'ولي الأمر', signedName: null, signedAt: null },
        { role_ar: 'المعالج المختص', signedName: null, signedAt: null },
      ],
    };
  }

  // ─── Pure helpers exposed for tests ───────────────────────────────
  _formatScore(n) {
    return _formatScore(n);
  }
  _verdictForMeasureRow(row) {
    return _verdictForMeasureRow(row);
  }
  _fallbackMeasureName(meta, row) {
    return _fallbackMeasureName(meta, row);
  }
}

const svc = new MeasureFamilyReportSvc();
module.exports = svc;
module.exports.TREND_LABELS_AR = TREND_LABELS_AR;
module.exports.OVERALL_HEADLINES_AR = OVERALL_HEADLINES_AR;
module.exports.ALERT_PARAGRAPHS_AR = ALERT_PARAGRAPHS_AR;

void mongoose;
