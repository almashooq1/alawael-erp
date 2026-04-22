/**
 * pdfRenderer.js — pdfkit-based PDF generation for reports.
 *
 * Phase 10 Commit 3.
 *
 * pdfkit is already a backend dependency. This renderer keeps the
 * existing parentReportService pattern: a thin layer over pdfkit that
 * streams to a Buffer. Arabic rendering needs an RTL-capable font — if
 * the font file isn't present at runtime, we fall back to Helvetica so
 * tests pass and English PDFs still work.
 *
 * PDFDocument is injected so unit tests can substitute a fake without
 * pulling pdfkit into the Jest graph.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const DEFAULT_FONT_CANDIDATES = [
  // Preferred Arabic fonts (install via Dockerfile / seed step).
  path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'NotoNaskhArabic-Regular.ttf'),
  path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'Amiri-Regular.ttf'),
  path.join(__dirname, '..', '..', '..', 'fonts', 'NotoNaskhArabic-Regular.ttf'),
];

function findArabicFont(candidates = DEFAULT_FONT_CANDIDATES) {
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {
      /* ignore */
    }
  }
  return null;
}

/**
 * Strip the HTML body down to plain lines for pdfkit. We don't render
 * HTML — the PDF is a parallel, plain-text representation intended for
 * download. For rich PDFs we'd pivot to puppeteer in a future commit.
 */
function htmlToLines(html) {
  if (typeof html !== 'string') return [];
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|h3|li|tr|td|th)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter((l, i, a) => l.length > 0 || (i > 0 && a[i - 1].length > 0));
}

/**
 * Build a PDF Buffer from a rendered HTML-ish document.
 *
 * @param {Object} input
 * @param {string} input.subject
 * @param {string} input.bodyHtml
 * @param {string} [input.bodyText]
 * @param {string} [input.locale]
 * @param {string} [input.confidentiality]
 * @param {Object} [input.recipient]
 * @param {Object} [deps]
 * @param {any}    [deps.PDFDocument]    pdfkit's default export
 * @param {string} [deps.fontPath]        path to an Arabic-capable TTF
 * @param {Object} [deps.logger]
 * @returns {Promise<Buffer|null>}
 */
async function buildPdf(input, deps = {}) {
  const { subject, bodyHtml, bodyText, locale, confidentiality, recipient } = input;
  let PDFDocument = deps.PDFDocument;
  if (!PDFDocument) {
    try {
      PDFDocument = require('pdfkit');
    } catch (err) {
      (deps.logger || console).warn &&
        (deps.logger || console).warn(`pdfRenderer: pdfkit not available — ${err.message}`);
      return null;
    }
  }
  const fontPath = deps.fontPath || findArabicFont();

  return new Promise((resolve, reject) => {
    let doc;
    try {
      doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: { Title: subject || 'report', Subject: subject || 'report' },
      });
    } catch (err) {
      (deps.logger || console).warn &&
        (deps.logger || console).warn(`pdfRenderer: construct failed — ${err.message}`);
      return resolve(null);
    }
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    // Register Arabic font when available; otherwise rely on defaults.
    if (fontPath) {
      try {
        doc.registerFont('arabic', fontPath);
        doc.font('arabic');
      } catch (err) {
        (deps.logger || console).warn &&
          (deps.logger || console).warn(`pdfRenderer: font load failed — ${err.message}`);
      }
    }

    // Header.
    if (confidentiality === 'confidential' || confidentiality === 'restricted') {
      doc
        .fillColor(confidentiality === 'confidential' ? '#b91c1c' : '#b45309')
        .fontSize(10)
        .text(confidentiality.toUpperCase(), { align: locale === 'en' ? 'left' : 'right' });
      doc.moveDown(0.5);
    }
    doc
      .fillColor('#111827')
      .fontSize(16)
      .text(subject || '', {
        align: locale === 'en' ? 'left' : 'right',
      });
    doc.moveDown(0.8);

    // Body — prefer plain text if provided; fall back to stripped HTML.
    const lines =
      bodyText && bodyText.trim().length ? bodyText.split(/\r?\n/) : htmlToLines(bodyHtml);
    doc.fillColor('#1f2937').fontSize(11);
    for (const line of lines) {
      if (!line) {
        doc.moveDown(0.5);
        continue;
      }
      try {
        doc.text(line, { align: locale === 'en' ? 'left' : 'right' });
      } catch (err) {
        doc.text(line);
      }
    }

    // Watermark for confidential.
    if (confidentiality === 'confidential' && recipient && (recipient.id || recipient.email)) {
      const wm = `confidential — ${recipient.email || recipient.id} — ${new Date().toISOString()}`;
      doc
        .fillColor('#fecaca')
        .fontSize(8)
        .text(wm, 48, doc.page.height - 32, { width: doc.page.width - 96 });
    }

    doc.end();
  });
}

module.exports = {
  buildPdf,
  htmlToLines,
  findArabicFont,
  DEFAULT_FONT_CANDIDATES,
};
