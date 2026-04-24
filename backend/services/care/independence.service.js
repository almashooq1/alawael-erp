'use strict';

/**
 * independence.service.js — Phase 17 Commit 6 (4.0.88).
 *
 * Three coupled surfaces:
 *
 *   • TransitionReadiness — create draft / score domains /
 *     transition status / supersede old assessments
 *   • IADL — administer (auto-scored) + trend
 *   • CommunityParticipation — log events / update outcomes +
 *     roll-up analytics (type mix, support-level distribution)
 *
 * No SLA wiring — these are longitudinal planning subjects.
 * Events emitted for loose-coupled downstream (e.g., retention
 * risk scorer in future C8).
 */

const registry = require('../../config/care/independence.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class IllegalTransitionError extends Error {
  constructor(msg, extra = {}) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
    Object.assign(this, extra);
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}

function _missing(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function createIndependenceService({
  transitionModel,
  iadlModel,
  participationModel,
  partnerModel = null, // optional — for linkage lookups
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!transitionModel) throw new Error('independence.service: transitionModel required');
  if (!iadlModel) throw new Error('independence.service: iadlModel required');
  if (!participationModel) throw new Error('independence.service: participationModel required');
  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[Independence] emit ${name} failed: ${err.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // TRANSITION READINESS
  // ═════════════════════════════════════════════════════════════════

  async function createTransitionAssessment(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'targetTransition'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.TRANSITION_TARGETS.includes(data.targetTransition)) {
      throw new MissingFieldError([`targetTransition (unknown '${data.targetTransition}')`]);
    }

    const doc = await transitionModel.create({
      ...data,
      status: 'draft',
      statusHistory: [],
      domainScores: data.domainScores || [],
      barriers: data.barriers || [],
      goals: data.goals || [],
      assessedAt: data.assessedAt || now(),
      assessedBy: actorId,
      createdBy: actorId,
    });

    await _emit('ops.care.independence.transition_assessment_created', {
      assessmentId: String(doc._id),
      assessmentNumber: doc.assessmentNumber,
      beneficiaryId: String(doc.beneficiaryId),
      targetTransition: doc.targetTransition,
    });
    return doc;
  }

  async function scoreTransitionDomain(
    id,
    { domain, score, notes = null, evidence = null, actorId = null } = {}
  ) {
    if (!domain) throw new MissingFieldError(['domain']);
    if (!registry.TRANSITION_DOMAIN_CODES.includes(domain)) {
      throw new MissingFieldError([`domain (unknown '${domain}')`]);
    }
    if (
      typeof score !== 'number' ||
      score < registry.DOMAIN_SCORE_MIN ||
      score > registry.DOMAIN_SCORE_MAX
    ) {
      throw new MissingFieldError([`score (0..${registry.DOMAIN_SCORE_MAX})`]);
    }
    const doc = await transitionModel.findById(id);
    if (!doc) throw new NotFoundError('Transition assessment not found');
    if (['completed', 'superseded', 'archived', 'cancelled'].includes(doc.status)) {
      throw new IllegalTransitionError(`Cannot score a ${doc.status} assessment`, {
        status: doc.status,
      });
    }
    // Upsert per domain
    const existing = (doc.domainScores || []).find(d => d.domain === domain);
    if (existing) {
      existing.score = score;
      if (notes != null) existing.notes = notes;
      if (evidence != null) existing.evidence = evidence;
    } else {
      doc.domainScores.push({ domain, score, notes, evidence });
    }
    // Nudge into 'in_progress' if still draft
    if (doc.status === 'draft') {
      doc.statusHistory.push({
        from: 'draft',
        to: 'in_progress',
        event: 'started',
        actorId: actorId || null,
        at: now(),
      });
      doc.status = 'in_progress';
    }
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function transitionAssessmentStatus(
    id,
    toStatus,
    { actorId = null, notes = null, patch = {} } = {}
  ) {
    const doc = await transitionModel.findById(id);
    if (!doc) throw new NotFoundError('Transition assessment not found');
    const fromStatus = doc.status;
    if (!registry.canTransitionStatus(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    for (const [k, v] of Object.entries(patch || {})) doc[k] = v;
    const required = registry.transitionRequiredFields(fromStatus, toStatus);
    const missing = required.filter(f => _missing(doc[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const event = registry.transitionEventFor(fromStatus, toStatus);
    doc.statusHistory.push({
      from: fromStatus,
      to: toStatus,
      event,
      actorId: actorId || null,
      at: now(),
      notes: notes || null,
    });
    doc.status = toStatus;
    doc.updatedBy = actorId;
    await doc.save();
    await _emit(`ops.care.independence.transition_${event}`, {
      assessmentId: String(doc._id),
      assessmentNumber: doc.assessmentNumber,
      from: fromStatus,
      to: toStatus,
    });
    return doc;
  }

  async function completeTransitionAssessment(
    id,
    { overallReadiness = null, summary = null, recommendations = null, actorId = null } = {}
  ) {
    const doc = await transitionModel.findById(id);
    if (!doc) throw new NotFoundError('Transition assessment not found');
    // Derive tier if not provided
    let tier = overallReadiness;
    if (!tier) {
      const scores = (doc.domainScores || []).map(d => d.score);
      tier = registry.deriveReadinessTier(scores);
    }
    return transitionAssessmentStatus(id, 'completed', {
      actorId,
      patch: {
        overallReadiness: tier,
        summary: summary || doc.summary,
        recommendations: recommendations || doc.recommendations,
      },
    });
  }

  async function supersedeTransitionAssessment(id, { newAssessmentId, actorId = null } = {}) {
    if (!newAssessmentId) throw new MissingFieldError(['newAssessmentId']);
    return transitionAssessmentStatus(id, 'superseded', {
      actorId,
      patch: { supersededByAssessmentId: newAssessmentId },
    });
  }

  async function cancelTransitionAssessment(id, { cancellationReason, actorId = null } = {}) {
    if (!cancellationReason) throw new MissingFieldError(['cancellationReason']);
    return transitionAssessmentStatus(id, 'cancelled', {
      actorId,
      patch: { cancellationReason },
    });
  }

  async function addGoal(id, goal, { actorId = null } = {}) {
    if (!goal?.goal) throw new MissingFieldError(['goal']);
    const doc = await transitionModel.findById(id);
    if (!doc) throw new NotFoundError('Transition assessment not found');
    doc.goals.push({
      domain: goal.domain || null,
      goal: goal.goal,
      targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
      status: 'pending',
    });
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function updateGoal(id, goalId, { status = null, notes = null, actorId = null } = {}) {
    const doc = await transitionModel.findById(id);
    if (!doc) throw new NotFoundError('Transition assessment not found');
    const g = (doc.goals || []).find(x => String(x._id) === String(goalId));
    if (!g) throw new NotFoundError('Goal not found');
    if (status) {
      if (!['pending', 'in_progress', 'achieved', 'cancelled'].includes(status)) {
        throw new MissingFieldError([`status (unknown '${status}')`]);
      }
      g.status = status;
      if (status === 'achieved') g.achievedAt = now();
    }
    if (notes != null) g.notes = notes;
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function addBarrier(id, barrier, { actorId = null } = {}) {
    if (!barrier?.barrier) throw new MissingFieldError(['barrier']);
    const doc = await transitionModel.findById(id);
    if (!doc) throw new NotFoundError('Transition assessment not found');
    doc.barriers.push({
      domain: barrier.domain || null,
      barrier: barrier.barrier,
      mitigationPlan: barrier.mitigationPlan || null,
    });
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function findTransitionAssessmentById(id) {
    const doc = await transitionModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listTransitionAssessments({
    beneficiaryId = null,
    branchId = null,
    status = null,
    targetTransition = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (targetTransition) filter.targetTransition = targetTransition;
    return transitionModel.find(filter).sort({ assessedAt: -1 }).skip(skip).limit(limit);
  }

  async function beneficiaryActiveTransition(beneficiaryId) {
    const rows = await transitionModel
      .find({
        beneficiaryId,
        deleted_at: null,
        status: { $in: ['draft', 'in_progress', 'completed'] },
      })
      .sort({ assessedAt: -1 })
      .limit(1);
    return rows[0] || null;
  }

  // ═════════════════════════════════════════════════════════════════
  // IADL
  // ═════════════════════════════════════════════════════════════════

  async function administerIadl(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'domainScores'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);

    // domainScores may come as [{domain, score}, ...] OR as raw number[] in canonical order.
    let scores;
    if (Array.isArray(data.domainScores) && data.domainScores.every(x => typeof x === 'number')) {
      scores = data.domainScores;
    } else {
      // Map object form back to canonical order by IADL_DOMAIN_CODES.
      const map = new Map();
      for (const d of data.domainScores || []) {
        map.set(d.domain, d.score);
      }
      scores = registry.IADL_DOMAIN_CODES.map(code => {
        if (!map.has(code)) {
          throw new MissingFieldError([`domainScores[${code}]`]);
        }
        return map.get(code);
      });
    }

    let scored;
    try {
      scored = registry.scoreIadl(scores);
    } catch (err) {
      throw new MissingFieldError([`domainScores (${err.message})`]);
    }

    // Persist in object-array form for readability
    const domainScores = registry.IADL_DOMAIN_CODES.map((code, i) => ({
      domain: code,
      score: scores[i],
    }));

    const doc = await iadlModel.create({
      ...data,
      domainScores,
      totalScore: scored.total,
      band: scored.band,
      recommendedAction: scored.action,
      assessedAt: data.assessedAt || now(),
      assessedBy: actorId,
      createdBy: actorId,
    });

    await _emit('ops.care.independence.iadl_administered', {
      assessmentId: String(doc._id),
      assessmentNumber: doc.assessmentNumber,
      beneficiaryId: String(doc.beneficiaryId),
      total: doc.totalScore,
      band: doc.band,
    });
    return doc;
  }

  async function findIadlById(id) {
    const doc = await iadlModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listIadl({
    beneficiaryId = null,
    branchId = null,
    band = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;
    if (band) filter.band = band;
    return iadlModel.find(filter).sort({ assessedAt: -1 }).skip(skip).limit(limit);
  }

  async function beneficiaryIadlTrend(beneficiaryId, { limit = 10 } = {}) {
    const rows = await iadlModel
      .find({ beneficiaryId, deleted_at: null })
      .sort({ assessedAt: -1 })
      .limit(limit);
    return {
      series: rows.map(r => ({
        assessmentId: String(r._id),
        at: r.assessedAt,
        total: r.totalScore,
        band: r.band,
      })),
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // COMMUNITY PARTICIPATION
  // ═════════════════════════════════════════════════════════════════

  async function logParticipation(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'activityType', 'occurredAt'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.isValidParticipationType(data.activityType)) {
      throw new MissingFieldError([`activityType (unknown '${data.activityType}')`]);
    }
    if (data.supportLevel && !registry.isValidSupportLevel(data.supportLevel)) {
      throw new MissingFieldError([`supportLevel (unknown '${data.supportLevel}')`]);
    }
    if (data.outcome && !registry.PARTICIPATION_OUTCOMES.includes(data.outcome)) {
      throw new MissingFieldError([`outcome (unknown '${data.outcome}')`]);
    }

    // Snapshot partner name if linked
    let partnerNameSnapshot = null;
    if (data.partnerId && partnerModel) {
      try {
        const p = await partnerModel.findById(data.partnerId);
        if (p && !p.deleted_at) partnerNameSnapshot = p.name;
      } catch (_) {
        /* best-effort snapshot */
      }
    }

    const doc = await participationModel.create({
      ...data,
      occurredAt: new Date(data.occurredAt),
      partnerNameSnapshot: data.partnerNameSnapshot || partnerNameSnapshot,
      createdBy: actorId,
    });

    await _emit('ops.care.independence.participation_logged', {
      logId: String(doc._id),
      logNumber: doc.logNumber,
      beneficiaryId: String(doc.beneficiaryId),
      activityType: doc.activityType,
      partnerId: doc.partnerId ? String(doc.partnerId) : null,
    });
    return doc;
  }

  async function updateParticipation(id, patch, { actorId = null } = {}) {
    const doc = await participationModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Participation log not found');
    for (const [k, v] of Object.entries(patch || {})) {
      if (['_id', 'logNumber', 'beneficiaryId', 'activityType'].includes(k)) continue;
      doc[k] = v;
    }
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function findParticipationById(id) {
    const doc = await participationModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listParticipation({
    beneficiaryId = null,
    branchId = null,
    activityType = null,
    partnerId = null,
    outcome = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;
    if (activityType) filter.activityType = activityType;
    if (partnerId) filter.partnerId = partnerId;
    if (outcome) filter.outcome = outcome;
    return participationModel.find(filter).sort({ occurredAt: -1 }).skip(skip).limit(limit);
  }

  /**
   * Beneficiary participation analytics (last 90 days by default):
   *   - total activities
   *   - by activity type
   *   - by support level distribution
   *   - avg satisfaction
   *   - % positive outcomes
   */
  async function beneficiaryParticipationAnalytics(beneficiaryId, { windowDays = 90 } = {}) {
    const since = new Date(Date.now() - windowDays * 86400000);
    const rows = await participationModel.find({
      beneficiaryId,
      deleted_at: null,
      occurredAt: { $gte: since },
    });
    const byType = {};
    const bySupport = {};
    let satSum = 0,
      satCount = 0;
    let positive = 0;
    for (const r of rows) {
      byType[r.activityType] = (byType[r.activityType] || 0) + 1;
      const sl = r.supportLevel || 'moderate';
      bySupport[sl] = (bySupport[sl] || 0) + 1;
      if (typeof r.beneficiarySatisfaction === 'number') {
        satSum += r.beneficiarySatisfaction;
        satCount++;
      }
      if (r.outcome === 'positive' || r.outcome === 'very_positive') positive++;
    }
    return {
      beneficiaryId: String(beneficiaryId),
      windowDays,
      total: rows.length,
      byActivityType: byType,
      bySupportLevel: bySupport,
      avgSatisfaction: satCount ? Math.round((satSum / satCount) * 10) / 10 : null,
      positiveOutcomePct: rows.length > 0 ? Math.round((positive / rows.length) * 1000) / 10 : null,
      generatedAt: now(),
    };
  }

  return {
    // Transition Readiness
    createTransitionAssessment,
    scoreTransitionDomain,
    transitionAssessmentStatus,
    completeTransitionAssessment,
    supersedeTransitionAssessment,
    cancelTransitionAssessment,
    addGoal,
    updateGoal,
    addBarrier,
    findTransitionAssessmentById,
    listTransitionAssessments,
    beneficiaryActiveTransition,
    // IADL
    administerIadl,
    findIadlById,
    listIadl,
    beneficiaryIadlTrend,
    // Participation
    logParticipation,
    updateParticipation,
    findParticipationById,
    listParticipation,
    beneficiaryParticipationAnalytics,
  };
}

module.exports = {
  createIndependenceService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
};
