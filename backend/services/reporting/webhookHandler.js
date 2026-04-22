/**
 * webhookHandler.js — provider-agnostic webhook processor for
 * delivered / read / bounced / failed notifications from the 3
 * external channels (SendGrid or Mailgun for email, Twilio for SMS,
 * WhatsApp Business for WhatsApp), plus an internal "portal" provider
 * for read-receipts fired by the portal UI.
 *
 * Phase 10 Commit 4.
 *
 * Contract:
 *   - Each provider posts one or more event objects to a dedicated
 *     endpoint; the routes layer marshals them to this handler via
 *     `handleEvents(provider, rawEvents, req?)`.
 *   - Signatures are verified before the raw events reach us; the
 *     routes layer owns signature logic because it needs raw bodies.
 *     This handler assumes trusted input.
 *   - Every event is mapped to a delivery-ledger transition. Missing
 *     deliveries are skipped (not errored) — providers retry webhook
 *     delivery, and a stale message id is noise, not a failure.
 *   - Idempotent: replaying the same event is safe because the ledger
 *     state machine only advances forward along the happy path and
 *     `markRead`/`markDelivered` are set-or-keep.
 *
 * All I/O is through the injected DeliveryModel proxy — tests use a
 * fake with the same shape, same discipline as the rest of the
 * reporting platform.
 */

'use strict';

// ─── Provider event → ledger action maps ──────────────────────────

const SENDGRID_EVENT_MAP = Object.freeze({
  delivered: 'delivered',
  open: 'read',
  click: 'read',
  bounce: 'failed',
  dropped: 'failed',
  deferred: null, // transient, do nothing
  processed: null, // pre-delivery, do nothing
  spamreport: 'failed',
  unsubscribe: null,
});

const MAILGUN_EVENT_MAP = Object.freeze({
  delivered: 'delivered',
  opened: 'read',
  clicked: 'read',
  failed: 'failed',
  rejected: 'failed',
  complained: 'failed',
});

const TWILIO_EVENT_MAP = Object.freeze({
  queued: null,
  sending: null,
  sent: null, // already marked SENT on dispatch
  delivered: 'delivered',
  undelivered: 'failed',
  failed: 'failed',
  read: 'read', // WhatsApp over Twilio
});

const WHATSAPP_EVENT_MAP = Object.freeze({
  sent: null,
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
});

const PORTAL_EVENT_MAP = Object.freeze({
  viewed: 'read',
  downloaded: 'read',
  opened: 'read',
});

const PROVIDER_MAPS = Object.freeze({
  sendgrid: SENDGRID_EVENT_MAP,
  mailgun: MAILGUN_EVENT_MAP,
  twilio: TWILIO_EVENT_MAP,
  whatsapp: WHATSAPP_EVENT_MAP,
  portal: PORTAL_EVENT_MAP,
});

// ─── Per-provider event normalisation ─────────────────────────────

/**
 * Each provider posts a slightly different payload shape; normalise to
 * `{ provider, event, providerMessageId, recipient?, timestamp?, meta }`.
 * Functions are exported so routes / tests can verify mapping in
 * isolation from the handler state machine.
 */
function normaliseSendGrid(raw) {
  // SendGrid posts an array; each item has sg_message_id + event + email.
  return {
    provider: 'sendgrid',
    event: raw.event || '',
    providerMessageId:
      (raw.sg_message_id || '').split('.')[0] || raw['smtp-id'] || raw.message_id || null,
    recipient: raw.email || null,
    timestamp: raw.timestamp ? new Date(raw.timestamp * 1000) : null,
    meta: { reason: raw.reason, status: raw.status, type: raw.type },
  };
}

function normaliseMailgun(raw) {
  // Mailgun posts event-data objects with a `message.headers['message-id']`.
  const ed = raw['event-data'] || raw;
  return {
    provider: 'mailgun',
    event: (ed.event || '').toLowerCase(),
    providerMessageId:
      (ed.message && ed.message.headers && ed.message.headers['message-id']) || ed.id || null,
    recipient: ed.recipient || null,
    timestamp: ed.timestamp ? new Date(ed.timestamp * 1000) : null,
    meta: { reason: ed.reason, severity: ed.severity },
  };
}

function normaliseTwilio(raw) {
  // Twilio posts form-encoded fields; MessageSid + MessageStatus + To.
  return {
    provider: 'twilio',
    event: (raw.MessageStatus || raw.SmsStatus || '').toLowerCase(),
    providerMessageId: raw.MessageSid || null,
    recipient: raw.To || null,
    timestamp: new Date(),
    meta: { errorCode: raw.ErrorCode, errorMessage: raw.ErrorMessage },
  };
}

function normaliseWhatsApp(raw) {
  // WhatsApp Business Cloud API posts a rich payload with entry[].changes[].value.statuses[].
  const out = [];
  const entries = Array.isArray(raw.entry) ? raw.entry : [];
  for (const e of entries) {
    const changes = Array.isArray(e.changes) ? e.changes : [];
    for (const c of changes) {
      const statuses = (c.value && c.value.statuses) || [];
      for (const s of statuses) {
        out.push({
          provider: 'whatsapp',
          event: (s.status || '').toLowerCase(),
          providerMessageId: s.id || null,
          recipient: s.recipient_id || null,
          timestamp: s.timestamp ? new Date(Number(s.timestamp) * 1000) : null,
          meta: { errors: s.errors, conversation: s.conversation },
        });
      }
    }
  }
  // If the raw itself is already a normalized statuses object (e.g. tests
  // send it in the simpler shape), include it.
  if (!out.length && raw.status) {
    out.push({
      provider: 'whatsapp',
      event: String(raw.status).toLowerCase(),
      providerMessageId: raw.id || raw.messageId || null,
      recipient: raw.recipient_id || raw.to || null,
      timestamp: raw.timestamp ? new Date(Number(raw.timestamp) * 1000) : null,
      meta: {},
    });
  }
  return out;
}

function normalisePortal(raw) {
  // Portal posts `{ deliveryId, action, actor, ip, userAgent }` directly.
  return {
    provider: 'portal',
    event: (raw.action || '').toLowerCase(),
    deliveryId: raw.deliveryId || null,
    actor: raw.actor || null,
    ip: raw.ip || null,
    userAgent: raw.userAgent || null,
    timestamp: raw.at ? new Date(raw.at) : new Date(),
    meta: {},
  };
}

// ─── Core handler ─────────────────────────────────────────────────

class WebhookHandler {
  constructor({ DeliveryModel, eventBus, logger = console } = {}) {
    if (!DeliveryModel) throw new Error('WebhookHandler: DeliveryModel required');
    this.DeliveryModel = DeliveryModel;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger;
  }

  /**
   * Process one or more raw provider events.
   * @param {string} provider   one of 'sendgrid'|'mailgun'|'twilio'|'whatsapp'|'portal'
   * @param {Array|Object} raw  raw provider payload (array or single object)
   * @returns {Promise<{ accepted: number, applied: number, skipped: number, errors: string[] }>}
   */
  async handleEvents(provider, raw) {
    const normalised = this._normalise(provider, raw);
    const summary = { accepted: normalised.length, applied: 0, skipped: 0, errors: [] };
    for (const ev of normalised) {
      try {
        const applied = await this._applyEvent(ev);
        if (applied) summary.applied++;
        else summary.skipped++;
      } catch (err) {
        summary.errors.push(`${provider}/${ev.event}: ${err.message}`);
      }
    }
    return summary;
  }

  _normalise(provider, raw) {
    if (!raw) return [];
    if (provider === 'sendgrid') {
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr.map(normaliseSendGrid);
    }
    if (provider === 'mailgun') {
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr.map(normaliseMailgun);
    }
    if (provider === 'twilio') {
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr.map(normaliseTwilio);
    }
    if (provider === 'whatsapp') {
      return normaliseWhatsApp(raw);
    }
    if (provider === 'portal') {
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr.map(normalisePortal);
    }
    throw new Error(`unknown provider ${provider}`);
  }

  async _applyEvent(ev) {
    const map = PROVIDER_MAPS[ev.provider] || {};
    const action = map[ev.event];
    if (!action) return false; // recognised-but-ignored (e.g. sendgrid 'processed')
    const Model = this.DeliveryModel.model || this.DeliveryModel;

    let delivery;
    if (ev.deliveryId) {
      delivery = await Model.findById(ev.deliveryId);
    } else if (ev.providerMessageId) {
      delivery = await Model.findOne({ providerMessageId: ev.providerMessageId });
    }
    if (!delivery) {
      // Known gap: a webhook fired before the dispatcher's save
      // completed, or the message id belongs to a non-reporting flow.
      // Either way: skip, not fail.
      return false;
    }

    // Never regress a terminal state (READ/ESCALATED/CANCELLED).
    if (typeof delivery.isTerminal === 'function' && delivery.isTerminal()) {
      return false;
    }

    const ts = ev.timestamp || new Date();
    if (action === 'delivered') {
      delivery.markDelivered(ts);
    } else if (action === 'read') {
      delivery.markRead(ts);
      // Portal: record access log entry so the accessLog[] is useful.
      if (ev.provider === 'portal' && typeof delivery.recordAccess === 'function') {
        delivery.recordAccess({
          at: ts,
          actor: ev.actor,
          action:
            ev.event === 'downloaded'
              ? 'download'
              : ev.event === 'opened' || ev.event === 'viewed'
                ? 'view'
                : 'view',
          ip: ev.ip,
          userAgent: ev.userAgent,
        });
      }
    } else if (action === 'failed') {
      // Mark failed only if we haven't already recorded a newer SENT.
      if (
        delivery.status === 'SENT' ||
        delivery.status === 'QUEUED' ||
        delivery.status === 'RETRYING'
      ) {
        delivery.markFailed(
          `provider:${ev.provider} reason:${(ev.meta && (ev.meta.reason || ev.meta.errorMessage)) || ev.event}`
        );
      } else {
        return false;
      }
    } else {
      return false;
    }

    if (typeof delivery.save === 'function') {
      await delivery.save();
    }

    const eventName =
      action === 'delivered'
        ? 'report.delivery.delivered'
        : action === 'read'
          ? 'report.delivery.read'
          : 'report.delivery.failed';
    this.eventBus.emit(eventName, {
      deliveryId: String(delivery._id || delivery.id),
      channel: delivery.channel,
      provider: ev.provider,
    });
    return true;
  }
}

module.exports = {
  WebhookHandler,
  PROVIDER_MAPS,
  normaliseSendGrid,
  normaliseMailgun,
  normaliseTwilio,
  normaliseWhatsApp,
  normalisePortal,
};
