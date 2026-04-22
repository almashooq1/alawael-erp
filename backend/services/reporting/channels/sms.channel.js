/**
 * sms.channel.js — reporting-engine adapter over the existing
 * communication/sms-service.
 *
 * Phase 10 Commit 2.
 *
 * SMS is for short notifications only; long report bodies get a secure
 * link instead. Per-channel rate limits are enforced by the underlying
 * sms-service (Twilio/Nexmo/local).
 *
 * Confidential reports must never blast full content over SMS — the
 * catalog invariant test already enforces this, but we enforce again
 * here as a second layer of defense by truncating and forcing a link.
 */

'use strict';

const MAX_SMS_LEN = 160; // single-segment ceiling; providers will concatenate but we prefer short+link

function buildSmsBody(payload) {
  const subject = (payload.subject || '').trim();
  const link = payload.link || payload.portalUrl || null;
  const body = link ? `${subject} — ${link}` : (payload.bodyText || subject || '').trim();
  if (body.length <= MAX_SMS_LEN) return body;
  // truncate, preserve the link (last token) if present
  if (link && body.endsWith(link)) {
    const headRoom = MAX_SMS_LEN - link.length - 4; // " — "
    if (headRoom > 10) {
      return `${subject.slice(0, headRoom)}… ${link}`;
    }
    return link.slice(0, MAX_SMS_LEN);
  }
  return `${body.slice(0, MAX_SMS_LEN - 1)}…`;
}

function createSmsChannel({ smsService, logger = console } = {}) {
  if (!smsService) throw new Error('sms.channel: smsService required');
  return {
    name: 'sms',
    async send(payload, recipients) {
      if (payload.confidentiality === 'confidential') {
        return {
          success: false,
          error: 'sms refused for confidential reports',
        };
      }
      const results = [];
      for (const r of recipients || []) {
        if (!r || !r.phone) {
          results.push({ recipientId: r && r.id, success: false, error: 'no phone' });
          continue;
        }
        try {
          const body = buildSmsBody(payload);
          const out = await smsService.send({
            to: r.phone,
            message: body,
            type: 'notification',
            metadata: {
              reportId: payload.reportId,
              instanceKey: payload.instanceKey,
              locale: payload.locale,
            },
          });
          if (out && (out.success === false || out.error)) {
            results.push({
              recipientId: r.id,
              success: false,
              error: out.error || 'sms provider returned failure',
            });
          } else {
            results.push({
              recipientId: r.id,
              success: true,
              providerMessageId: (out && (out.smsId || out.messageId || out.sid)) || null,
            });
          }
        } catch (err) {
          logger.warn && logger.warn(`sms.channel send failed: ${err.message}`);
          results.push({ recipientId: r.id, success: false, error: err.message });
        }
      }
      // Aggregate: success if any recipient succeeded.
      const succeeded = results.filter(x => x.success);
      if (!results.length) return { success: false, error: 'no recipients' };
      if (!succeeded.length) {
        return {
          success: false,
          error: results
            .map(x => x.error)
            .filter(Boolean)
            .join('; '),
        };
      }
      return {
        success: true,
        providerMessageId: succeeded[0].providerMessageId,
        partial: succeeded.length !== results.length,
        results,
      };
    },
  };
}

module.exports = { createSmsChannel, buildSmsBody, MAX_SMS_LEN };
