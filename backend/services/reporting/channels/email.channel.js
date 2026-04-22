/**
 * email.channel.js — reporting-engine adapter over the existing
 * communication/email-service.
 *
 * Phase 10 Commit 2.
 *
 * The underlying email service exposes `send({ to, subject, html, text,
 * attachments })` and returns a result object we wrap into the channel
 * contract `{ success, providerMessageId?, error? }`.
 *
 * Exported shape: `{ name, async send(payload, recipients) }` — same
 * contract used by alerts/dispatcher.js so both layers share adapters.
 */

'use strict';

function createEmailChannel({ emailService, logger = console } = {}) {
  if (!emailService) throw new Error('email.channel: emailService required');
  return {
    name: 'email',
    async send(payload, recipients) {
      const to = (recipients || [])
        .map(r => r && r.email)
        .filter(v => typeof v === 'string' && v.length);
      if (!to.length) return { success: false, error: 'no email recipient' };
      try {
        const result = await emailService.send({
          to,
          subject: payload.subject || '(no subject)',
          html: payload.bodyHtml,
          text: payload.bodyText,
          attachments: payload.attachments || [],
          metadata: {
            reportId: payload.reportId,
            instanceKey: payload.instanceKey,
            confidentiality: payload.confidentiality,
            locale: payload.locale,
          },
        });
        if (result && (result.success === false || result.error)) {
          return {
            success: false,
            error: result.error || 'email provider returned failure',
          };
        }
        return {
          success: true,
          providerMessageId: (result && (result.emailId || result.messageId || result.id)) || null,
        };
      } catch (err) {
        logger.warn && logger.warn(`email.channel send failed: ${err.message}`);
        return { success: false, error: err.message };
      }
    },
  };
}

module.exports = { createEmailChannel };
