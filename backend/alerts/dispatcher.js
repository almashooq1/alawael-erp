/**
 * AlertDispatcher — glue between the smart-alerts engine, persistence,
 * and the notifications layer.
 *
 * Responsibilities:
 *   - Run the engine.
 *   - For each `raised` finding, upsert an Alert doc (by ruleId+key).
 *   - Dispatch notifications via injected channels.
 *   - For each `resolved` finding, mark the Alert resolved.
 *
 * Channels are injected so we stay decoupled from the existing
 * email/SMS/WhatsApp services (they'll be wired at the app boot).
 *
 * Dispatcher is safe to call repeatedly (idempotent on persistence +
 * deduped at the engine layer for notifications).
 */

'use strict';

/**
 * @typedef {Object} NotificationChannel
 * @property {string} name
 * @property {(alert: object, recipients: Array) => Promise<{success: boolean, error?: string}>} send
 */

/**
 * @typedef {Object} RecipientResolver
 * @property {(alert: object) => Promise<Array<{id: any, channels: string[]}>>} resolve
 */

class AlertDispatcher {
  /**
   * @param {Object} deps
   * @param {object} deps.engine  AlertsEngine instance
   * @param {object} deps.AlertModel  Mongoose model (model proxy from alert.model.js)
   * @param {Record<string, NotificationChannel>} [deps.channels]
   * @param {RecipientResolver} [deps.recipients]
   * @param {object} [deps.logger]
   */
  constructor({ engine, AlertModel, channels = {}, recipients, logger = console }) {
    if (!engine) throw new Error('AlertDispatcher: engine required');
    if (!AlertModel) throw new Error('AlertDispatcher: AlertModel required');
    this.engine = engine;
    this.AlertModel = AlertModel;
    this.channels = channels;
    this.recipients = recipients;
    this.logger = logger;
  }

  /**
   * One pass: run engine, persist, notify.
   * @param {object} ctx engine ctx (models, now())
   * @returns {Promise<{raised: number, resolved: number, notified: number, errors: string[]}>}
   */
  async tick(ctx = {}) {
    const { raised, resolved } = await this.engine.runAll(ctx);
    const errors = [];
    let notified = 0;

    // Persist / upsert raised
    for (const a of raised) {
      try {
        await this.AlertModel.model.updateOne(
          { ruleId: a.ruleId, key: a.key },
          {
            $set: {
              severity: a.severity,
              category: a.category,
              description: a.description,
              message: a.message,
              subject: a.subject,
              branchId: a.branchId,
              lastSeenAt: a.firstSeenAt,
              resolvedAt: null,
            },
            $setOnInsert: { firstSeenAt: a.firstSeenAt },
          },
          { upsert: true }
        );
        const sent = await this._notify(a);
        notified += sent;
      } catch (err) {
        errors.push(`persist/notify failed for ${a.ruleId}/${a.key}: ${err.message}`);
      }
    }

    // Mark resolved
    for (const r of resolved) {
      try {
        const [ruleId, ...rest] = r.compoundKey.split('::');
        const key = rest.join('::');
        await this.AlertModel.model.updateOne(
          { ruleId, key },
          { $set: { resolvedAt: r.resolvedAt } }
        );
      } catch (err) {
        errors.push(`resolve failed for ${r.compoundKey}: ${err.message}`);
      }
    }

    return { raised: raised.length, resolved: resolved.length, notified, errors };
  }

  async _notify(alert) {
    if (!this.recipients) return 0;
    let recipients;
    try {
      recipients = await this.recipients.resolve(alert);
    } catch (err) {
      this.logger.error &&
        this.logger.error(`recipients.resolve failed for ${alert.ruleId}: ${err.message}`);
      return 0;
    }
    if (!recipients || !recipients.length) return 0;

    let count = 0;
    const receipts = [];
    for (const r of recipients) {
      for (const channelName of r.channels || []) {
        const channel = this.channels[channelName];
        if (!channel) continue;
        try {
          const result = await channel.send(alert, [r]);
          receipts.push({
            channel: channelName,
            sentAt: new Date(),
            recipientId: r.id,
            success: !!(result && result.success),
            error: result && result.error,
          });
          if (result && result.success) count++;
        } catch (err) {
          receipts.push({
            channel: channelName,
            sentAt: new Date(),
            recipientId: r.id,
            success: false,
            error: err.message,
          });
        }
      }
    }

    if (receipts.length) {
      try {
        await this.AlertModel.model.updateOne(
          { ruleId: alert.ruleId, key: alert.key },
          { $push: { notificationsSent: { $each: receipts } } }
        );
      } catch (err) {
        // non-fatal
        this.logger.warn && this.logger.warn(`could not persist receipts: ${err.message}`);
      }
    }
    return count;
  }
}

module.exports = { AlertDispatcher };
