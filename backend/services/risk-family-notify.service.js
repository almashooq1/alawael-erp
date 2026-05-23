'use strict';

/**
 * risk-family-notify.service.js — Wave 293
 *
 * Operational signal that the family of a beneficiary should be
 * contacted by the care coordinator when the beneficiary crosses
 * into CRITICAL risk for the first time within a sweep window.
 *
 * Privacy stance: this service does NOT post into the family-facing
 * messaging thread directly. Instead it raises an AiAlert with
 * neutral Arabic wording (no risk score, no clinical detail, no
 * factor list). The operational dashboard surfaces this alert so a
 * care coordinator decides how / when to engage the family using
 * whatever channel is appropriate (call, in-person visit, message).
 *
 * Idempotency: at most one alert per (beneficiary, sweepRunId)
 * tuple. Re-running the sweeper or replaying the alert hook will
 * not duplicate the notification.
 */

const REASON = {
  NOT_FIRST_CRITICAL: 'NOT_FIRST_CRITICAL',
  AI_ALERT_MODEL_MISSING: 'AI_ALERT_MODEL_MISSING',
  ALREADY_NOTIFIED: 'ALREADY_NOTIFIED',
  CREATE_FAILED: 'CREATE_FAILED',
  BENEFICIARY_REQUIRED: 'BENEFICIARY_REQUIRED',
  FAMILY_NOTIFICATION_RAISED: 'FAMILY_NOTIFICATION_RAISED',
};

/**
 * Decide whether a family notification is warranted based on the
 * risk profile + tier transition emitted by the sweeper.
 * @param {Object} args
 * @param {string} [args.tierDelta]
 * @param {Object} [args.profile]
 * @returns {boolean}
 */
function shouldNotify({ tierDelta, profile } = {}) {
  if (!profile || profile.overallTier !== 'critical') return false;
  // Notify only on the *first* time the beneficiary enters critical
  // within this sweep window — either no prior snapshot ('first') or
  // an escalation from a lower tier ('escalated').
  return tierDelta === 'first' || tierDelta === 'escalated';
}

/**
 * Build the neutral Arabic message used in the AiAlert. Intentionally
 * does NOT mention risk score / tier / factors.
 * @param {string} [name]
 * @returns {string}
 */
function buildMessage(name) {
  const who = (name && String(name).trim()) || 'المستفيد';
  return `يُرجى التواصل مع أسرة ${who} لمتابعة آخر مستجدات الخطة العلاجية`;
}

class RiskFamilyNotifyService {
  /**
   * @param {Object} deps
   * @param {*}      deps.AiAlertModel
   * @param {Object} [deps.logger]
   */
  constructor(deps = {}) {
    this.AiAlert = deps.AiAlertModel || null;
    this.logger = deps.logger || console;
  }

  /**
   * Notify hook invoked from the risk sweeper. Returns a structured
   * result describing what (if anything) was created. Never throws —
   * the sweeper composition pattern relies on this being safe to call
   * inside a try/catch wrapper.
   * @param {Object} ctx
   * @param {Object} ctx.ben    Beneficiary doc (must include _id; may include fullName).
   * @param {Object} ctx.profile
   * @param {string} ctx.tierDelta
   * @param {string} [ctx.sweepRunId]
   * @param {Date}   [ctx.now=new Date()]
   * @returns {Promise<{notified:boolean, reason:string, alertId?:any}>}
   */
  async notifyIfFirstCritical(ctx = {}) {
    const { ben, profile, tierDelta, sweepRunId, now = new Date() } = ctx;

    if (!ben || !ben._id) return { notified: false, reason: REASON.BENEFICIARY_REQUIRED };
    if (!shouldNotify({ tierDelta, profile }))
      return { notified: false, reason: REASON.NOT_FIRST_CRITICAL };
    if (!this.AiAlert) return { notified: false, reason: REASON.AI_ALERT_MODEL_MISSING };

    // Idempotency: same (beneficiary, sweepRunId) yields a single alert.
    if (sweepRunId) {
      try {
        const existing = await this.AiAlert.findOne({
          target_type: 'beneficiary',
          target_id: ben._id,
          alert_type: 'family_notification_due',
          'data.sweepRunId': sweepRunId,
        })
          .select('_id')
          .lean();
        if (existing) {
          return { notified: false, reason: REASON.ALREADY_NOTIFIED, alertId: existing._id };
        }
      } catch (err) {
        this.logger.warn('[family-notify] idempotency check failed', {
          err: err && err.message,
        });
      }
    }

    try {
      const created = await this.AiAlert.create({
        alert_type: 'family_notification_due',
        severity: 'warning',
        target_type: 'beneficiary',
        target_id: ben._id,
        message: buildMessage(ben.fullName),
        data: {
          code: 'FAMILY_NOTIFICATION_DUE',
          sweepRunId: sweepRunId || null,
          tierDelta,
          // Intentionally NO score / tier / factors — privacy boundary.
        },
        created_at: now,
      });
      return {
        notified: true,
        reason: REASON.FAMILY_NOTIFICATION_RAISED,
        alertId: created && created._id,
      };
    } catch (err) {
      this.logger.warn('[family-notify] create failed', { err: err && err.message });
      return { notified: false, reason: REASON.CREATE_FAILED };
    }
  }
}

module.exports = { RiskFamilyNotifyService, shouldNotify, buildMessage, REASON };
