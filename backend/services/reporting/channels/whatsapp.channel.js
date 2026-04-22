/**
 * whatsapp.channel.js — reporting-engine adapter over
 * communication/whatsapp-service.
 *
 * Phase 10 Commit 2.
 *
 * The underlying service exposes `sendText(to, text, options)` and
 * `sendDocument(to, url, caption, options)`. For reports:
 *   - short summaries (no PDF attachment) → sendText with a portal link.
 *   - with PDF → sendDocument pointing at the signed download URL.
 *
 * WhatsApp read-receipts fire via webhook (handled in a later commit).
 */

'use strict';

function createWhatsAppChannel({ whatsappService, logger = console } = {}) {
  if (!whatsappService) throw new Error('whatsapp.channel: whatsappService required');
  return {
    name: 'whatsapp',
    async send(payload, recipients) {
      if (payload.confidentiality === 'confidential') {
        return {
          success: false,
          error: 'whatsapp refused for confidential reports',
        };
      }
      const results = [];
      const pdfAttachment = (payload.attachments || []).find(
        a => a && (a.contentType === 'application/pdf' || /\.pdf$/i.test(a.filename || ''))
      );
      for (const r of recipients || []) {
        if (!r || !r.phone) {
          results.push({ recipientId: r && r.id, success: false, error: 'no phone' });
          continue;
        }
        try {
          let out;
          if (pdfAttachment && pdfAttachment.url) {
            out = await whatsappService.sendDocument(
              r.phone,
              pdfAttachment.url,
              payload.subject || pdfAttachment.filename || 'report',
              { filename: pdfAttachment.filename, reportId: payload.reportId }
            );
          } else {
            const text = payload.link
              ? `${payload.subject || ''}\n\n${payload.link}`
              : payload.bodyText || payload.subject || '';
            out = await whatsappService.sendText(r.phone, text, {
              reportId: payload.reportId,
              instanceKey: payload.instanceKey,
            });
          }
          if (out && (out.success === false || out.error)) {
            results.push({
              recipientId: r.id,
              success: false,
              error: out.error || 'whatsapp provider returned failure',
            });
          } else {
            results.push({
              recipientId: r.id,
              success: true,
              providerMessageId:
                (out && (out.messages?.[0]?.id || out.messageId || out.id)) || null,
            });
          }
        } catch (err) {
          logger.warn && logger.warn(`whatsapp.channel send failed: ${err.message}`);
          results.push({ recipientId: r.id, success: false, error: err.message });
        }
      }
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

module.exports = { createWhatsAppChannel };
