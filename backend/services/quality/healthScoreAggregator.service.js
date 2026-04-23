'use strict';

/**
 * healthScoreAggregator.service.js — Phase 13 Commit 9 (4.0.59).
 *
 * The executive payoff. Consumes every compliance/quality source
 * in the platform and collapses them into a single 0–100 score +
 * a per-pillar breakdown + a short list of the most load-bearing
 * facts (overdue critical controls, open sentinel incidents,
 * evidence expiring within 30 days, next management review
 * scheduled for).
 *
 * Resilience: **no single missing source can break the score**.
 * Each pillar is computed in isolation; on error or missing
 * service, the pillar contributes `null` and gets dropped from
 * the weighted average. The result carries a `pillarsAvailable`
 * count + a `warnings[]` list so the dashboard can be honest
 * about what data it had.
 *
 * DI:
 *
 *   createHealthScoreAggregator({
 *     sources: {
 *       controlLibrary,     // getCoverage + list({ criticality:'critical', lastResult:'fail' })
 *       managementReview,   // getDashboard + recent-closed count
 *       evidenceVault,      // getStats
 *       complianceCalendar, // getStats + list({ severity:'critical', status:'overdue' })
 *       incidents,          // getSummary (seriousRate, closureRate, sentinelOpen[])
 *       complaints,         // getSlaRate
 *       capa,               // getClosureSlaRate
 *       satisfaction,       // getLatestNps
 *       training,           // getMandatoryCompletionRate
 *       documents,          // getValidDocsRate
 *     },
 *     logger,
 *     now,
 *     cache,  // optional LRU-style cache { get, set }
 *     cacheTtlMs,
 *   })
 */

const {
  PILLARS,
  DEFAULT_WINDOW_DAYS,
  THRESHOLDS,
  CRITICAL_CONTROL_FAIL_PENALTY,
  gradeFor,
  weightedTotal,
} = require('../../config/health-score.registry');

// ── helpers ────────────────────────────────────────────────────────

async function _safe(fn, label, warnings, logger) {
  try {
    return await fn();
  } catch (err) {
    warnings.push({ pillar: label, reason: err.message || 'source failure' });
    if (logger) logger.warn(`[HealthScore] ${label} source failed: ${err.message}`);
    return null;
  }
}

function _cacheKey(opts) {
  return JSON.stringify({
    b: opts.branchId ? String(opts.branchId) : null,
    t: opts.tenantId ? String(opts.tenantId) : null,
    w: opts.windowDays || DEFAULT_WINDOW_DAYS,
  });
}

// ── class ──────────────────────────────────────────────────────────

class HealthScoreAggregator {
  constructor({
    sources = {},
    logger = console,
    now = () => new Date(),
    cache = null,
    cacheTtlMs = 5 * 60 * 1000,
  } = {}) {
    this.sources = sources;
    this.logger = logger;
    this.now = now;
    this.cache = cache;
    this.cacheTtlMs = cacheTtlMs;
  }

  // ── public: compute ─────────────────────────────────────────────

  /**
   * Compute the health score. Returns:
   *
   *   {
   *     score,          // 0..100 or null if no pillars available
   *     grade: { grade, color, label } | null,
   *     window: { days, from, to },
   *     pillars: [{ id, name{Ar,En}, weight, score, contribution, details }],
   *     summary: { pillarsAvailable, weightsUsed, weightsMissing },
   *     hotspots: [{ kind, severity, detail }],   // top 5-ish load-bearing facts
   *     warnings: [{ pillar, reason }],
   *     computedAt,
   *   }
   */
  async compute({ branchId, tenantId, windowDays } = {}) {
    const cacheKey = _cacheKey({ branchId, tenantId, windowDays });
    if (this.cache && typeof this.cache.get === 'function') {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cached.value;
    }

    const days = windowDays || DEFAULT_WINDOW_DAYS;
    const to = this.now();
    const from = new Date(to.getTime() - days * 86400000);
    const warnings = [];
    const hotspots = [];

    const ctx = { branchId, tenantId, windowDays: days, from, to };

    // Compute each pillar. Each returns { score, details } or null.
    const pillarMap = {
      controls: await _safe(() => this._scoreControls(ctx), 'controls', warnings, this.logger),
      management_review: await _safe(
        () => this._scoreManagementReview(ctx),
        'management_review',
        warnings,
        this.logger
      ),
      evidence: await _safe(() => this._scoreEvidence(ctx), 'evidence', warnings, this.logger),
      calendar: await _safe(() => this._scoreCalendar(ctx), 'calendar', warnings, this.logger),
      incidents: await _safe(() => this._scoreIncidents(ctx), 'incidents', warnings, this.logger),
      complaints: await _safe(
        () => this._scoreComplaints(ctx),
        'complaints',
        warnings,
        this.logger
      ),
      capa: await _safe(() => this._scoreCapa(ctx), 'capa', warnings, this.logger),
      satisfaction: await _safe(
        () => this._scoreSatisfaction(ctx),
        'satisfaction',
        warnings,
        this.logger
      ),
      training: await _safe(() => this._scoreTraining(ctx), 'training', warnings, this.logger),
      documents: await _safe(() => this._scoreDocuments(ctx), 'documents', warnings, this.logger),
    };

    // Extract scores for the weighted total.
    const scoresOnly = {};
    for (const [k, v] of Object.entries(pillarMap)) {
      scoresOnly[k] = v ? v.score : null;
    }

    const { score, pillarsAvailable, weightsUsed } = weightedTotal(scoresOnly);

    // Build per-pillar rows with contribution + details.
    const pillars = PILLARS.map(p => {
      const r = pillarMap[p.id];
      const pScore = r ? r.score : null;
      const contribution =
        pScore == null || weightsUsed === 0 ? 0 : Math.round((pScore * p.weight) / weightsUsed);
      return {
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        weight: p.weight,
        score: pScore,
        contribution,
        details: r ? r.details : null,
        hotspots: r ? r.hotspots || [] : [],
      };
    });

    // Merge pillar hotspots into the top-level list, trim.
    for (const p of pillars) {
      for (const h of p.hotspots || []) hotspots.push({ pillar: p.id, ...h });
    }
    hotspots.sort(
      (a, b) =>
        _severityRank(b.severity) - _severityRank(a.severity) ||
        (a.dueDate && b.dueDate ? new Date(a.dueDate) - new Date(b.dueDate) : 0)
    );

    const result = {
      score,
      grade: score == null ? null : gradeFor(score),
      window: { days, from, to },
      pillars,
      summary: {
        pillarsAvailable,
        weightsUsed,
        weightsMissing: 100 - weightsUsed,
      },
      hotspots: hotspots.slice(0, 8),
      warnings,
      computedAt: to,
    };

    if (this.cache && typeof this.cache.set === 'function') {
      this.cache.set(cacheKey, { value: result, expiresAt: Date.now() + this.cacheTtlMs });
    }
    return result;
  }

  // ── pillar calculators ──────────────────────────────────────────
  // Each returns { score: 0..100 | null, details: object, hotspots: [] }
  // or throws (caught by _safe).

  async _scoreControls(ctx) {
    const svc = this.sources.controlLibrary;
    if (!svc || typeof svc.getCoverage !== 'function') return null;
    const cov = await svc.getCoverage({ branchId: ctx.branchId, tenantId: ctx.tenantId });
    const total = cov.total || 0;
    if (!total) return { score: null, details: cov, hotspots: [] };

    const pass = cov.byOutcome.pass || 0;
    const fail = cov.byOutcome.fail || 0;
    const partial = cov.byOutcome.partial || 0;

    // Half credit for partial.
    const effectivePass = pass + 0.5 * partial;
    const rate = effectivePass / total;
    let score = THRESHOLDS.controls.passRateToScore(rate);

    // Critical-control failure penalty.
    const criticalFails = cov.byCriticality?.critical?.fail || 0;
    score = Math.max(0, (score || 0) - criticalFails * CRITICAL_CONTROL_FAIL_PENALTY);

    // Hotspots: list failing critical controls.
    let hotspots = [];
    if (criticalFails > 0 && typeof svc.list === 'function') {
      try {
        const rows = await svc.list({
          branchId: ctx.branchId,
          tenantId: ctx.tenantId,
          criticality: 'critical',
          lastResult: 'fail',
          limit: 10,
        });
        hotspots = rows.map(r => ({
          kind: 'critical_control_fail',
          severity: 'critical',
          detail: `${r.controlId} — ${r.nameEn}`,
          ref: { controlId: r.controlId },
        }));
      } catch {
        /* ignore */
      }
    }

    return {
      score,
      details: {
        total,
        passRate: Number(rate.toFixed(3)),
        byOutcome: cov.byOutcome,
        criticalFails,
        penaltyApplied: criticalFails * CRITICAL_CONTROL_FAIL_PENALTY,
      },
      hotspots,
    };
  }

  async _scoreManagementReview(ctx) {
    const svc = this.sources.managementReview;
    if (!svc) return null;
    // Prefer a getClosedInWindow count; fall back to getDashboard + list.
    let closedIn12m = null;
    if (typeof svc.countClosedInWindow === 'function') {
      closedIn12m = await svc.countClosedInWindow({ branchId: ctx.branchId, days: 365 });
    } else if (typeof svc.list === 'function') {
      const rows = await svc.list({
        branchId: ctx.branchId,
        status: 'closed',
        fromDate: new Date(ctx.to.getTime() - 365 * 86400000),
        toDate: ctx.to,
        limit: 50,
      });
      closedIn12m = rows.length;
    }

    const overdue =
      typeof svc.getDashboard === 'function'
        ? await svc.getDashboard({ branchId: ctx.branchId })
        : null;
    const score = THRESHOLDS.managementReview.byClosedCount(closedIn12m);

    const hotspots = [];
    if (overdue && overdue.overdue > 0) {
      hotspots.push({
        kind: 'overdue_management_review',
        severity: 'critical',
        detail: `${overdue.overdue} management review(s) past scheduled date`,
      });
    }

    return {
      score,
      details: { closedIn12m, dashboard: overdue },
      hotspots,
    };
  }

  async _scoreEvidence(ctx) {
    const svc = this.sources.evidenceVault;
    if (!svc || typeof svc.getStats !== 'function') return null;
    const stats = await svc.getStats({ branchId: ctx.branchId });
    const score = THRESHOLDS.evidence.scoreFrom(stats);
    const hotspots = [];
    if (stats.expired > 0) {
      hotspots.push({
        kind: 'expired_evidence',
        severity: 'critical',
        detail: `${stats.expired} evidence item(s) expired`,
      });
    }
    return { score, details: stats, hotspots };
  }

  async _scoreCalendar(ctx) {
    const svc = this.sources.complianceCalendar;
    if (!svc || typeof svc.getStats !== 'function') return null;
    const stats = await svc.getStats({ branchId: ctx.branchId, withinDays: ctx.windowDays });
    const total = stats.total || 0;
    const overdue = (stats.byStatus && stats.byStatus.overdue) || 0;
    const rate = total ? overdue / total : 0;
    const score = total ? THRESHOLDS.calendar.scoreFromOverdueRate(rate) : null;
    const hotspots = [];
    if (overdue > 0) {
      hotspots.push({
        kind: 'overdue_calendar_events',
        severity: 'warning',
        detail: `${overdue} compliance obligation(s) past due`,
      });
    }
    return {
      score,
      details: { total, overdue, rate: Number(rate.toFixed(3)), ...stats },
      hotspots,
    };
  }

  async _scoreIncidents(ctx) {
    const svc = this.sources.incidents;
    if (!svc || typeof svc.getSummary !== 'function') return null;
    const s = await svc.getSummary({ branchId: ctx.branchId, from: ctx.from, to: ctx.to });
    const score = THRESHOLDS.incidents.scoreFrom(s);
    const hotspots = [];
    if ((s.sentinelOpen || []).length) {
      hotspots.push({
        kind: 'open_sentinel_incident',
        severity: 'critical',
        detail: `${s.sentinelOpen.length} open sentinel incident(s)`,
      });
    }
    return { score, details: s, hotspots };
  }

  async _scoreComplaints(ctx) {
    const svc = this.sources.complaints;
    if (!svc || typeof svc.getSlaRate !== 'function') return null;
    const rate = await svc.getSlaRate({ branchId: ctx.branchId, from: ctx.from, to: ctx.to });
    const score = THRESHOLDS.complaints.scoreFromSlaRate(rate);
    const hotspots = [];
    if (rate != null && rate < 0.85) {
      hotspots.push({
        kind: 'complaint_sla_breach',
        severity: 'warning',
        detail: `Complaint SLA adherence ${(rate * 100).toFixed(0)}% (target ≥ 95%)`,
      });
    }
    return { score, details: { slaRate: rate }, hotspots };
  }

  async _scoreCapa(ctx) {
    const svc = this.sources.capa;
    if (!svc || typeof svc.getClosureSlaRate !== 'function') return null;
    const rate = await svc.getClosureSlaRate({
      branchId: ctx.branchId,
      from: ctx.from,
      to: ctx.to,
    });
    const score = THRESHOLDS.capa.scoreFromSlaRate(rate);
    const hotspots = [];
    if (rate != null && rate < 0.7) {
      hotspots.push({
        kind: 'capa_closure_low',
        severity: 'warning',
        detail: `CAPA closure within SLA ${(rate * 100).toFixed(0)}% (target ≥ 85%)`,
      });
    }
    return { score, details: { slaRate: rate }, hotspots };
  }

  async _scoreSatisfaction(ctx) {
    const svc = this.sources.satisfaction;
    if (!svc || typeof svc.getLatestNps !== 'function') return null;
    const { nps, responseCount } = await svc.getLatestNps({ branchId: ctx.branchId });
    const score = THRESHOLDS.satisfaction.scoreFromNps(nps);
    const hotspots = [];
    if (nps != null && nps < 30) {
      hotspots.push({
        kind: 'low_nps',
        severity: 'warning',
        detail: `NPS ${nps} (target ≥ 50)`,
      });
    }
    return { score, details: { nps, responseCount }, hotspots };
  }

  async _scoreTraining(ctx) {
    const svc = this.sources.training;
    if (!svc || typeof svc.getMandatoryCompletionRate !== 'function') return null;
    const rate = await svc.getMandatoryCompletionRate({ branchId: ctx.branchId });
    const score = THRESHOLDS.training.scoreFromCompletion(rate);
    const hotspots = [];
    if (rate != null && rate < 0.85) {
      hotspots.push({
        kind: 'training_below_target',
        severity: 'warning',
        detail: `Mandatory training completion ${(rate * 100).toFixed(0)}% (target ≥ 95%)`,
      });
    }
    return { score, details: { completionRate: rate }, hotspots };
  }

  async _scoreDocuments(ctx) {
    const svc = this.sources.documents;
    if (!svc || typeof svc.getValidDocsRate !== 'function') return null;
    const rate = await svc.getValidDocsRate({ branchId: ctx.branchId });
    const score = THRESHOLDS.documents.scoreFromValidRate(rate);
    const hotspots = [];
    if (rate != null && rate < 0.95) {
      hotspots.push({
        kind: 'documents_expired',
        severity: 'critical',
        detail: `${((1 - rate) * 100).toFixed(0)}% of tracked documents are expired`,
      });
    }
    return { score, details: { validRate: rate }, hotspots };
  }
}

function _severityRank(s) {
  if (s === 'critical') return 3;
  if (s === 'warning') return 2;
  if (s === 'info') return 1;
  return 0;
}

// ── factory + singleton ────────────────────────────────────────────

function createHealthScoreAggregator(deps) {
  return new HealthScoreAggregator(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    // Bind the in-process singletons we already own. Phase 13 C11
    // adds the remaining cross-module bindings (incidents,
    // complaints, capa, satisfaction, training, documents) at boot.
    const controlLibrary = require('./controlLibrary.service').getDefault();
    const managementReview = require('./managementReview.service').getDefault();
    const evidenceVault = require('./evidenceVault.service').getDefault();
    const complianceCalendar = require('./complianceCalendar.service').getDefault();
    _defaultInstance = new HealthScoreAggregator({
      sources: { controlLibrary, managementReview, evidenceVault, complianceCalendar },
    });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  HealthScoreAggregator,
  createHealthScoreAggregator,
  getDefault,
  _replaceDefault,
};
