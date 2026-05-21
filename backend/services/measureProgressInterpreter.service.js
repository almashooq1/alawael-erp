'use strict';

/**
 * measureProgressInterpreter.service.js — Wave 232
 * ════════════════════════════════════════════════════════════════════
 * Rehabilitation Progress Interpretation Service
 *
 * Sits one layer above the W210/W211b/W212/W219/W221 substrate and
 * produces a single clinical narrative per (beneficiary × measure):
 *
 *   "Sustained improvement on Berg: 32 → 48 (+16, 50%) over 90 days —
 *    clinically meaningful change (MCID=4)."
 *
 * Pure decision logic lives in `backend/measures/interpretation/rules.js`
 * and is unit-testable without Mongo. This service is the orchestrator:
 * it pulls the substrate from DB, builds the context object, calls the
 * pure layer, and returns the rendered output.
 *
 * Service surface:
 *
 *   interpret({ beneficiaryId, measureRef, locale?, options? })
 *     → single per-measure interpretation
 *
 *   interpretAll({ beneficiaryId, locale? })
 *     → array of per-measure interpretations + rollup
 *
 * Substrate consumed:
 *   W210 Measure       — scoringDirection, MCID/SDC, range
 *   W211b MeasureApp   — baseline, current, history (status∈completed|locked)
 *   W219 trend         — fitLinear + classify (lazy, optional)
 *   W221 alerts        — open MeasureAlert types (REGRESSION/PLATEAU/MCID_NOT_MET)
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const rules = require('../measures/interpretation/rules');

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
      // W221 may not be loaded in all envs; that's fine — alerts are optional.
      return null;
    }
  },
};

// W219 trend engine is optional — load lazily.
function _loadTrendEngine() {
  try {
    return require('./measureTrendEngine.service');
  } catch {
    return null;
  }
}

class MeasureProgressInterpreterSvc {
  /**
   * Per-measure interpretation.
   * @returns {Promise<Object>} see README in rules.js
   */
  async interpret({ beneficiaryId, measureRef, locale = 'ar', options = {} } = {}) {
    if (!beneficiaryId) throw new Error('[measureProgressInterpreter] beneficiaryId required');
    if (!measureRef) throw new Error('[measureProgressInterpreter] measureRef required');

    const measure = await this._resolveMeasure(measureRef);
    if (!measure) {
      return this._notFoundResult({ beneficiaryId, measureRef, locale });
    }

    const ctx = await this._buildContext({ beneficiaryId, measure, options });
    const category = rules.pickCategory(ctx);
    ctx.tentativeCategory = category;
    const confidence = rules.computeConfidence(ctx);
    const color = rules.CATEGORY_COLORS[category] || 'gray';

    const summaryVars = this._buildSummaryVars(ctx, locale);
    const summary = rules.renderTemplate(category, summaryVars, locale);

    const result = {
      beneficiaryId: String(beneficiaryId),
      measureCode: measure.code,
      measureId: String(measure._id),
      measureName: measure.name,
      measureName_ar: measure.name_ar || measure.name,
      category,
      color,
      severity: rules.CATEGORY_SEVERITY[category] ?? 0,
      confidence,
      summary,
      caveats: this._collectCaveats(ctx),
      references: {
        baselineApplicationId: ctx.baseline?.applicationId
          ? String(ctx.baseline.applicationId)
          : null,
        currentApplicationId: ctx.current?.applicationId ? String(ctx.current.applicationId) : null,
        historyCount: ctx.history.length,
        relatedAlerts: [...(ctx.openAlertIds || [])],
      },
      generatedAt: new Date().toISOString(),
    };

    if (options.includeRawDeltas) {
      result.numbers = this._buildNumbersBlock(ctx);
    }
    if (options.includeSignals) {
      result.signals = {
        atCeiling: ctx.atCeiling,
        atFloor: ctx.atFloor,
        versionMismatchInHistory: ctx.versionMismatchInHistory,
        actorInconsistency: ctx.actorInconsistency,
        staleness: ctx.staleness,
      };
    }
    return result;
  }

  /**
   * Interpret all measures with admin history for a beneficiary +
   * compute a roll-up. The roll-up uses worst-wins severity to surface
   * the most clinically pressing measure as the headline.
   */
  async interpretAll({ beneficiaryId, locale = 'ar', options = {} } = {}) {
    if (!beneficiaryId) throw new Error('[measureProgressInterpreter] beneficiaryId required');
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) return { byMeasure: [], rollup: this._emptyRollup(locale) };

    const distinct = await MeasureApplication.distinct('measureId', {
      beneficiaryId: new mongoose.Types.ObjectId(String(beneficiaryId)),
      status: { $in: ['completed', 'locked'] },
    });

    const byMeasure = [];
    for (const mid of distinct) {
      const interp = await this.interpret({
        beneficiaryId,
        measureRef: mid,
        locale,
        options,
      });
      byMeasure.push(interp);
    }

    return {
      byMeasure,
      rollup: this._buildRollup(byMeasure, locale),
    };
  }

  // ── Orchestration internals ────────────────────────────────────────

  async _resolveMeasure(measureRef) {
    const Measure = M.Measure();
    if (!Measure) return null;
    if (mongoose.Types.ObjectId.isValid(String(measureRef))) {
      const byId = await Measure.findById(measureRef).lean();
      if (byId) return byId;
    }
    return Measure.findOne({ code: String(measureRef) }).lean();
  }

  async _buildContext({ beneficiaryId, measure, options }) {
    const MeasureApplication = M.MeasureApplication();
    const Alert = M.MeasureAlert();
    const benId = new mongoose.Types.ObjectId(String(beneficiaryId));

    // History — completed|locked, oldest first.
    const adminsRaw = await MeasureApplication.find({
      beneficiaryId: benId,
      measureId: measure._id,
      status: { $in: ['completed', 'locked'] },
    })
      .sort({ applicationDate: 1 })
      .lean();

    const history = adminsRaw.map(a => ({
      value: this._extractValue(a, measure),
      date: a.applicationDate,
      applicationId: a._id,
      isBaseline: !!a.isBaseline,
      scoredWithMeasureVersion: a.scoredWithMeasureVersion,
      assessorId: a.assessorId,
    }));

    const baseline =
      adminsRaw.find(a => a.isBaseline && a.status === 'locked') ||
      adminsRaw.find(a => a.isBaseline);
    const baselinePoint = baseline
      ? {
          value: this._extractValue(baseline, measure),
          date: baseline.applicationDate,
          applicationId: baseline._id,
        }
      : null;

    const current = adminsRaw[adminsRaw.length - 1];
    const currentPoint = current
      ? {
          value: this._extractValue(current, measure),
          date: current.applicationDate,
          applicationId: current._id,
        }
      : null;

    const prior = adminsRaw.length > 1 ? adminsRaw[adminsRaw.length - 2] : null;
    const priorPoint = prior
      ? {
          value: this._extractValue(prior, measure),
          date: prior.applicationDate,
          applicationId: prior._id,
        }
      : null;

    const scoringDirection = measure.scoringDirection || 'higher_better';
    const mcid = rules.resolveMcid(measure);
    const sdc = rules.resolveSdc(measure, mcid.value);

    // Trend fit — best-effort.
    let trendFit = null;
    let trendClass = null;
    const trendEngine = options.skipTrend === true ? null : _loadTrendEngine();
    if (trendEngine && history.length >= 3) {
      try {
        const points = history
          .filter(h => Number.isFinite(h.value))
          .map(h => ({ t: new Date(h.date).getTime() / 86400000, y: h.value }));
        if (points.length >= 3 && typeof trendEngine._fit === 'function') {
          trendFit = trendEngine._fit(points);
        } else if (points.length >= 3 && trendEngine.analyze) {
          // Optional fallback if engine exposes only the high-level API.
          const r = await trendEngine.analyze(beneficiaryId, measure._id || measure.code, {});
          if (r && r.fit) trendFit = r.fit;
          if (r && r.classification) trendClass = r.classification;
        }
      } catch (err) {
        // Trend engine failures must not break interpretation.
        logger.debug?.('[measureProgressInterpreter] trend fit failed: %s', err.message);
      }
    }

    // Open alerts — best-effort.
    const openAlertTypes = new Set();
    const openAlertIds = [];
    if (Alert) {
      try {
        const alerts = await Alert.find({
          beneficiaryId: benId,
          measureId: measure._id,
          status: 'open',
        }).lean();
        for (const a of alerts) {
          if (a.alertType) openAlertTypes.add(a.alertType);
          openAlertIds.push(String(a._id));
        }
      } catch (_) {
        // Alerts optional — silently ignore.
      }
    }

    // Detect signals
    const isMixed = this._detectMixedSubscales(adminsRaw, scoringDirection);
    const versionMismatchInHistory = this._detectVersionMismatch(adminsRaw);
    const actorInconsistency = this._detectActorInconsistency(adminsRaw);
    const staleness = this._detectStaleness(current, measure);
    const ceilingFlag = currentPoint
      ? rules.atCeiling(currentPoint.value, measure, scoringDirection)
      : false;
    const floorFlag = currentPoint
      ? rules.atCeiling(
          currentPoint.value,
          measure,
          scoringDirection === 'higher_better' ? 'lower_better' : 'higher_better'
        )
      : false;

    return {
      history,
      baseline: baselinePoint,
      current: currentPoint,
      prior: priorPoint,
      measure,
      scoringDirection,
      mcidValue: mcid.value,
      mcidSource: mcid.source,
      mcidMissing: mcid.missing,
      sdcValue: sdc.value,
      sdcSource: sdc.source,
      trendFit,
      trendClass,
      openAlertTypes,
      openAlertIds,
      isMixed,
      atCeiling: ceilingFlag,
      atFloor: floorFlag,
      versionMismatchInHistory,
      actorInconsistency,
      staleness,
    };
  }

  _extractValue(admin, measure) {
    // Outcome measures prefer totalRawScore; some use totalStandardScore.
    if (Number.isFinite(admin.totalRawScore)) return admin.totalRawScore;
    if (Number.isFinite(admin.totalStandardScore)) return admin.totalStandardScore;
    if (Number.isFinite(admin.compositeScore)) return admin.compositeScore;
    return null;
  }

  _detectMixedSubscales(adminsRaw, scoringDirection) {
    if (!adminsRaw.length) return false;
    const last = adminsRaw[adminsRaw.length - 1];
    if (!Array.isArray(last.domainScores) || last.domainScores.length < 2) return false;
    const baseline = adminsRaw.find(a => a.isBaseline) || adminsRaw[0];
    if (!Array.isArray(baseline.domainScores)) return false;

    const mult = scoringDirection === 'lower_better' ? -1 : 1;
    let positive = 0;
    let negative = 0;
    for (const dom of last.domainScores) {
      const baseDom = baseline.domainScores.find(d => d.domainKey === dom.domainKey);
      if (!baseDom || !Number.isFinite(dom.rawScore) || !Number.isFinite(baseDom.rawScore)) {
        continue;
      }
      const delta = (dom.rawScore - baseDom.rawScore) * mult;
      if (delta > 0) positive += 1;
      else if (delta < 0) negative += 1;
    }
    return positive > 0 && negative > 0;
  }

  _detectVersionMismatch(adminsRaw) {
    const versions = new Set();
    for (const a of adminsRaw) {
      if (a.scoredWithMeasureVersion) {
        // Compare on major only.
        versions.add(String(a.scoredWithMeasureVersion).split('.')[0]);
      }
    }
    return versions.size > 1;
  }

  _detectActorInconsistency(adminsRaw) {
    const last5 = adminsRaw.slice(-5);
    const actors = new Set(last5.map(a => String(a.assessorId || '')).filter(Boolean));
    return actors.size > 3;
  }

  _detectStaleness(current, measure) {
    if (!current?.applicationDate) return false;
    const cadence = measure?.reassessment?.standardIntervalDays;
    if (!cadence) return false;
    const ageDays = (Date.now() - new Date(current.applicationDate).getTime()) / 86400000;
    return ageDays > cadence * 2;
  }

  _buildSummaryVars(ctx, locale) {
    const measure = ctx.measure;
    const delta =
      ctx.baseline && ctx.current
        ? rules.directionAwareDelta(ctx.baseline.value, ctx.current.value, ctx.scoringDirection)
        : null;

    const range = this._range(measure);
    const percent =
      range != null && range > 0 && Number.isFinite(delta) ? (delta / range) * 100 : null;

    const daysSinceBaseline =
      ctx.baseline && ctx.current
        ? Math.round(
            (new Date(ctx.current.date).getTime() - new Date(ctx.baseline.date).getTime()) /
              86400000
          )
        : null;

    const needed = ctx.history.length < 3 ? 3 - ctx.history.length : 0;

    return {
      measureName: measure.name || measure.code,
      measureName_ar: measure.name_ar || measure.name || measure.code,
      baselineValue: ctx.baseline?.value,
      currentValue: ctx.current?.value,
      absoluteDelta: Number.isFinite(delta) ? Math.abs(delta).toFixed(1) : null,
      percentChange: Number.isFinite(percent) ? Math.abs(percent).toFixed(1) : null,
      percentSign: Number.isFinite(percent) && percent < 0 ? '−' : '+',
      mcid: Number.isFinite(ctx.mcidValue) ? ctx.mcidValue : null,
      sdc: Number.isFinite(ctx.sdcValue) ? ctx.sdcValue : null,
      daysSinceBaseline,
      historyCount: ctx.history.length,
      needed,
      maxScore: measure.maxScore,
      improvingDomains: ctx.isMixed ? this._mixedDomainNames(ctx, 'positive') : null,
      regressingDomains: ctx.isMixed ? this._mixedDomainNames(ctx, 'negative') : null,
    };
  }

  _mixedDomainNames(_ctx, _direction) {
    // Placeholder — orchestrator would resolve domain labels per locale.
    // Returning a count for now; UI can drill in via subscale fetch.
    return '';
  }

  _range(measure) {
    const dMin = measure?.derivedRange?.min;
    const dMax = measure?.derivedRange?.max;
    if (Number.isFinite(dMin) && Number.isFinite(dMax)) return dMax - dMin;
    const mMin = measure?.minScore;
    const mMax = measure?.maxScore;
    if (Number.isFinite(mMin) && Number.isFinite(mMax)) return mMax - mMin;
    return null;
  }

  _buildNumbersBlock(ctx) {
    const delta =
      ctx.baseline && ctx.current
        ? rules.directionAwareDelta(ctx.baseline.value, ctx.current.value, ctx.scoringDirection)
        : null;
    const deltaPrior =
      ctx.prior && ctx.current
        ? rules.directionAwareDelta(ctx.prior.value, ctx.current.value, ctx.scoringDirection)
        : null;
    const range = this._range(ctx.measure);
    const percent = range && range > 0 && Number.isFinite(delta) ? (delta / range) * 100 : null;
    return {
      baselineValue: ctx.baseline?.value ?? null,
      currentValue: ctx.current?.value ?? null,
      absoluteFromBaseline: Number.isFinite(delta) ? delta : null,
      percentFromBaseline: Number.isFinite(percent) ? Number(percent.toFixed(2)) : null,
      absoluteFromPrior: Number.isFinite(deltaPrior) ? deltaPrior : null,
      daysSinceBaseline:
        ctx.baseline && ctx.current
          ? Math.round(
              (new Date(ctx.current.date).getTime() - new Date(ctx.baseline.date).getTime()) /
                86400000
            )
          : null,
      mcid: ctx.mcidValue,
      sdc: ctx.sdcValue,
      mcidMet:
        Number.isFinite(ctx.mcidValue) && Number.isFinite(delta)
          ? Math.abs(delta) >= ctx.mcidValue
          : false,
      sdcMet:
        Number.isFinite(ctx.sdcValue) && Number.isFinite(delta)
          ? Math.abs(delta) >= ctx.sdcValue
          : false,
      mcidMissing: ctx.mcidMissing,
      r2: ctx.trendFit?.r2 ?? null,
      slope: ctx.trendFit?.slope ?? null,
    };
  }

  _collectCaveats(ctx) {
    const out = [];
    if (ctx.mcidMissing) {
      out.push(
        'MCID derived from percent-of-range fallback — establish a cited MCID on the Measure document.'
      );
    }
    if (ctx.versionMismatchInHistory) {
      out.push(
        'History spans multiple measure versions — interpret cross-version trends cautiously.'
      );
    }
    if (ctx.actorInconsistency) {
      out.push(
        'More than 3 distinct assessors in last 5 admins — rater variance may inflate noise.'
      );
    }
    if (ctx.staleness) {
      out.push(
        'Latest admin is older than 2× cadence — refresh measurement before relying on this interpretation.'
      );
    }
    if (ctx.history.length === 3) {
      out.push('Only 3 admins on record — interpretation tentative; revisit after the next admin.');
    }
    return out;
  }

  _buildRollup(byMeasure, locale) {
    if (!byMeasure.length) return this._emptyRollup(locale);
    let headline = byMeasure[0];
    for (const m of byMeasure) {
      if ((m.severity ?? 0) > (headline.severity ?? 0)) headline = m;
    }
    let improving = 0;
    let stable = 0;
    let regressing = 0;
    for (const m of byMeasure) {
      if (
        m.category === rules.CATEGORIES.SUSTAINED_IMPROVEMENT ||
        m.category === rules.CATEGORIES.SLOW_PROGRESS ||
        m.category === rules.CATEGORIES.CEILING_ACHIEVED
      ) {
        improving += 1;
      } else if (m.category === rules.CATEGORIES.REGRESSION) {
        regressing += 1;
      } else if (
        m.category === rules.CATEGORIES.STABLE ||
        m.category === rules.CATEGORIES.PLATEAU ||
        m.category === rules.CATEGORIES.STAGNANT ||
        m.category === rules.CATEGORIES.OSCILLATION
      ) {
        stable += 1;
      }
    }
    return {
      overallCategory: headline.category,
      headlineMeasureCode: headline.measureCode,
      headlineSummary: headline.summary,
      measuresImproving: improving,
      measuresStable: stable,
      measuresRegressing: regressing,
      total: byMeasure.length,
    };
  }

  _emptyRollup(_locale) {
    return {
      overallCategory: rules.CATEGORIES.INSUFFICIENT_DATA,
      headlineMeasureCode: null,
      headlineSummary: { ar: '', en: '' },
      measuresImproving: 0,
      measuresStable: 0,
      measuresRegressing: 0,
      total: 0,
    };
  }

  _notFoundResult({ beneficiaryId, measureRef, locale }) {
    return {
      beneficiaryId: String(beneficiaryId),
      measureRef: String(measureRef),
      category: rules.CATEGORIES.INSUFFICIENT_DATA,
      color: 'gray',
      confidence: rules.CONFIDENCE_TIERS.NONE,
      summary: rules.renderTemplate(
        rules.CATEGORIES.INSUFFICIENT_DATA,
        {
          measureName: 'unknown',
          measureName_ar: 'غير معروف',
          needed: 3,
        },
        locale
      ),
      caveats: ['measure not found'],
      references: { historyCount: 0 },
      generatedAt: new Date().toISOString(),
    };
  }
}

const singleton = new MeasureProgressInterpreterSvc();
module.exports = singleton;
module.exports._rules = rules;
