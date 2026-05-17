'use strict';

/**
 * insights.service.js — Wave 18.
 *
 * Insight document lifecycle: upsert (dedup-aware), feedback
 * (confirm/dismiss/note), state transitions, and the auto-promote
 * bridge into the Alert engine for critical-severity insights.
 *
 * Designed in lock-step with `alerts/workflow.service.js` — same
 * factory pattern, same idempotency contract, same audit-log
 * integration. The two services don't import each other; the
 * bridge crosses through `promoteCriticalToAlert()` which takes a
 * caller-supplied callback so this file stays Mongo-only.
 */

const crypto = require('crypto');
const DefaultInsightModel = require('./insight.model');

function nowDate() {
  return new Date();
}

/**
 * Compute a stable SHA-1 over the canonical representation of an
 * input snapshot. Generators call this to populate
 * `source.inputDigest`; the service uses the same digest in dedup
 * lookups so the same input never produces two live insights.
 */
function computeInputDigest(input) {
  const json = JSON.stringify(input, Object.keys(input || {}).sort());
  return crypto.createHash('sha1').update(json).digest('hex');
}

/**
 * @param {object} opts
 *   - insightModel: defaults to canonical model
 *   - auditLogger:  optional `{log(entry)}` PDPL Art.13 integration
 *   - logger:       console-compatible
 *   - promoteToAlert: optional async (insight) => alertDoc.
 *                     Called automatically for critical-severity
 *                     insights. When absent, the insight stays a
 *                     "soft alert" — visible in the feed, escalation
 *                     handled by ops manually.
 */
function createInsightsService({
  insightModel = DefaultInsightModel,
  auditLogger = null,
  logger = console,
  promoteToAlert = null,
} = {}) {
  function model() {
    return insightModel.model || insightModel;
  }

  async function audit(action, ctx, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: ctx?.userId || null,
        actorRole: ctx?.role || null,
        entityType: 'Insight',
        entityId: metadata?.insightId || null,
        ipAddress: ctx?.ip || null,
        metadata: metadata || {},
      });
    } catch (err) {
      logger.warn && logger.warn(`[insights] audit ${action}: ${err.message}`);
    }
  }

  /**
   * Upsert an insight produced by a generator. Dedup contract:
   *
   *   (generatorId, inputDigest)
   *
   * If a live (state=active OR confirmed) insight with the same
   * tuple already exists, we return it unchanged. This prevents
   * the same EWMA spike from spawning duplicate insights every
   * tick while the underlying condition persists.
   *
   * When the existing insight has expired, we recreate fresh —
   * the underlying signal has evolved.
   */
  async function upsertInsight(payload) {
    if (!payload || !payload.source || !payload.source.generatorId || !payload.source.inputDigest) {
      return { ok: false, reason: 'INVALID_PAYLOAD' };
    }

    const Model = model();
    const existing = await Model.findOne({
      'source.generatorId': payload.source.generatorId,
      'source.inputDigest': payload.source.inputDigest,
      state: { $in: ['active', 'confirmed'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: nowDate() } }],
    });

    if (existing) {
      return { ok: true, insight: existing, noop: true, deduped: true };
    }

    let doc;
    try {
      doc = await Model.create({
        ...payload,
        generatedAt: payload.generatedAt || nowDate(),
        state: 'active',
      });
    } catch (err) {
      // The pre-save validate hook throws on G-guarantee violations.
      // Map back to a structured failure so generators can log
      // without throwing through the whole tick.
      return { ok: false, reason: 'VALIDATION_FAILED', message: err.message };
    }

    // Critical-severity insights auto-promote into the Alert engine
    // so they get the escalation + notification pipeline.
    if (doc.severity === 'critical' && typeof promoteToAlert === 'function') {
      try {
        const alert = await promoteToAlert(doc);
        if (alert && alert._id) {
          doc.promotedToAlertId = alert._id;
          await doc.save();
        }
      } catch (err) {
        logger.warn && logger.warn(`[insights] promote-to-alert failed: ${err.message}`);
      }
    }

    await audit('insight.created', null, {
      insightId: doc._id,
      kind: doc.kind,
      severity: doc.severity,
      generatorId: doc.source.generatorId,
      promotedToAlertId: doc.promotedToAlertId,
    });

    return { ok: true, insight: doc };
  }

  /**
   * Confirm an insight ("I acted on it"). Append to feedback +
   * audit; the insight stays visible but tagged so generator
   * scoreboards can reward useful output.
   */
  async function confirmInsight({ insightId, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    const Model = model();
    const insight = await Model.findById(insightId);
    if (!insight) return { ok: false, reason: 'NOT_FOUND' };

    // Idempotent: don't double-count the same user.
    const already = (insight.feedback.confirmedBy || []).some(
      id => String(id) === String(actor.userId)
    );
    if (already) return { ok: true, insight, noop: true };

    insight.feedback.confirmedBy.push(actor.userId);
    insight.feedback.confirmCount = (insight.feedback.confirmCount || 0) + 1;
    insight.state = 'confirmed';
    await insight.save();

    await audit('insight.confirm', actor, { insightId, kind: insight.kind });
    return { ok: true, insight };
  }

  /**
   * Dismiss an insight with a reason code. Reason codes drive
   * generator quality metrics (high noise/duplicate/wrong-target
   * rate flags the generator for review).
   */
  async function dismissInsight({ insightId, reasonCode, note, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    const ALLOWED = ['acted-on', 'noise', 'duplicate', 'wrong-target', 'not-applicable', 'other'];
    if (!ALLOWED.includes(reasonCode)) {
      return { ok: false, reason: 'INVALID_REASON_CODE' };
    }
    const Model = model();
    const insight = await Model.findById(insightId);
    if (!insight) return { ok: false, reason: 'NOT_FOUND' };

    // Dismiss is multi-action — a user can dismiss as 'noise' then
    // later add a clarification note. We append rather than dedup.
    insight.feedback.dismissedBy.push(actor.userId);
    insight.feedback.dismissCount = (insight.feedback.dismissCount || 0) + 1;
    insight.feedback.dismissReasons.push({
      userId: actor.userId,
      reasonCode,
      note: typeof note === 'string' ? note.slice(0, 500) : null,
      at: nowDate(),
    });
    insight.state = 'dismissed';
    await insight.save();

    await audit('insight.dismiss', actor, { insightId, kind: insight.kind, reasonCode });
    return { ok: true, insight };
  }

  /**
   * Append a user comment to the insight thread. Does NOT change
   * state — comments are purely additive context.
   */
  async function addNote({ insightId, text, actor = {} }) {
    if (!actor.userId) return { ok: false, reason: 'ACTOR_REQUIRED' };
    if (typeof text !== 'string') return { ok: false, reason: 'NOTE_TEXT_REQUIRED' };
    const trimmed = text.trim();
    if (trimmed.length < 1) return { ok: false, reason: 'NOTE_TEXT_REQUIRED' };
    if (trimmed.length > 2000) return { ok: false, reason: 'NOTE_TEXT_TOO_LONG' };

    const Model = model();
    const insight = await Model.findById(insightId);
    if (!insight) return { ok: false, reason: 'NOT_FOUND' };

    insight.feedback.userNotes.push({
      userId: actor.userId,
      text: trimmed,
      at: nowDate(),
    });
    await insight.save();

    await audit('insight.note', actor, { insightId, kind: insight.kind });
    return { ok: true, insight };
  }

  /**
   * Mark an insight as resolved when the underlying condition
   * cleared (e.g. generator's next tick didn't re-emit it). The
   * generator's `recomputeAndCloseIfStale` path uses this.
   */
  async function markResolved({ insightId, actor = null }) {
    const Model = model();
    const insight = await Model.findById(insightId);
    if (!insight) return { ok: false, reason: 'NOT_FOUND' };
    if (insight.state === 'resolved') return { ok: true, insight, noop: true };

    insight.state = 'resolved';
    insight.resolvedAt = nowDate();
    await insight.save();

    await audit('insight.resolve', actor || {}, { insightId, kind: insight.kind });
    return { ok: true, insight };
  }

  /**
   * Generator-quality scoreboard. Returns confirm/dismiss ratios
   * grouped by generatorId — used by the admin "intelligence
   * health" page to flag low-quality generators for review.
   */
  async function generatorScoreboard() {
    const Model = model();
    const rows = await Model.aggregate([
      {
        $group: {
          _id: '$source.generatorId',
          totalInsights: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $gt: ['$feedback.confirmCount', 0] }, 1, 0] } },
          dismissed: { $sum: { $cond: [{ $gt: ['$feedback.dismissCount', 0] }, 1, 0] } },
          dismissedNoise: {
            $sum: {
              $size: {
                $filter: {
                  input: '$feedback.dismissReasons',
                  as: 'r',
                  cond: { $eq: ['$$r.reasonCode', 'noise'] },
                },
              },
            },
          },
        },
      },
      { $sort: { totalInsights: -1 } },
    ]);
    return rows.map(r => {
      const total = r.totalInsights || 1;
      return {
        generatorId: r._id,
        totalInsights: r.totalInsights,
        confirmRate: r.confirmed / total,
        dismissRate: r.dismissed / total,
        noiseRate: r.dismissedNoise / total,
        // Trust score: confirms net of noise, in [0, 1].
        trustScore: Math.max(0, Math.min(1, (r.confirmed - r.dismissedNoise) / total)),
      };
    });
  }

  return {
    upsertInsight,
    confirmInsight,
    dismissInsight,
    addNote,
    markResolved,
    generatorScoreboard,
    // Exposed for generators that want to dedup before building
    // the full payload.
    computeInputDigest,
  };
}

module.exports = { createInsightsService, computeInputDigest };
