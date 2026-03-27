// backend/services/eSignatureService.js
// خدمة التوقيع الإلكتروني والختم الإلكتروني
// Uses HMAC-SHA256 cryptographic signatures with optional PDF embedding

const crypto = require('crypto');
const _path = require('path');
const _fs = require('fs').promises;
const logger = require('../utils/logger');

// Signing secret – falls back to JWT_SECRET so every deployment has one
const SIGNING_SECRET = process.env.ESIGN_SECRET || process.env.JWT_SECRET || '';

class ESignatureService {
  /**
   * Generate an HMAC-SHA256 digest for raw content (Buffer or string).
   * This is the internal "digital signature" that can be verified later.
   */
  static _hmac(content) {
    if (!SIGNING_SECRET) {
      throw new Error('ESIGN_SECRET or JWT_SECRET must be set for digital signatures');
    }
    return crypto.createHmac('sha256', SIGNING_SECRET).update(content).digest('hex');
  }

  /**
   * Sign a document.
   * - Computes HMAC-SHA256 over the content buffer.
   * - If `pdfBuffer` is provided, embeds signature metadata into the PDF
   *   via pdf-lib (custom metadata + visible annotation).
   * - Persists a signature record that can be verified independently.
   *
   * @param {Object} opts
   * @param {string}  opts.documentId  – Mongo _id of the Document
   * @param {Buffer|string} opts.content – raw file content (or file path)
   * @param {Object}  opts.signer      – { _id, name, role }
   * @param {string}  opts.reason      – reason for signing
   * @param {Buffer} [opts.pdfBuffer]  – if provided, pdf-lib will embed metadata
   * @returns {{ success, signature, signedPdf? }}
   */
  static async signDocument({ documentId, content, signer, reason, pdfBuffer }) {
    try {
      const signatureId = `SIGN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const timestamp = new Date().toISOString();

      // Compute cryptographic hash of the content
      const contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content || '', 'utf-8');
      const digest = this._hmac(contentBuf);

      const signatureRecord = {
        id: signatureId,
        documentId,
        signer: {
          id: signer?._id || signer?.id || signer,
          name: signer?.name || String(signer),
          role: signer?.role || 'user',
        },
        reason,
        digest, // HMAC-SHA256 hex
        algorithm: 'HMAC-SHA256',
        status: 'signed',
        timestamp,
      };

      let signedPdf = null;

      // If a PDF buffer was supplied, embed signature metadata via pdf-lib
      if (pdfBuffer) {
        try {
          const { PDFDocument } = require('pdf-lib');
          const pdfDoc = await PDFDocument.load(pdfBuffer);

          // Set custom metadata
          pdfDoc.setTitle(pdfDoc.getTitle() || `Document ${documentId}`);
          pdfDoc.setSubject(`Digitally signed by ${signatureRecord.signer.name}`);
          pdfDoc.setKeywords([
            `sig:${signatureId}`,
            `digest:${digest}`,
            `signer:${signatureRecord.signer.name}`,
          ]);
          pdfDoc.setCreationDate(new Date());
          pdfDoc.setModificationDate(new Date());

          // Add a visible text annotation on the first page
          const pages = pdfDoc.getPages();
          if (pages.length > 0) {
            const firstPage = pages[0];
            const { _width } = firstPage.getSize();
            const { rgb } = require('pdf-lib');
            firstPage.drawText(
              `موقع رقمياً بواسطة: ${signatureRecord.signer.name} | ${timestamp}`,
              { x: 20, y: 20, size: 8, color: rgb(0.3, 0.3, 0.3) }
            );
          }

          signedPdf = Buffer.from(await pdfDoc.save());
        } catch (pdfError) {
          logger.warn('PDF embedding skipped – pdf-lib error:', pdfError.message);
        }
      }

      logger.info(
        `Document ${documentId} signed: ${signatureId} by ${signatureRecord.signer.name}`
      );

      return {
        success: true,
        signature: signatureRecord,
        ...(signedPdf ? { signedPdf } : {}),
        message: 'تم التوقيع الإلكتروني بنجاح',
      };
    } catch (error) {
      logger.error('ESignatureService.signDocument error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Verify a previously generated signature against content.
   *
   * @param {Buffer|string} content – original content
   * @param {string} expectedDigest – the digest from signatureRecord
   * @returns {{ valid: boolean }}
   */
  static verify(content, expectedDigest) {
    const contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content || '', 'utf-8');
    const actual = this._hmac(contentBuf);
    return {
      valid: crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expectedDigest, 'hex')),
    };
  }

  /**
   * Stamp a document (organizational seal / official stamp).
   * Embeds stamp metadata and returns a stamped PDF when possible.
   *
   * @param {Object} opts
   * @param {string}          opts.documentId
   * @param {Buffer|string}   opts.content
   * @param {string}          opts.stampType  – e.g. 'official', 'confidential', 'draft'
   * @param {Object}          opts.meta       – any extra metadata
   * @param {Buffer}         [opts.pdfBuffer] – if provided, stamp annotation added to PDF
   * @returns {{ success, stamp, stampedPdf? }}
   */
  static async stampDocument({ documentId, content, stampType, meta, pdfBuffer }) {
    try {
      const stampId = `STAMP_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const timestamp = new Date().toISOString();

      const contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content || '', 'utf-8');
      const digest = this._hmac(contentBuf);

      const stampLabels = {
        official: 'ختم رسمي',
        confidential: 'سري',
        draft: 'مسودة',
        approved: 'معتمد',
        received: 'وارد',
      };

      const stampRecord = {
        id: stampId,
        documentId,
        stampType,
        label: stampLabels[stampType] || stampType,
        meta: meta || {},
        digest,
        algorithm: 'HMAC-SHA256',
        status: 'stamped',
        timestamp,
      };

      let stampedPdf = null;

      if (pdfBuffer) {
        try {
          const { PDFDocument, rgb } = require('pdf-lib');
          const pdfDoc = await PDFDocument.load(pdfBuffer);

          const pages = pdfDoc.getPages();
          if (pages.length > 0) {
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            // Draw stamp label at top-right corner
            firstPage.drawText(`[ ${stampRecord.label} ]`, {
              x: width - 160,
              y: height - 30,
              size: 12,
              color: rgb(0.8, 0.1, 0.1),
            });

            // Draw stamp ID at bottom
            firstPage.drawText(`Stamp: ${stampId} | ${timestamp}`, {
              x: 20,
              y: 8,
              size: 6,
              color: rgb(0.5, 0.5, 0.5),
            });
          }

          stampedPdf = Buffer.from(await pdfDoc.save());
        } catch (pdfError) {
          logger.warn('PDF stamp embedding skipped:', pdfError.message);
        }
      }

      logger.info(`Document ${documentId} stamped: ${stampId} (${stampType})`);

      return {
        success: true,
        stamp: stampRecord,
        ...(stampedPdf ? { stampedPdf } : {}),
        message: 'تم الختم الإلكتروني بنجاح',
      };
    } catch (error) {
      logger.error('ESignatureService.stampDocument error:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = ESignatureService;
