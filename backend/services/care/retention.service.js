'use strict';

/**
 * retention.service.js — Phase 17 Commit 8 (4.0.90).
 *
 * Churn-risk detection + auto-intervention.
 *
 * Uses the C7 Beneficiary-360 service as its read foundation,
 * then adds retention-specific risk factors the 360 doesn't
 * surface on its own (no recent home visit, IADL trend
 * declining, participation drop, stale critical flags, etc.).
 *
 * Each assessment is an immutable snapshot — re-running creates
 * a new document; the prior assessments remain for trend
 * visualization.
 *
 * When the computed band hits `high` or `imminent`, the service
 * auto-triggers interventions by calling the appropriate
 * upstream service (psych, social, home-visit). Failures are
 * logged on the assessment but don't break the assessment.
 *
 * Surfaces:
 *   assess(beneficiaryId, { force?, triggeredBy? })
 *   computeRiskScore(beneficiaryId)  — dry-run, no persistence
 *   sweep({ branchId?, beneficiaryIds?, limit? })
 *   getLatest(beneficiaryId)
 *   getTrend(beneficiaryId, { limit })
 *   listHighRisk({ branchId?, band?, acknowledged?, limit? })
 *   acknowledge(assessmentId, { actorId, notes })
 */

const registry = require('../../config/care/retention.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}

function createRetentionService({
  assessmentModel,
  beneficiary360Service,
  psychService = null,
  socialCaseService = null,
  homeVisitService = null,
  beneficiaryModel = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!assessmentModel) throw new Error('retention.service: assessmentModel required');
  if (!beneficiary360Service) {
    throw new Error('retention.service: beneficiary360Service required');
  }
  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[Retention] emit ${name} failed: ${err.message}`);
    }
  }

  // ── Risk-factor detectors ──────────────────────────────────────

  function _detectFactors(profile, healthScore) {
    const factors = [];
    const nowDate = now();
    const sixtyDaysAgo = new Date(
      nowDate.getTime() - registry.THRESHOLDS.HOME_VISIT_WINDOW_DAYS * 86400000
    );
    const sevenDaysAgo = new Date(
      nowDate.getTime() - registry.THRESHOLDS.STALE_CRITICAL_FLAG_DAYS * 86400000
    );

    // no_recent_home_visit — only if there's an active case
    if (profile.activeSocialCase) {
      const visits = (profile.homeVisits || []).filter(
        v => v.status === 'completed' && v.completedAt && new Date(v.completedAt) >= sixtyDaysAgo
      );
      if (visits.length === 0) {
        factors.push({
          code: 'no_recent_home_visit',
          weight: registry.RISK_FACTORS.no_recent_home_visit.weight,
          detail: 'No completed home visit in the last 60 days on active case',
        });
      }
    }

    // iadl_declining — last IADL total < prior IADL total
    const iadlSeries = profile.iadlTrend?.series || [];
    if (iadlSeries.length >= 2) {
      const last = iadlSeries[0]?.total;
      const prior = iadlSeries[1]?.total;
      if (typeof last === 'number' && typeof prior === 'number' && last < prior) {
        factors.push({
          code: 'iadl_declining',
          weight: registry.RISK_FACTORS.iadl_declining.weight,
          detail: `IADL declined from ${prior} to ${last}`,
        });
      }
    }

    // participation_dropped — compare last window participation count trend
    // Uses participationAnalytics total vs half the analytics window as proxy
    const pa = profile.participationAnalytics;
    if (pa && typeof pa.total === 'number') {
      // We need historical count to compare. Use participationLogs directly:
      const logs = profile.participationLogs || [];
      const windowMs = (pa.windowDays || 90) * 86400000;
      const midpoint = new Date(nowDate.getTime() - windowMs / 2);
      const earliest = new Date(nowDate.getTime() - windowMs);
      const recentCount = logs.filter(l => new Date(l.occurredAt) >= midpoint).length;
      const priorHalfCount = logs.filter(l => {
        const d = new Date(l.occurredAt);
        return d >= earliest && d < midpoint;
      }).length;
      if (
        priorHalfCount > 0 &&
        recentCount / priorHalfCount <= 1 - registry.THRESHOLDS.PARTICIPATION_DROP_RATIO
      ) {
        factors.push({
          code: 'participation_dropped',
          weight: registry.RISK_FACTORS.participation_dropped.weight,
          detail: `Participation dropped: ${priorHalfCount} → ${recentCount}`,
        });
      }
    }

    // stale_critical_flag
    const staleFlag = (profile.riskFlags || []).find(
      f =>
        f.severity === 'critical' &&
        ['active', 'escalated'].includes(f.status) &&
        f.raisedAt &&
        new Date(f.raisedAt) < sevenDaysAgo
    );
    if (staleFlag) {
      factors.push({
        code: 'stale_critical_flag',
        weight: registry.RISK_FACTORS.stale_critical_flag.weight,
        detail: `Flag ${staleFlag.flagNumber || staleFlag._id} raised ${new Date(staleFlag.raisedAt).toISOString()}`,
      });
    }

    // safety_plan_overdue
    const overdueSafety = (profile.riskFlags || []).find(
      f =>
        f.status === 'monitoring' &&
        f.safetyPlanReviewDue &&
        new Date(f.safetyPlanReviewDue) < nowDate
    );
    if (overdueSafety) {
      factors.push({
        code: 'safety_plan_overdue',
        weight: registry.RISK_FACTORS.safety_plan_overdue.weight,
        detail: `Safety plan review was due ${new Date(overdueSafety.safetyPlanReviewDue).toISOString()}`,
      });
    }

    // welfare_stuck_info_requested — any app in info_requested > 14 days
    const fourteenDaysAgo = new Date(
      nowDate.getTime() - registry.THRESHOLDS.WELFARE_INFO_REQUESTED_DAYS * 86400000
    );
    const stuckWelfare = (profile.welfareApplications || []).find(w => {
      if (w.status !== 'info_requested') return false;
      // use updatedAt OR statusHistory for when it entered info_requested
      const lastChange = w.updatedAt ? new Date(w.updatedAt) : null;
      return lastChange && lastChange < fourteenDaysAgo;
    });
    if (stuckWelfare) {
      factors.push({
        code: 'welfare_stuck_info_requested',
        weight: registry.RISK_FACTORS.welfare_stuck_info_requested.weight,
        detail: `${stuckWelfare.applicationNumber} stuck > 14 days in info_requested`,
      });
    }

    // welfare_all_rejected_recent
    const sixMonthsAgo = new Date(
      nowDate.getTime() - registry.THRESHOLDS.WELFARE_RECENT_WINDOW_DAYS * 86400000
    );
    const recentWelfare = (profile.welfareApplications || []).filter(
      w => w.createdAt && new Date(w.createdAt) >= sixMonthsAgo
    );
    if (
      recentWelfare.length >= 2 &&
      recentWelfare.every(w => ['rejected', 'appeal_rejected'].includes(w.status))
    ) {
      factors.push({
        code: 'welfare_all_rejected_recent',
        weight: registry.RISK_FACTORS.welfare_all_rejected_recent.weight,
        detail: `${recentWelfare.length} welfare apps in last 6 months all rejected`,
      });
    }

    // isolation_no_linkages
    const activeLinkages = (profile.communityLinkages || []).filter(l =>
      ['active', 'paused'].includes(l.status)
    ).length;
    if (activeLinkages === 0) {
      factors.push({
        code: 'isolation_no_linkages',
        weight: registry.RISK_FACTORS.isolation_no_linkages.weight,
        detail: 'No active or paused community linkages',
      });
    }

    // upcoming_home_visit (mitigating)
    const upcomingVisit = (profile.homeVisits || []).find(
      v => v.status === 'scheduled' && v.scheduledFor && new Date(v.scheduledFor) >= nowDate
    );
    if (upcomingVisit) {
      factors.push({
        code: 'upcoming_home_visit',
        weight: registry.RISK_FACTORS.upcoming_home_visit.weight,
        detail: `Visit ${upcomingVisit.visitNumber || upcomingVisit._id} scheduled`,
      });
    }

    // active_mdt (mitigating)
    const activeMdt = (profile.mdtMeetings || []).find(m =>
      ['scheduled', 'in_progress'].includes(m.status)
    );
    if (activeMdt) {
      factors.push({
        code: 'active_mdt',
        weight: registry.RISK_FACTORS.active_mdt.weight,
        detail: `MDT ${activeMdt.meetingNumber || activeMdt._id}`,
      });
    }

    return factors;
  }

  // ── Score composition ──────────────────────────────────────────

  function _composeScore(healthScore, factors) {
    // Start from inverted healthScore (100 - overall) — healthy = low risk
    const invertedHealth = healthScore ? 100 - (healthScore.overall || 50) : 50;
    const factorSum = factors.reduce((s, f) => s + (f.weight || 0), 0);
    const raw = Math.round(invertedHealth * 0.6 + factorSum);
    return Math.max(0, Math.min(100, raw));
  }

  // ── computeRiskScore (dry run) ─────────────────────────────────

  async function computeRiskScore(beneficiaryId) {
    if (!beneficiaryId) throw new MissingFieldError(['beneficiaryId']);
    const [profile, healthScore] = await Promise.all([
      beneficiary360Service.getProfile(beneficiaryId),
      beneficiary360Service.getHealthScore(beneficiaryId),
    ]);
    const factors = _detectFactors(profile, healthScore);
    const riskScore = _composeScore(healthScore, factors);
    const riskBand = registry.bandForScore(riskScore);
    return { beneficiaryId: String(beneficiaryId), riskScore, riskBand, factors, healthScore };
  }

  // ── assess — persist + trigger interventions ───────────────────

  async function assess(
    beneficiaryId,
    { force = false, triggeredBy = 'manual', actorId = null } = {}
  ) {
    if (!beneficiaryId) throw new MissingFieldError(['beneficiaryId']);

    const computed = await computeRiskScore(beneficiaryId);

    // Fetch previous assessment for trend
    let previous = null;
    try {
      const rows = await assessmentModel
        .find({ beneficiaryId, deleted_at: null })
        .sort({ computedAt: -1 })
        .limit(1);
      previous = rows[0] || null;
    } catch (_) {
      /* best-effort */
    }

    const trend = registry.trendFor(previous?.riskScore ?? null, computed.riskScore);

    // Skip if unchanged + not forced
    if (
      !force &&
      previous &&
      previous.riskScore === computed.riskScore &&
      previous.riskBand === computed.riskBand
    ) {
      logger.info(
        `[Retention] skip — no change for ${beneficiaryId} (score=${computed.riskScore})`
      );
      return previous;
    }

    // Branch snapshot
    let branchId = null;
    if (beneficiaryModel) {
      try {
        const b = await beneficiaryModel.findById(beneficiaryId);
        branchId = b?.branchId || null;
      } catch (_) {
        /* optional */
      }
    }

    // Build assessment doc
    const interventions = registry
      .interventionsForBand(computed.riskBand)
      .map(kind => ({ kind, status: 'pending' }));

    const doc = await assessmentModel.create({
      beneficiaryId,
      branchId,
      computedAt: now(),
      riskScore: computed.riskScore,
      riskBand: computed.riskBand,
      previousRiskScore: previous?.riskScore ?? null,
      trend,
      factors: computed.factors,
      healthScoreSnapshot: {
        overall: computed.healthScore?.overall ?? null,
        band: computed.healthScore?.band ?? null,
        mentalWellbeing: computed.healthScore?.subscores?.mentalWellbeing ?? null,
        functionalIndependence: computed.healthScore?.subscores?.functionalIndependence ?? null,
        socialIntegration: computed.healthScore?.subscores?.socialIntegration ?? null,
      },
      interventions,
      triggeredBy,
      triggeredByUserId: actorId,
    });

    await _emit('ops.care.retention.assessed', {
      assessmentId: String(doc._id),
      assessmentNumber: doc.assessmentNumber,
      beneficiaryId: String(beneficiaryId),
      riskScore: doc.riskScore,
      riskBand: doc.riskBand,
      trend: doc.trend,
      factorCount: computed.factors.length,
    });

    // Trigger interventions (non-blocking per intervention)
    await _triggerInterventions(doc, {
      beneficiaryId,
      caseId: computed.factors.length
        ? (await beneficiary360Service.getProfile(beneficiaryId))?.activeSocialCase?._id || null
        : null,
      branchId,
      actorId,
    });

    return doc;
  }

  // ── Intervention dispatcher ────────────────────────────────────

  async function _triggerInterventions(doc, ctx) {
    for (const iv of doc.interventions) {
      try {
        switch (iv.kind) {
          case 'track_only':
            iv.status = 'executed';
            break;

          case 'notify_retention_manager':
            await _emit('ops.care.retention.notify_manager', {
              assessmentId: String(doc._id),
              beneficiaryId: String(ctx.beneficiaryId),
              riskBand: doc.riskBand,
              riskScore: doc.riskScore,
            });
            iv.status = 'executed';
            break;

          case 'request_home_visit':
            await _emit('ops.care.retention.home_visit_requested', {
              assessmentId: String(doc._id),
              beneficiaryId: String(ctx.beneficiaryId),
              caseId: ctx.caseId,
              branchId: ctx.branchId,
              reason: `retention risk ${doc.riskBand} (score ${doc.riskScore})`,
            });
            iv.status = 'executed';
            break;

          case 'flag_case_high_risk':
            if (socialCaseService && ctx.caseId) {
              try {
                await socialCaseService.flagHighRisk(ctx.caseId, {
                  riskLevel: 'high',
                  reason: `retention_imminent (score ${doc.riskScore})`,
                });
                iv.status = 'executed';
                iv.ref = { type: 'social_case', id: String(ctx.caseId) };
              } catch (err) {
                iv.status = 'failed';
                iv.error = err.message;
              }
            } else {
              iv.status = 'skipped';
              iv.notes = 'no active social case or socialCaseService not wired';
            }
            break;

          case 'raise_psych_flag':
            if (psychService?.raiseFlag) {
              try {
                const flag = await psychService.raiseFlag({
                  beneficiaryId: ctx.beneficiaryId,
                  branchId: ctx.branchId,
                  caseId: ctx.caseId,
                  flagType: 'neglect_risk',
                  severity: 'high',
                  source: `retention:${doc.assessmentNumber}`,
                  description: `Auto-raised: retention risk imminent (score ${doc.riskScore})`,
                });
                iv.status = 'executed';
                iv.ref = {
                  type: 'psych_flag',
                  id: String(flag._id),
                  number: flag.flagNumber || null,
                };
              } catch (err) {
                iv.status = 'failed';
                iv.error = err.message;
              }
            } else {
              iv.status = 'skipped';
              iv.notes = 'psychService not wired';
            }
            break;

          case 'schedule_mdt':
            if (psychService?.scheduleMdt) {
              try {
                const mdtDate = new Date(Date.now() + 3 * 86400000); // +3d
                const mdt = await psychService.scheduleMdt({
                  beneficiaryId: ctx.beneficiaryId,
                  branchId: ctx.branchId,
                  purpose: 'complex_case_review',
                  scheduledFor: mdtDate,
                  agenda: [
                    `Retention risk imminent (score ${doc.riskScore})`,
                    ...doc.factors.slice(0, 3).map(f => `Factor: ${f.code}`),
                  ],
                });
                iv.status = 'executed';
                iv.ref = {
                  type: 'mdt',
                  id: String(mdt._id),
                  number: mdt.meetingNumber || null,
                };
              } catch (err) {
                iv.status = 'failed';
                iv.error = err.message;
              }
            } else {
              iv.status = 'skipped';
              iv.notes = 'psychService.scheduleMdt not wired';
            }
            break;

          default:
            iv.status = 'skipped';
            iv.notes = `unknown intervention kind '${iv.kind}'`;
        }
      } catch (err) {
        iv.status = 'failed';
        iv.error = err.message;
      }
    }
    try {
      await doc.save();
    } catch (err) {
      logger.warn(`[Retention] persist interventions failed: ${err.message}`);
    }
  }

  // ── Reads + acknowledge ────────────────────────────────────────

  async function getLatest(beneficiaryId) {
    const rows = await assessmentModel
      .find({ beneficiaryId, deleted_at: null })
      .sort({ computedAt: -1 })
      .limit(1);
    return rows[0] || null;
  }

  async function getTrend(beneficiaryId, { limit = 20 } = {}) {
    const rows = await assessmentModel
      .find({ beneficiaryId, deleted_at: null })
      .sort({ computedAt: -1 })
      .limit(limit);
    return {
      beneficiaryId: String(beneficiaryId),
      series: rows.map(r => ({
        assessmentId: String(r._id),
        assessmentNumber: r.assessmentNumber,
        computedAt: r.computedAt,
        riskScore: r.riskScore,
        riskBand: r.riskBand,
        trend: r.trend,
      })),
    };
  }

  async function listHighRisk({
    branchId = null,
    band = null,
    acknowledged = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (band) filter.riskBand = band;
    else filter.riskBand = { $in: ['high', 'imminent'] };
    if (acknowledged !== null) filter.acknowledged = acknowledged;
    return assessmentModel
      .find(filter)
      .sort({ riskScore: -1, computedAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async function acknowledge(assessmentId, { actorId = null, notes = null } = {}) {
    const doc = await assessmentModel.findById(assessmentId);
    if (!doc || doc.deleted_at) throw new NotFoundError('Assessment not found');
    doc.acknowledged = true;
    doc.acknowledgedAt = now();
    doc.acknowledgedBy = actorId;
    doc.acknowledgementNotes = notes;
    await doc.save();
    await _emit('ops.care.retention.acknowledged', {
      assessmentId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
    });
    return doc;
  }

  // ── Sweep — batch assess ──────────────────────────────────────

  async function sweep({
    beneficiaryIds = null,
    branchId = null,
    limit = 100,
    triggeredBy = 'scheduler',
    actorId = null,
  } = {}) {
    let ids = beneficiaryIds;
    if (!ids || !ids.length) {
      if (!beneficiaryModel) {
        logger.warn('[Retention] sweep skipped — no beneficiaryIds + no beneficiaryModel');
        return { assessed: 0, errors: [] };
      }
      const filter = { deleted_at: null };
      if (branchId) filter.branchId = branchId;
      try {
        const rows = await beneficiaryModel.find(filter).limit(limit);
        ids = rows.map(r => String(r._id));
      } catch (err) {
        return { assessed: 0, errors: [err.message] };
      }
    }
    const errors = [];
    let assessed = 0;
    for (const id of ids) {
      try {
        await assess(id, { triggeredBy, actorId });
        assessed++;
      } catch (err) {
        errors.push({ beneficiaryId: id, error: err.message });
        logger.warn(`[Retention] sweep failed for ${id}: ${err.message}`);
      }
    }
    return { assessed, errors, totalCandidates: ids.length };
  }

  return {
    computeRiskScore,
    assess,
    sweep,
    getLatest,
    getTrend,
    listHighRisk,
    acknowledge,
  };
}

module.exports = {
  createRetentionService,
  NotFoundError,
  MissingFieldError,
};
