'use strict';

/**
 * digitalAssessmentPdf.service.js — professional bilingual PDF for one
 * standardized-assessment administration. Builds on the W558 buildReport
 * envelope (digitalAssessment.service) and renders a tailored A4 layout
 * via pdfkit, using the bundled Noto Naskh Arabic font (assets/fonts) for
 * correct Arabic shaping — the same font infra pdfRenderer expects.
 *
 * Two audiences (same as buildReport):
 *   'clinical' — score box + bands + comparison + item-level table +
 *                version pinning + assessor + observations.
 *   'family'   — jargon-free: score box + bands + plain-language action.
 *
 * Returns a Buffer (application/pdf). The route streams it as a download.
 */

const { digitalAssessmentService } = require('./digitalAssessment.service');
const { findArabicFont } = require('./reporting/renderer/pdfRenderer');

const SEVERITY_FILL = {
  normal: '#e8f5e9',
  mild: '#fff8e1',
  moderate: '#fff3e0',
  severe: '#ffebee',
  critical: '#ffebee',
};

function _fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}

const PURPOSE_AR = {
  baseline: 'خط الأساس',
  progress: 'متابعة',
  periodic: 'دوري',
  discharge: 'الخروج',
  screening: 'فحص',
  research: 'بحثي',
};

/**
 * Render the report object to a PDF Buffer.
 * @param {Object} report  output of digitalAssessmentService.buildReport
 * @param {Object} [deps]  { PDFDocument, fontPath, logger }
 * @returns {Promise<Buffer|null>}
 */
function renderReportPdf(report, deps = {}) {
  let PDFDocument = deps.PDFDocument;
  if (!PDFDocument) {
    try {
      PDFDocument = require('pdfkit');
    } catch (err) {
      (deps.logger || console).warn?.(`digitalAssessmentPdf: pdfkit unavailable — ${err.message}`);
      return Promise.resolve(null);
    }
  }
  const fontPath = deps.fontPath || findArabicFont();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 44,
      info: {
        Title: `${report.measure?.code || 'assessment'} — result sheet`,
        Subject: 'Standardized assessment result',
      },
    });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const FONT = 'body';
    let hasArabic = false;
    if (fontPath) {
      try {
        doc.registerFont(FONT, fontPath);
        hasArabic = true;
      } catch {
        /* fall back to Helvetica */
      }
    }
    const font = () => (hasArabic ? doc.font(FONT) : doc);
    const R = { align: 'right', features: ['rtla'] }; // RTL paragraph
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const measure = report.measure || {};
    const interp = report.interpretation || {};
    const score = report.score || {};

    // ── Title bar ────────────────────────────────────────────────────
    font().fontSize(7).fillColor('#9e9e9e').text('CONFIDENTIAL — سري', R);
    font()
      .fontSize(16)
      .fillColor('#0d1b2a')
      .text(measure.name_ar || measure.code || 'تقرير تقييم', R);
    font()
      .fontSize(9)
      .fillColor('#5c6b7a')
      .text(`${measure.name || ''}${measure.abbreviation ? ' · ' + measure.abbreviation : ''}`, R);
    doc.moveDown(0.4);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#e0e0e0')
      .stroke();
    doc.moveDown(0.5);

    // ── Beneficiary + administration meta ────────────────────────────
    const ben = report.beneficiary || {};
    const app = report.application || {};
    const metaLine = [
      ben.name ? `المستفيد: ${ben.name}` : null,
      ben.fileNumber ? `الملف: ${ben.fileNumber}` : null,
      `التاريخ: ${_fmtDate(app.date)}`,
      `الغرض: ${PURPOSE_AR[app.purpose] || app.purpose || '—'}`,
      app.applicationNumber ? `تطبيق #${app.applicationNumber}` : null,
    ]
      .filter(Boolean)
      .join('   •   ');
    font().fontSize(9).fillColor('#37474f').text(metaLine, R);
    doc.moveDown(0.6);

    // ── Score box ────────────────────────────────────────────────────
    const boxY = doc.y;
    const boxH = 58;
    doc
      .roundedRect(doc.page.margins.left, boxY, pageW, boxH, 6)
      .fillAndStroke(SEVERITY_FILL[interp.severity] || '#f5f5f5', interp.color || '#bdbdbd');
    font()
      .fontSize(28)
      .fillColor('#0d1b2a')
      .text(String(score.value ?? '—'), doc.page.margins.left + 12, boxY + 12, { width: 90 });
    font()
      .fontSize(8)
      .fillColor('#78909c')
      .text(
        score.max != null ? `من ${score.min ?? 0}–${score.max}` : '',
        doc.page.margins.left + 12,
        boxY + 42,
        { width: 90 }
      );
    font()
      .fontSize(14)
      .fillColor(interp.color || '#0d1b2a')
      .text(interp.label_ar || '', doc.page.margins.left + 110, boxY + 14, {
        width: pageW - 122,
        align: 'right',
      });
    font()
      .fontSize(8)
      .fillColor('#607d8b')
      .text(interp.label_en || '', doc.page.margins.left + 110, boxY + 36, {
        width: pageW - 122,
        align: 'right',
      });
    doc.y = boxY + boxH + 12;

    // ── Subscales ────────────────────────────────────────────────────
    if (Array.isArray(score.subscales) && score.subscales.length) {
      font().fontSize(10).fillColor('#0d1b2a').text('النطاقات الفرعية', R);
      doc.moveDown(0.2);
      for (const s of score.subscales) {
        font()
          .fontSize(9)
          .fillColor('#37474f')
          .text(`${s.name_ar || s.key}:  ${s.score}`, R);
      }
      doc.moveDown(0.4);
    }

    // ── Bands ────────────────────────────────────────────────────────
    if (Array.isArray(report.bands) && report.bands.length) {
      font().fontSize(10).fillColor('#0d1b2a').text('نطاقات التفسير', R);
      doc.moveDown(0.2);
      for (const b of report.bands) {
        const mark = b.isCurrent ? '◀ ' : '   ';
        font()
          .fontSize(9)
          .fillColor(b.isCurrent ? b.color || '#000' : '#90a4ae')
          .text(`${mark}${b.label_ar} (${b.minScore}–${b.maxScore})`, R);
      }
      doc.moveDown(0.4);
    }

    if (report.audience === 'family') {
      _renderFamily(doc, font, R, report);
    } else {
      _renderClinical(doc, font, R, pageW, report);
    }

    // ── Footer ───────────────────────────────────────────────────────
    doc.moveDown(0.6);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#eeeeee')
      .stroke();
    doc.moveDown(0.3);
    font()
      .fontSize(7)
      .fillColor('#9e9e9e')
      .text(`صُدِّر: ${_fmtDate(report.generatedAt || new Date())}  ·  منصّة الأوائل للتأهيل`, R);

    doc.end();
  });
}

function _renderFamily(doc, font, R, report) {
  if (report.summary_ar) {
    font().fontSize(11).fillColor('#0d1b2a').text(report.summary_ar, R);
    doc.moveDown(0.3);
  }
  if (report.recommendation_ar) {
    font().fontSize(10).fillColor('#37474f').text(report.recommendation_ar, R);
    doc.moveDown(0.3);
  }
  const cmp = report.comparison;
  if (cmp && cmp.changeFromBaseline != null) {
    font()
      .fontSize(9)
      .fillColor('#607d8b')
      .text(`التغيّر من البداية: ${cmp.changeFromBaseline}   ·   الاتجاه: ${cmp.trend || '—'}`, R);
  }
}

function _renderClinical(doc, font, R, pageW, report) {
  const cmp = report.comparison;
  if (cmp && (cmp.baselineScore != null || cmp.previousScore != null)) {
    font().fontSize(10).fillColor('#0d1b2a').text('المقارنة', R);
    const parts = [
      cmp.baselineScore != null ? `خط الأساس: ${cmp.baselineScore}` : null,
      cmp.previousScore != null ? `السابق: ${cmp.previousScore}` : null,
      cmp.changeFromBaseline != null ? `التغيّر: ${cmp.changeFromBaseline}` : null,
      cmp.trend ? `الاتجاه: ${cmp.trend}` : null,
      cmp.isClinicallySignificant != null
        ? `MCID: ${cmp.isClinicallySignificant ? 'تحقّق' : 'لم يتحقّق'}`
        : null,
    ]
      .filter(Boolean)
      .join('   •   ');
    font().fontSize(9).fillColor('#37474f').text(parts, R);
    doc.moveDown(0.4);
  }

  if (Array.isArray(report.items) && report.items.length) {
    font().fontSize(10).fillColor('#0d1b2a').text('البنود والإجابات', R);
    doc.moveDown(0.2);
    for (const it of report.items) {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const flag = it.atRisk ? '⚑ ' : '';
      const ans = it.responseLabel_ar != null ? it.responseLabel_ar : String(it.response);
      font()
        .fontSize(8.5)
        .fillColor(it.atRisk ? '#c62828' : '#37474f')
        .text(`${flag}${it.number}. ${it.text_ar}  —  ${ans}`, {
          width: pageW,
          align: 'right',
          features: ['rtla'],
        });
    }
    doc.moveDown(0.4);
  }

  if (report.clinicalObservations || report.notes) {
    font().fontSize(10).fillColor('#0d1b2a').text('ملاحظات', R);
    if (report.clinicalObservations)
      font().fontSize(9).fillColor('#37474f').text(report.clinicalObservations, R);
    if (report.notes) font().fontSize(9).fillColor('#37474f').text(report.notes, R);
    doc.moveDown(0.3);
  }

  const vp = report.versionPinned || {};
  const footMeta = [
    report.assessor?.name ? `المُقيّم: ${report.assessor.name}` : null,
    vp.algorithmVersion ? `إصدار المحرّك: ${vp.algorithmVersion}` : null,
    vp.measureVersion ? `إصدار المقياس: ${vp.measureVersion}` : null,
  ]
    .filter(Boolean)
    .join('   •   ');
  if (footMeta) font().fontSize(8).fillColor('#78909c').text(footMeta, R);
}

class DigitalAssessmentPdfService {
  /**
   * Build a PDF Buffer for one administration.
   * @param {string} applicationId
   * @param {Object} [opts] { audience: 'clinical'|'family' }
   * @returns {Promise<{ buffer: Buffer, filename: string, measureCode: string }>}
   */
  async buildAdministrationPdf(applicationId, { audience = 'clinical' } = {}) {
    const report = await digitalAssessmentService.buildReport(applicationId, { audience });
    const buffer = await renderReportPdf(report);
    if (!buffer) {
      const e = new Error('PDF generation unavailable (pdfkit missing)');
      e.statusCode = 503;
      throw e;
    }
    const code = report.measure?.code || 'assessment';
    return {
      buffer,
      measureCode: code,
      filename: `${code}-${audience}-${String(report.application?.id || applicationId).slice(-6)}.pdf`,
    };
  }
}

const digitalAssessmentPdfService = new DigitalAssessmentPdfService();
module.exports = { DigitalAssessmentPdfService, digitalAssessmentPdfService, renderReportPdf };
