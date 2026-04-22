/**
 * renderer/index.js — orchestrates a single `render(report, doc, recipient)`
 * call: picks the HTML template, runs it with a ctx bundle (translator +
 * formatters + recipient), and — when the catalog asks for PDF —
 * produces a PDF Buffer attachment via pdfRenderer.
 *
 * Phase 10 Commit 3.
 *
 * Implements the contract the ReportingEngine already honours:
 *
 *     renderer.render(report, doc, recipient) →
 *       { subject, bodyHtml, bodyText, attachments, link }
 *
 * `attachments` is a list of objects compatible with nodemailer /
 * WhatsApp Business (filename, content Buffer, contentType).
 */

'use strict';

const formatters = require('./formatters');
const { t, getReportKey, has: localeHas } = require('./translator');
const { pickTemplate } = require('./htmlTemplates');
const { buildPdf } = require('./pdfRenderer');

function shouldGeneratePdf(report) {
  const formats = (report && report.formats) || [];
  const channels = (report && report.channels) || [];
  return formats.includes('pdf') || channels.includes('pdf_download');
}

function slugifyForFile(s) {
  return String(s || 'report')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .slice(0, 100);
}

function buildPortalLink({ report, instanceKey, portalBaseUrl }) {
  if (!portalBaseUrl) return null;
  const base = portalBaseUrl.replace(/\/+$/, '');
  const encoded = encodeURIComponent(instanceKey || report.id);
  return `${base}/reports/${encodeURIComponent(report.id)}?i=${encoded}`;
}

/**
 * @param {Object} [deps]
 * @param {(input, deps) => Promise<Buffer|null>} [deps.pdfBuilder]  override buildPdf
 * @param {Object} [deps.pdfDeps]                                   passed to buildPdf
 * @param {string} [deps.portalBaseUrl]
 * @param {Object} [deps.logger]
 */
function createRenderer(deps = {}) {
  const { pdfBuilder = buildPdf, pdfDeps = {}, portalBaseUrl, logger = console } = deps;

  return {
    /**
     * @param {Object} report    catalog entry
     * @param {Object} doc       built JSON document
     * @param {Object} recipient resolver output
     * @returns {Promise<{subject, bodyHtml, bodyText, attachments, link}>}
     */
    async render(report, doc, recipient) {
      const locale =
        (recipient && recipient.locale) || (report && report.locales && report.locales[0]) || 'ar';
      const ctx = {
        report,
        recipient: recipient || {},
        locale,
        formatters,
        t,
        getReportKey,
        localeHas,
      };
      const tmpl = pickTemplate(report && report.id);
      let rendered;
      try {
        rendered = tmpl(doc || {}, ctx) || {};
      } catch (err) {
        logger.warn && logger.warn(`renderer: template threw — ${err.message}`);
        // Last-ditch: flatten the doc into plain text.
        const raw = JSON.stringify(doc || {}).slice(0, 4000);
        rendered = {
          subject: (report && (report.nameEn || report.nameAr)) || 'Report',
          bodyHtml: `<pre>${raw}</pre>`,
          bodyText: raw,
        };
      }

      const link = buildPortalLink({
        report,
        instanceKey: doc && doc.instanceKey,
        portalBaseUrl,
      });

      const attachments = [];
      if (shouldGeneratePdf(report)) {
        try {
          const pdfBuffer = await pdfBuilder(
            {
              subject: rendered.subject,
              bodyHtml: rendered.bodyHtml,
              bodyText: rendered.bodyText,
              locale,
              confidentiality: report.confidentiality,
              recipient,
            },
            pdfDeps
          );
          if (pdfBuffer) {
            const filename = `${slugifyForFile(report.id)}-${slugifyForFile(doc && doc.periodKey)}.pdf`;
            attachments.push({
              filename,
              content: pdfBuffer,
              contentType: 'application/pdf',
            });
          }
        } catch (err) {
          logger.warn && logger.warn(`renderer: PDF build failed — ${err.message}`);
        }
      }

      return {
        subject: rendered.subject,
        bodyHtml: rendered.bodyHtml,
        bodyText: rendered.bodyText,
        attachments,
        link,
      };
    },
  };
}

module.exports = {
  createRenderer,
  shouldGeneratePdf,
  buildPortalLink,
  slugifyForFile,
};
