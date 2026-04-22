/**
 * pdfDownload.channel.js — reporting-engine adapter for ad-hoc PDF
 * download links.
 *
 * Phase 10 Commit 2.
 *
 * Used when the catalog declares `pdf_download` as a channel. Creates
 * (or reuses) a short-lived signed URL pointing at the rendered PDF
 * artifact, stores it in the delivery ledger, and returns success.
 *
 * The engine pairs this with an in-app or email notification to
 * actually deliver the link — this adapter only mints the URL.
 */

'use strict';

function createPdfDownloadChannel({
  artifactStore,
  urlSigner,
  ttlSeconds = 7 * 24 * 3600, // 7 days default
  logger = console,
} = {}) {
  if (!artifactStore || typeof artifactStore.store !== 'function') {
    throw new Error('pdfDownload.channel: artifactStore.store required');
  }
  if (!urlSigner || typeof urlSigner.sign !== 'function') {
    throw new Error('pdfDownload.channel: urlSigner.sign required');
  }
  return {
    name: 'pdf_download',
    async send(payload, recipients) {
      if (!recipients || !recipients.length) {
        return { success: false, error: 'no recipients' };
      }
      try {
        const pdf = (payload.attachments || []).find(
          a => a && (a.contentType === 'application/pdf' || /\.pdf$/i.test(a.filename || ''))
        );
        const artifact = pdf
          ? await artifactStore.store({
              reportId: payload.reportId,
              instanceKey: payload.instanceKey,
              confidentiality: payload.confidentiality,
              filename: pdf.filename,
              content: pdf.content,
              contentType: 'application/pdf',
            })
          : null;
        const artifactUri = (artifact && artifact.uri) || payload.artifactUri || null;
        if (!artifactUri) {
          return { success: false, error: 'no pdf artifact available' };
        }
        const signed = await urlSigner.sign({
          uri: artifactUri,
          ttlSeconds,
          recipients: (recipients || []).map(r => r.id),
          reportId: payload.reportId,
        });
        return {
          success: true,
          providerMessageId: (signed && signed.id) || artifactUri,
          artifactUri,
          url: signed && signed.url,
          expiresAt: signed && signed.expiresAt,
        };
      } catch (err) {
        logger.warn && logger.warn(`pdfDownload.channel send failed: ${err.message}`);
        return { success: false, error: err.message };
      }
    },
  };
}

module.exports = { createPdfDownloadChannel };
