/**
 * Blockchain Certificate PDF — مولّد شهادات PDF
 *
 * Streams a single-page A4 landscape certificate with:
 *   • Bilingual title / recipient (Arabic + English)
 *   • Decorative double-border + corner ornaments
 *   • QR code (lower-left) → public verification URL
 *   • Tamper-evident footer: cert hash, merkle root, tx hash, block, network
 *
 * We use pdfkit (already a dep) and qrcode → PNG buffer.
 * Arabic glyph shaping: pdfkit's built-in shaper handles RTL adequately for
 * certificate headlines; for production we'd embed an Arabic-friendly font
 * (Amiri / NotoNaskhArabic). Path is configurable via BLOCKCHAIN_PDF_FONT_AR.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const ORG_AR = process.env.BLOCKCHAIN_PDF_ORG_NAME_AR || 'مراكز الأوائل للرعاية النهارية';
const ORG_EN = process.env.BLOCKCHAIN_PDF_ORG_NAME_EN || 'Al-Awael Day Care Centers';

function resolveAsset(envVar) {
  const p = process.env[envVar];
  if (!p) return null;
  try {
    const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    return fs.existsSync(abs) ? abs : null;
  } catch {
    return null;
  }
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

function shorten(hash, head = 10, tail = 6) {
  if (!hash || hash.length <= head + tail + 2) return hash || '—';
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

async function buildQrPngDataUrl(text) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 220,
    color: { dark: '#0a2540', light: '#ffffff' },
  });
}

async function generateCertificatePdf(cert, { verifyUrl } = {}) {
  if (!cert) throw new Error('generateCertificatePdf: cert required');

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 36, left: 36, right: 36, bottom: 36 },
    info: {
      Title: cert.certificateNumber || 'Certificate',
      Author: ORG_EN,
      Subject: cert.title?.en || cert.title?.ar || 'Certificate',
    },
  });

  // Optional Arabic font
  const arFont = resolveAsset('BLOCKCHAIN_PDF_FONT_AR');
  if (arFont) doc.registerFont('AR', arFont);

  const buffers = [];
  doc.on('data', b => buffers.push(b));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });

  const W = doc.page.width;
  const H = doc.page.height;
  const margin = 28;

  // Outer border
  doc
    .lineWidth(2)
    .strokeColor('#0a2540')
    .rect(margin, margin, W - margin * 2, H - margin * 2)
    .stroke();
  // Inner border
  doc
    .lineWidth(0.6)
    .strokeColor('#c9a227')
    .rect(margin + 8, margin + 8, W - (margin + 8) * 2, H - (margin + 8) * 2)
    .stroke();

  // Corner ornaments
  const ornament = (x, y) => {
    doc.lineWidth(0.8).strokeColor('#c9a227');
    doc
      .moveTo(x, y)
      .lineTo(x + 18, y)
      .stroke();
    doc
      .moveTo(x, y)
      .lineTo(x, y + 18)
      .stroke();
  };
  ornament(margin + 14, margin + 14);
  ornament(W - margin - 14 - 18, margin + 14);
  ornament(margin + 14, H - margin - 14);
  ornament(W - margin - 14 - 18, H - margin - 14 - 18);

  // Header — organization
  doc
    .fillColor('#0a2540')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(ORG_EN, margin + 30, margin + 24, { width: W - margin * 2 - 60, align: 'center' });
  if (arFont) doc.font('AR');
  else doc.font('Helvetica');
  doc.fontSize(11).text(ORG_AR, { align: 'center' });

  // Title
  doc
    .moveDown(1.2)
    .fillColor('#0a2540')
    .font('Helvetica-Bold')
    .fontSize(34)
    .text('Certificate of Achievement', { align: 'center' });
  if (arFont) doc.font('AR');
  else doc.font('Helvetica-Bold');
  doc.fontSize(20).fillColor('#5a4012').text('شهادة إنجاز', { align: 'center' });

  // "Awarded to"
  doc.moveDown(1.0).font('Helvetica').fontSize(12).fillColor('#444');
  doc.text('This certificate is proudly presented to', { align: 'center' });

  // Recipient name
  doc.moveDown(0.4).font('Helvetica-Bold').fontSize(28).fillColor('#0a2540');
  const recipientEn = cert.recipient?.name?.en || '';
  const recipientAr = cert.recipient?.name?.ar || '';
  doc.text(recipientEn || recipientAr, { align: 'center' });
  if (recipientEn && recipientAr) {
    if (arFont) doc.font('AR');
    else doc.font('Helvetica-Bold');
    doc.fontSize(20).fillColor('#5a4012').text(recipientAr, { align: 'center' });
  }

  // Title of achievement
  doc.moveDown(0.6).font('Helvetica-Oblique').fontSize(13).fillColor('#222');
  doc.text('for successfully completing', { align: 'center' });
  doc.moveDown(0.3).font('Helvetica-Bold').fontSize(18).fillColor('#0a2540');
  doc.text(cert.title?.en || cert.title?.ar || '—', { align: 'center' });
  if (cert.title?.ar && cert.title?.en) {
    if (arFont) doc.font('AR');
    else doc.font('Helvetica-Bold');
    doc.fontSize(14).fillColor('#5a4012').text(cert.title.ar, { align: 'center' });
  }

  // Dates row
  const datesY = H - margin - 170;
  doc.font('Helvetica').fontSize(10).fillColor('#444');
  doc.text(`Issue Date:  ${fmtDate(cert.issueDate)}`, margin + 30, datesY, {
    width: 240,
    align: 'left',
  });
  if (cert.expiryDate) {
    doc.text(`Expiry Date: ${fmtDate(cert.expiryDate)}`, margin + 30, datesY + 14, {
      width: 240,
      align: 'left',
    });
  }
  doc.text(`Cert No:     ${cert.certificateNumber || '—'}`, margin + 30, datesY + 28, {
    width: 240,
    align: 'left',
  });

  // QR code (bottom-left)
  const verify = verifyUrl || cert.verificationUrl || '';
  if (verify) {
    try {
      const dataUrl = await buildQrPngDataUrl(verify);
      const png = Buffer.from(dataUrl.split(',')[1], 'base64');
      doc.image(png, margin + 30, H - margin - 130, { width: 90, height: 90 });
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#666')
        .text('Scan to verify · امسح للتحقق', margin + 30, H - margin - 36, {
          width: 90,
          align: 'center',
        });
    } catch {
      // QR errors should never break PDF generation
    }
  }

  // Tamper-evident footer (bottom right block)
  const footerX = W - margin - 360;
  const footerY = H - margin - 130;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0a2540');
  doc.text('Blockchain Anchor · مرساة البلوكتشين', footerX, footerY, { width: 330 });
  doc.font('Courier').fontSize(8).fillColor('#222');
  const lines = [
    `Hash       : ${shorten(cert.hash, 14, 8)}`,
    `Merkle Root: ${shorten(cert.merkleRoot, 14, 8)}`,
    `Tx Hash    : ${shorten(cert.blockchain?.transactionHash, 14, 8)}`,
    `Block #    : ${cert.blockchain?.blockNumber ?? '—'}`,
    `Network    : ${cert.blockchain?.network || '—'}`,
    `Status     : ${cert.status || '—'}`,
  ];
  let cy = footerY + 14;
  for (const line of lines) {
    doc.text(line, footerX, cy, { width: 330 });
    cy += 11;
  }

  // Signatures (top-right strip)
  if (Array.isArray(cert.signatures) && cert.signatures.length > 0) {
    let sy = margin + 60;
    const sx = W - margin - 220;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0a2540').text('Signatories', sx, sy, {
      width: 200,
      align: 'right',
    });
    sy += 12;
    for (const s of cert.signatures.slice(0, 3)) {
      doc.font('Helvetica').fontSize(9).fillColor('#222');
      doc.text(`${s.signerName || 'Signer'} — ${s.signerTitle || ''}`, sx, sy, {
        width: 200,
        align: 'right',
      });
      sy += 11;
      doc.font('Courier').fontSize(7).fillColor('#666');
      doc.text(shorten(s.signature, 10, 6), sx, sy, { width: 200, align: 'right' });
      sy += 12;
    }
  }

  doc.end();
  return done;
}

module.exports = { generateCertificatePdf };
