'use strict';

/**
 * measureMinistryReport.service.js — Wave 242
 *
 * Generates the monthly MOHRSD (Ministry of Human Resources and Social
 * Development) outcome report for a single branch. The OPPOSITE of the
 * W240 family report: jargon allowed, every measure with a
 * `reporting.ministryReportField` mapping gets surfaced, signoff
 * targets the branch manager + clinical director.
 *
 * Architecture-doc references:
 *   block 14 (Clinical & Family-friendly Reporting → "Ministry Report")
 *   block 15 (Quality / Compliance / Completeness Rules)
 *
 * Closes the gap between the W229 branch rollup numbers and a
 * defensible monthly submission packet. NOT a CBAHI document
 * (CBAHI lives in the older W187b ministry-report aggregator); this
 * is the rehabilitation-outcomes-specific monthly that didn't exist
 * before the W229+W240+W221 stack made it possible.
 *
 * Public API:
 *   generate(branchId, {year, month}) → structured monthly report
 *   generateCsv(branchId, {year, month}) → Excel-compatible CSV string
 *                                          (BOM-prefixed UTF-8)
 *
 * Calls W229 aggregateBranch for top-level numbers, then adds:
 *   - Per-measure rollup keyed by ministryReportField (W210)
 *   - Period framing (year/month/monthName_ar/from/to)
 *   - Branch name hydration (best-effort)
 *   - Signoff block (manager + clinical director)
 *
 * Read-only. No DB writes.
 */

const mongoose = require('mongoose');
const { escapeFormulaInjection } = require('./importExport/format-helpers');

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
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
  Branch: () => {
    try {
      return mongoose.model('Branch');
    } catch {
      return null;
    }
  },
};

// ─── Constants ─────────────────────────────────────────────────────

const MONTH_NAMES_AR = Object.freeze([
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]);

const REPORT_TYPE = 'MOHRSD_MONTHLY';
const REPORT_VERSION = '1.0.0';

// ─── Pure helpers ──────────────────────────────────────────────────

function _validatePeriod({ year, month }) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error('ministry-report: year must be integer 2000-2100');
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error('ministry-report: month must be integer 1-12');
  }
  return { year: y, month: m };
}

function _periodBounds(year, month) {
  // month is 1-12, JS Date months are 0-11
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - 1); // last ms of month
  return { from, to };
}

function _csvEscape(value) {
  if (value == null) return '';
  // Defang formula triggers (`=`/`+`/`-`/`@`/TAB/CR) BEFORE the CSV
  // grammar pass — W423 doctrine. The Excel formula parser runs on the
  // unquoted prefix of each cell, so the leading `'` must be the very
  // first byte the user-supplied string contributes.
  const s = escapeFormulaInjection(String(value));
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function _csvRow(values) {
  return values.map(_csvEscape).join(',');
}

// ─── Per-measure rollup ────────────────────────────────────────────

/**
 * Build the per-measure ministry rollup for the period. Only measures
 * with `reporting.ministryReportField` set are included — that's how
 * the catalog opts in to ministry submission.
 *
 * Each row: pairsAnalysed (≥3 admins in window), mcidAchievedCount,
 * averageDelta (direction-aware, in raw score units).
 */
async function _perMeasureMinistryRollup(branchObjectId, from, to) {
  const Measure = M.Measure();
  const MeasureApplication = M.MeasureApplication();
  if (!Measure || !MeasureApplication) return [];

  // Find measures that have a ministry field declared. Two $ne entries
  // would be a duplicate-key bug; combine via $nin instead.
  const ministryMeasures = await Measure.find({
    'reporting.ministryReportField': { $exists: true, $nin: [null, ''] },
  })
    .select('_id code name name_ar scoringDirection reporting interpretation.mcid')
    .lean()
    .catch(() => []);

  if (ministryMeasures.length === 0) return [];

  const measureIds = ministryMeasures.map(m => m._id);

  // Aggregate admin pairs per (beneficiary, measure) in the window.
  const pairs = await MeasureApplication.aggregate([
    {
      $match: {
        branchId: branchObjectId,
        measureId: { $in: measureIds },
        status: { $in: ['completed', 'locked'] },
        applicationDate: { $gte: from, $lte: to },
      },
    },
    { $sort: { applicationDate: 1 } },
    {
      $group: {
        _id: { beneficiaryId: '$beneficiaryId', measureId: '$measureId' },
        admins: { $sum: 1 },
        first: { $first: '$$ROOT' },
        last: { $last: '$$ROOT' },
      },
    },
  ]).catch(() => []);

  // Group by measureId.
  const byMeasure = new Map();
  for (const p of pairs) {
    const key = String(p._id.measureId);
    if (!byMeasure.has(key)) byMeasure.set(key, []);
    byMeasure.get(key).push(p);
  }

  const rows = [];
  for (const measure of ministryMeasures) {
    const measureId = String(measure._id);
    const list = byMeasure.get(measureId) || [];
    const rich = list.filter(p => p.admins >= 3);
    const direction = measure.scoringDirection === 'lower_better' ? -1 : 1;

    let mcidAchieved = 0;
    let totalDelta = 0;
    let countDelta = 0;
    for (const p of rich) {
      const mcidVal = p.last?.mcidAtAdministration?.value;
      const mcidStatus = p.last?.mcidAtAdministration?.status;
      const delta = (p.last.totalRawScore - p.first.totalRawScore) * direction;
      if (Number.isFinite(delta)) {
        totalDelta += delta;
        countDelta++;
      }
      if (
        Number.isFinite(mcidVal) &&
        mcidVal > 0 &&
        (mcidStatus === 'established' || mcidStatus === 'provisional') &&
        delta >= mcidVal
      ) {
        mcidAchieved++;
      }
    }

    rows.push({
      measureCode: measure.code,
      measureName_ar: measure.name_ar || measure.name,
      ministryReportField: measure.reporting.ministryReportField,
      pairsAnalysed: rich.length,
      pairsThinHistory: list.length - rich.length,
      mcidAchievedCount: mcidAchieved,
      mcidAchievementRate: rich.length ? Math.round((mcidAchieved / rich.length) * 1000) / 1000 : 0,
      averageDelta: countDelta ? Math.round((totalDelta / countDelta) * 100) / 100 : null,
    });
  }
  return rows.sort((a, b) => a.ministryReportField.localeCompare(b.ministryReportField));
}

// ─── Service ───────────────────────────────────────────────────────

class MeasureMinistryReportSvc {
  /**
   * Generate the structured monthly report.
   */
  async generate(branchId, period = {}) {
    const { year, month } = _validatePeriod(period);
    const { from, to } = _periodBounds(year, month);

    const branchObjectId = mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId;

    // W229 aggregateBranch carries the top-level numbers.
    const aggregator = require('./measureOutcomesAggregator.service');
    const rollup = await aggregator.aggregateBranch(branchId, { from, to });
    if (rollup.error === 'models_unavailable') {
      return {
        error: 'models_unavailable',
        branchId: String(branchObjectId),
        period: { year, month },
      };
    }

    // Branch name (best-effort — not every deployment has a Branch model).
    const Branch = M.Branch();
    let branchName_ar = null;
    let branchName = null;
    if (Branch) {
      try {
        const b = await Branch.findById(branchObjectId).select('name name_ar').lean();
        if (b) {
          branchName = b.name || null;
          branchName_ar = b.name_ar || null;
        }
      } catch (_e) {
        /* swallow — best-effort */
      }
    }

    // Per-measure ministry rollup.
    const perMeasure = await _perMeasureMinistryRollup(branchObjectId, from, to);

    // Administrations volume — direct count, also broken down by purpose.
    const MeasureApplication = M.MeasureApplication();
    let byPurpose = [];
    if (MeasureApplication) {
      byPurpose = await MeasureApplication.aggregate([
        {
          $match: {
            branchId: branchObjectId,
            status: { $in: ['completed', 'locked'] },
            applicationDate: { $gte: from, $lte: to },
          },
        },
        { $group: { _id: '$purpose', count: { $sum: 1 } } },
      ]).catch(() => []);
    }
    const byPurposeMap = {};
    for (const p of byPurpose) byPurposeMap[p._id || 'unknown'] = p.count;

    return {
      reportType: REPORT_TYPE,
      reportVersion: REPORT_VERSION,
      generatedAt: new Date(),
      reportLanguage: 'ar',
      branchId: String(branchObjectId),
      branchName,
      branchName_ar,
      period: {
        year,
        month,
        monthName_ar: MONTH_NAMES_AR[month - 1],
        from,
        to,
      },
      beneficiaries: {
        administeredInMonth: rollup.beneficiariesWithAdmin || 0,
      },
      administrations: {
        total: rollup.administrationsTotal || 0,
        byPurpose: byPurposeMap,
      },
      outcomes: {
        pairsAnalysed: rollup.pairsAnalysed || 0,
        pairsThinHistory: rollup.pairsThinHistory || 0,
        mcidAchievedCount: rollup.mcidAchievedCount || 0,
        mcidAchievementRate: rollup.mcidAchievementRate || 0,
      },
      goals: rollup.goals || { total: 0, active: 0, achieved: 0, achievedRate: 0 },
      alerts: rollup.alerts || { total: 0, regression: 0, plateau: 0, mcidNotMet: 0 },
      perMeasureMinistryRollup: perMeasure,
      signOff: {
        requiresSignature: true,
        signatureFields: [
          { role_ar: 'مدير الفرع', signedName: null, signedAt: null },
          { role_ar: 'المدير الإكلينيكي', signedName: null, signedAt: null },
        ],
        note_ar: 'يُقدَّم هذا التقرير شهريًا لوزارة الموارد البشرية والتنمية الاجتماعية',
      },
    };
  }

  /**
   * CSV variant — Excel-compatible (UTF-8 BOM-prefixed). Single sheet:
   * one row per measure in perMeasureMinistryRollup + summary rows.
   *
   * Caller (route handler) is expected to set:
   *   Content-Type: text/csv; charset=utf-8
   *   Content-Disposition: attachment; filename=...
   */
  async generateCsv(branchId, period = {}) {
    const report = await this.generate(branchId, period);
    if (report.error) return null;

    const BOM = '﻿';
    const lines = [];

    // Header section.
    lines.push(
      _csvRow([
        'تقرير شهري للوزارة',
        `${report.period.year}-${String(report.period.month).padStart(2, '0')}`,
      ])
    );
    lines.push(_csvRow(['الفرع', report.branchName_ar || report.branchName || report.branchId]));
    lines.push(_csvRow(['الفترة', `${report.period.monthName_ar} ${report.period.year}`]));
    lines.push(_csvRow(['تاريخ الإصدار', report.generatedAt.toISOString().slice(0, 10)]));
    lines.push('');

    // Summary block.
    lines.push(_csvRow(['ملخّص']));
    lines.push(
      _csvRow(['المستفيدون الذين أجريت لهم قياسات', report.beneficiaries.administeredInMonth])
    );
    lines.push(_csvRow(['إجمالي القياسات', report.administrations.total]));
    lines.push(_csvRow(['أزواج تم تحليلها', report.outcomes.pairsAnalysed]));
    lines.push(_csvRow(['أزواج بسجل قصير', report.outcomes.pairsThinHistory]));
    lines.push(_csvRow(['تحقّق الحد الأدنى السريري (عدد)', report.outcomes.mcidAchievedCount]));
    lines.push(_csvRow(['نسبة تحقّق الحد الأدنى السريري', report.outcomes.mcidAchievementRate]));
    lines.push(_csvRow(['أهداف محقّقة', report.goals.achieved]));
    lines.push(_csvRow(['نسبة تحقّق الأهداف', report.goals.achievedRate]));
    lines.push(_csvRow(['تنبيهات تراجع مفتوحة', report.alerts.regression]));
    lines.push(_csvRow(['تنبيهات ثبات مفتوحة', report.alerts.plateau]));
    lines.push('');

    // Per-measure rollup (the table the ministry actually consumes).
    lines.push(
      _csvRow([
        'حقل الوزارة',
        'رمز المقياس',
        'اسم المقياس',
        'أزواج تم تحليلها',
        'أزواج بسجل قصير',
        'تحقّق الحد الأدنى (عدد)',
        'نسبة التحقّق',
        'متوسط التغيّر',
      ])
    );
    for (const m of report.perMeasureMinistryRollup) {
      lines.push(
        _csvRow([
          m.ministryReportField,
          m.measureCode,
          m.measureName_ar,
          m.pairsAnalysed,
          m.pairsThinHistory,
          m.mcidAchievedCount,
          m.mcidAchievementRate,
          m.averageDelta != null ? m.averageDelta : '',
        ])
      );
    }

    return BOM + lines.join('\n');
  }

  // ─── Pure helpers exposed for tests ───────────────────────────────
  _validatePeriod(p) {
    return _validatePeriod(p);
  }
  _periodBounds(y, m) {
    return _periodBounds(y, m);
  }
  _csvEscape(v) {
    return _csvEscape(v);
  }
}

const svc = new MeasureMinistryReportSvc();
module.exports = svc;
module.exports.MONTH_NAMES_AR = MONTH_NAMES_AR;
module.exports.REPORT_TYPE = REPORT_TYPE;
module.exports.REPORT_VERSION = REPORT_VERSION;
