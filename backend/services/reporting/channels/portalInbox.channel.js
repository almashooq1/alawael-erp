/**
 * portalInbox.channel.js — reporting-engine adapter for the secure
 * portal inbox.
 *
 * Phase 10 Commit 2.
 *
 * The portal inbox does NOT re-publish the content — the content lives
 * in the artifact store (PDF/HTML on S3 or filesystem). This adapter
 * just:
 *   1. Persists/updates the artifact reference (if the caller hasn't
 *      already) through the injected `artifactStore.store(payload)`.
 *   2. Returns the artifact URI + access token so the engine can write
 *      it to `ReportDelivery.artifactUri`.
 *
 * The portal UI queries `ReportDelivery` directly, filtered by
 * recipientId; there's no push needed. Read receipts are flipped when
 * the portal calls `DELETE /reports/inbox/:id/seen`.
 */

'use strict';

function createPortalInboxChannel({ artifactStore, logger = console } = {}) {
  if (!artifactStore || typeof artifactStore.store !== 'function') {
    throw new Error('portalInbox.channel: artifactStore.store required');
  }
  return {
    name: 'portal_inbox',
    async send(payload, recipients) {
      if (!recipients || !recipients.length) {
        return { success: false, error: 'no recipients' };
      }
      try {
        // Store-once per payload; the portal reads the same artifact
        // for every recipient via the ledger row.
        const artifact = await artifactStore.store({
          reportId: payload.reportId,
          instanceKey: payload.instanceKey,
          confidentiality: payload.confidentiality,
          locale: payload.locale,
          subject: payload.subject,
          bodyHtml: payload.bodyHtml,
          attachments: payload.attachments || [],
        });
        if (!artifact || !artifact.uri) {
          return { success: false, error: 'artifactStore returned no uri' };
        }
        return {
          success: true,
          providerMessageId: artifact.id || artifact.uri,
          artifactUri: artifact.uri,
        };
      } catch (err) {
        logger.warn && logger.warn(`portalInbox.channel send failed: ${err.message}`);
        return { success: false, error: err.message };
      }
    },
  };
}

module.exports = { createPortalInboxChannel };
