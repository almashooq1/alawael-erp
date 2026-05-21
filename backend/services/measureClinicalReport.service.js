'use strict';

/**
 * measureClinicalReport.service.js — Wave 245
 *
 * The third audience layer of the Outcomes reporting trilogy:
 *   - W240 family    — no jargon, traffic-light per measure
 *   - W242 ministry  — branch-level monthly aggregate, jargon allowed
 *   - W245 clinical  — beneficiary-level deep dive, ALL statistical
 *                      detail exposed (physician / insurance audience)
 *
 * Where the family report HIDES the trend slope, MCID numbers, and
 * confidence intervals, the clinical report SURFACES them all. This is
 * the document that lands in the medical record + insurance claim
 * packet — every number must be traceable and every claim must cite
 * its frozen W211b snapshot.
 *
 * Composition (orchestration over):
 *   - W229 aggregateBeneficiary (cross-measure latest + rollup)
 *   - W219 measureTrendEngine.analyze() (per-measure slope+CI+R²)
 *   - W211b MeasureApplication (full admin history, version-pinned)
 *   - W210 Measure.interpretation.mcid + .sdc (frozen sources)
 *   - W221 MeasureAlert (full evidence — message_ar + snapshot data)
 *   - W216 TherapeuticGoal (status, currentProgress, history)
 *
 * Output shape:
 *   {
 *     reportType: 'CLINICAL_DEEP_DIVE',
 *     reportVersion: '1.0.0',
 *     beneficiaryId, generatedAt,
 *     reportLanguage: 'ar',  // primary; English citations OK inline
 *     measures: [{
 *       measureCode, measureName_ar, measureName_en, scoringDirection,
 *       adminCount, baselineScore, baselineDate, latestScore, latestDate,
 *       deltaFromBaseline,
 *       mcid: {value, type, status, source},      // FROZEN snapshot
 *       sdc:  {value, ci, source},                // FROZEN snapshot
 *       mcidAchieved: boolean,
 *       trend: {
 *         classification, slopePerMonth, ci95PerMonth, r2, confidence,
 *         spanDays, n
 *       },
 *       adminHistory: [{                          // full audit trail
 *         applicationId, applicationDate, totalRawScore, purpose,
 *         status, isBaseline, scoredWithMeasureVersion,
 *         scoredWithAlgorithmVersion,
 *         correctionOf?,                          // when superseded
 *       }]
 *     }],
 *     alerts: [{                                  // FULL evidence
 *       alertId, alertType, severity, status,
 *       firstSeenAt, evidence (full),
 *       resolvedAt?, resolutionMode?,
 *     }],
 *     goals: [{                                   // detail, not counts
 *       goalId, title, status, currentProgress,
 *       baseline, target, lastProgressEntry,
 *     }],
 *     summary: {
 *       overallStatus,                            // W229 traffic-light
 *       totalAdmins, distinctMeasures,
 *       alertsOpen, goalsAchieved,
 *     },
 *     citations: [                                // every measure's MCID source
 *       {measureCode, mcidSource, sdcSource?},
 *     ],
 *     signOff: { ... },                          // assessor + clinical director slots
 *   }
 *
 * No DB writes. No PDF rendering (separate concern). Pure JSON
 * suitable for a downstream PDF layer or rich UI.
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
  MeasureAlert: () => {
    try {
      return mongoose.model('MeasureAlert');
    } catch {
      try {
        require('../domains/goals/models/MeasureAlert');
        return mongoose.model('MeasureAlert');
      } catch {
        return null;
      }
    }
  },
  TherapeuticGoal: () => {
    try {
      return mongoose.model('TherapeuticGoal');
    } catch {
      try {
        require('../domains/goals/models/TherapeuticGoal');
        return mongoose.model('TherapeuticGoal');
      } catch {
        return null;
      }
    }
  },
};

const REPORT_TYPE = 'CLINICAL_DEEP_DIVE';
const REPORT_VERSION = '1.0.0';

// ─── Pure helpers ──────────────────────────────────────────────────

function _round(n, places = 2) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/**
 * Direction-aware MCID achievement check. Reads frozen snapshot from
 * the latest admin (W211b convention). Returns null when MCID is
 * unset / literature_pending / not_applicable.
 */
function _evaluateMcidAchievement(admins, scoringDirection) {
  if (!Array.isArray(admins) || admins.length < 2) return null;
  const latest = admins[admins.length - 1];
  const baseline = admins[0];
  const mcid = latest?.mcidAtAdministration;
  if (!mcid || !Number.isFinite(mcid.value) || mcid.value <= 0) return null;
  if (mcid.status !== 'established' && mcid.status !== 'provisional') return null;
  const direction = scoringDirection === 'lower_better' ? -1 : 1;
  const delta = (latest.totalRawScore - baseline.totalRawScore) * direction;
  return delta >= mcid.value;
}

// ─── Service ───────────────────────────────────────────────────────

class MeasureClinicalReportSvc {
  /**
   * Generate the structured clinical report for a beneficiary.
   *
   * @param {string|ObjectId} beneficiaryId
   * @param {Object} [opts]
   * @param {boolean} [opts.includeCorrections=true]
   *   When true, the per-measure adminHistory includes records with
   *   status='corrected' (showing what was superseded). When false,
   *   only authoritative records are listed.
   * @returns {Promise<Object>} structured clinical report
   */
  async generate(beneficiaryId, opts = {}) {
    const Measure = M.Measure();
    const MeasureApplication = M.MeasureApplication();
    const MeasureAlert = M.MeasureAlert();
    const TherapeuticGoal = M.TherapeuticGoal();
    if (!Measure || !MeasureApplication) {
      return { error: 'models_unavailable', beneficiaryId: String(beneficiaryId) };
    }

    const includeCorrections = opts.includeCorrections !== false;
    const benObjectId = mongoose.Types.ObjectId.isValid(beneficiaryId)
      ? new mongoose.Types.ObjectId(beneficiaryId)
      : beneficiaryId;

    // ─── Use W229 aggregator for the cross-measure summary ──────
    const aggregator = require('./measureOutcomesAggregator.service');
    const rollup = await aggregator.aggregateBeneficiary(benObjectId);
    if (rollup.error === 'models_unavailable') {
      return { error: 'models_unavailable', beneficiaryId: String(benObjectId) };
    }

    // Empty short-circuit — return shell with empty measures.
    if (!rollup.measures || rollup.measures.length === 0) {
      return {
        reportType: REPORT_TYPE,
        reportVersion: REPORT_VERSION,
        beneficiaryId: rollup.beneficiaryId,
        generatedAt: new Date(),
        reportLanguage: 'ar',
        measures: [],
        alerts: [],
        goals: [],
        summary: {
          overallStatus: rollup.overallStatus,
          totalAdmins: 0,
          distinctMeasures: 0,
          alertsOpen: 0,
          goalsAchieved: 0,
        },
        citations: [],
        signOff: this._composeSignOff(),
      };
    }

    // ─── Pull all admin records per measure ───────────────────────
    const measureIds = rollup.measures.map(r => r.measureId).filter(Boolean);
    const adminFilter = {
      beneficiaryId: benObjectId,
      measureId: { $in: measureIds.map(id => new mongoose.Types.ObjectId(id)) },
    };
    if (!includeCorrections) {
      adminFilter.status = { $in: ['completed', 'locked'] };
    } else {
      adminFilter.status = { $in: ['completed', 'locked', 'corrected'] };
    }
    const allAdmins = await MeasureApplication.find(adminFilter)
      .sort({ applicationDate: 1 })
      .lean()
      .catch(() => []);

    const adminsByMeasure = new Map();
    for (const a of allAdmins) {
      const key = String(a.measureId);
      if (!adminsByMeasure.has(key)) adminsByMeasure.set(key, []);
      adminsByMeasure.get(key).push(a);
    }

    // ─── Hydrate measure metadata ────────────────────────────────
    const measures = await Measure.find({
      _id: { $in: measureIds.map(id => new mongoose.Types.ObjectId(id)) },
    })
      .select('code name name_ar scoringDirection interpretation')
      .lean();
    const measureById = new Map(measures.map(m => [String(m._id), m]));

    // ─── Per-measure trend via W219 ──────────────────────────────
    const trendEngine = require('./measureTrendEngine.service');

    const measureRows = [];
    const citations = [];
    let totalAdmins = 0;
    for (const rr of rollup.measures) {
      const measureId = String(rr.measureId);
      const m = measureById.get(measureId);
      if (!m) continue;
      const admins = adminsByMeasure.get(measureId) || [];
      const authoritativeAdmins = admins.filter(a => a.status !== 'corrected');
      totalAdmins += authoritativeAdmins.length;

      // Trend best-effort — never fatal.
      let trend = null;
      try {
        trend = await trendEngine.analyze(benObjectId, m);
      } catch (_e) {
        /* skip */
      }

      const mcidAchieved = _evaluateMcidAchievement(authoritativeAdmins, m.scoringDirection);

      // Cite MCID + SDC sources once per measure (only when we'll
      // make a claim on them).
      if (m.interpretation?.mcid?.source) {
        citations.push({
          measureCode: m.code,
          mcidSource: m.interpretation.mcid.source,
          sdcSource: m.interpretation.sdc?.source || null,
        });
      }

      measureRows.push({
        measureCode: m.code,
        measureName_ar: m.name_ar || m.name,
        measureName_en: m.name || null,
        scoringDirection: m.scoringDirection || 'higher_better',
        adminCount: authoritativeAdmins.length,
        baselineScore: rr.baselineScore,
        baselineDate: rr.baselineDate,
        latestScore: rr.latestScore,
        latestDate: rr.latestDate,
        deltaFromBaseline: rr.deltaFromBaseline,
        mcid: m.interpretation?.mcid
          ? {
              value: m.interpretation.mcid.value || null,
              type: m.interpretation.mcid.type || null,
              status: m.interpretation.mcid.status || null,
              source: m.interpretation.mcid.source || null,
            }
          : null,
        sdc: m.interpretation?.sdc
          ? {
              value: m.interpretation.sdc.value || null,
              ci: m.interpretation.sdc.ci || null,
              source: m.interpretation.sdc.source || null,
            }
          : null,
        mcidAchieved,
        trend: trend
          ? {
              classification: trend.classification,
              slopePerMonth: _round(trend.slopePerMonth, 3),
              ci95PerMonth: trend.ci95PerMonth
                ? [_round(trend.ci95PerMonth[0], 3), _round(trend.ci95PerMonth[1], 3)]
                : null,
              r2: _round(trend.r2, 3),
              confidence: trend.confidence || null,
              spanDays: trend.spanDays || null,
              n: trend.n || null,
            }
          : null,
        adminHistory: admins.map(a => ({
          applicationId: String(a._id),
          applicationDate: a.applicationDate,
          totalRawScore: a.totalRawScore,
          purpose: a.purpose,
          status: a.status,
          isBaseline: !!a.isBaseline,
          scoredWithMeasureVersion: a.scoredWithMeasureVersion || null,
          scoredWithAlgorithmVersion: a.scoredWithAlgorithmVersion || null,
          correctionOf: a.correctionOf ? String(a.correctionOf) : null,
        })),
      });
    }

    // ─── Full alerts with evidence ───────────────────────────────
    let alerts = [];
    if (MeasureAlert) {
      const alertDocs = await MeasureAlert.find({ beneficiaryId: benObjectId })
        .sort({ firstSeenAt: -1 })
        .lean()
        .catch(() => []);
      alerts = alertDocs.map(a => ({
        alertId: String(a._id),
        alertType: a.alertType,
        severity: a.severity,
        status: a.status,
        firstSeenAt: a.firstSeenAt,
        lastEvaluatedAt: a.lastEvaluatedAt,
        evidence: a.evidence || null,
        resolvedAt: a.resolvedAt || null,
        resolutionMode: a.resolutionMode || null,
      }));
    }
    const alertsOpen = alerts.filter(a => a.status === 'open').length;

    // ─── Goals with detail (not just counts) ─────────────────────
    let goals = [];
    let goalsAchieved = 0;
    if (TherapeuticGoal) {
      const goalDocs = await TherapeuticGoal.find({
        beneficiaryId: benObjectId,
        isDeleted: { $ne: true },
      })
        .select('title title_ar status currentProgress baseline target progressHistory targetDate')
        .lean()
        .catch(() => []);
      goals = goalDocs.map(g => {
        const history = Array.isArray(g.progressHistory) ? g.progressHistory : [];
        const lastEntry = history.length ? history[history.length - 1] : null;
        return {
          goalId: String(g._id),
          title: g.title,
          title_ar: g.title_ar || null,
          status: g.status,
          currentProgress: g.currentProgress || 0,
          baseline: g.baseline || null,
          target: g.target || null,
          targetDate: g.targetDate || null,
          lastProgressEntry: lastEntry
            ? {
                date: lastEntry.date,
                value: lastEntry.value,
                rating: lastEntry.rating,
              }
            : null,
        };
      });
      goalsAchieved = goals.filter(g => g.status === 'achieved').length;
    }

    return {
      reportType: REPORT_TYPE,
      reportVersion: REPORT_VERSION,
      beneficiaryId: String(benObjectId),
      generatedAt: new Date(),
      reportLanguage: 'ar',
      measures: measureRows,
      alerts,
      goals,
      summary: {
        overallStatus: rollup.overallStatus,
        totalAdmins,
        distinctMeasures: measureRows.length,
        alertsOpen,
        goalsAchieved,
      },
      citations,
      signOff: this._composeSignOff(),
    };
  }

  _composeSignOff() {
    return {
      requiresSignature: true,
      signatureFields: [
        { role_ar: 'الأخصائي المُقيِّم', signedName: null, signedAt: null },
        { role_ar: 'المدير الإكلينيكي', signedName: null, signedAt: null },
      ],
      note_ar:
        'هذا تقرير إكلينيكي مفصّل مُعَدّ للسجل الطبي / مراجعة التأمين — يحتوي على البيانات الإحصائية الكاملة',
    };
  }

  // ─── Pure helpers exposed for tests ───────────────────────────────
  _round(n, p) {
    return _round(n, p);
  }
  _evaluateMcidAchievement(admins, dir) {
    return _evaluateMcidAchievement(admins, dir);
  }
}

const svc = new MeasureClinicalReportSvc();
module.exports = svc;
module.exports.REPORT_TYPE = REPORT_TYPE;
module.exports.REPORT_VERSION = REPORT_VERSION;
