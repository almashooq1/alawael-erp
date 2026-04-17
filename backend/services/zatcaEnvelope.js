/**
 * zatcaEnvelope.js — generate ZATCA Phase-2 envelope for an invoice.
 *
 * Produces: uuid, invoiceHash, TLV-encoded base64 QR, default type.
 *
 * NOTE: this does NOT submit to ZATCA. It prepares the compliance-ready
 * envelope. Actual submission requires CSR / CSID / Fatoora API
 * integration which is an operational concern beyond this module.
 *
 * References:
 *  • ZATCA e-invoicing technical specifications v2.3
 *  • TLV tags: 1=seller name, 2=vat, 3=timestamp, 4=total, 5=vat amount
 */

'use strict';

const crypto = require('crypto');

function uuidv4() {
  // crypto.randomUUID may be unavailable in very old Node; fall back.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function tlv(tag, value) {
  const v = Buffer.from(String(value ?? ''), 'utf8');
  if (v.length > 0xff) {
    // TLV-V length field here uses single byte per ZATCA spec; clamp & warn
    const capped = v.slice(0, 0xff);
    return Buffer.concat([Buffer.from([tag, capped.length]), capped]);
  }
  return Buffer.concat([Buffer.from([tag, v.length]), v]);
}

/**
 * Build the base64-encoded TLV QR payload required for Phase-1 + embedded
 * in the Phase-2 signed XML. Tags 1–5 are mandatory.
 */
function buildQrCode({ sellerName, vatNumber, timestamp, totalAmount, vatAmount }) {
  const parts = [
    tlv(1, sellerName || ''),
    tlv(2, vatNumber || ''),
    tlv(3, new Date(timestamp).toISOString()),
    tlv(4, Number(totalAmount || 0).toFixed(2)),
    tlv(5, Number(vatAmount || 0).toFixed(2)),
  ];
  return Buffer.concat(parts).toString('base64');
}

/**
 * Canonical hash — ZATCA uses XML UBL canonicalization normally; for our
 * internal envelope we use a deterministic JSON-ish canonical form hashed
 * with SHA-256. This is stored for chain-of-custody even before we
 * integrate a full XML signer.
 */
function canonicalHash(invoice) {
  const canon = JSON.stringify({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate || new Date()).toISOString(),
    subTotal: Number(invoice.subTotal || 0).toFixed(2),
    taxAmount: Number(invoice.taxAmount || 0).toFixed(2),
    totalAmount: Number(invoice.totalAmount || 0).toFixed(2),
    beneficiary: String(invoice.beneficiary || ''),
    items: (invoice.items || []).map(it => ({
      description: it.description,
      quantity: Number(it.quantity || 0),
      unitPrice: Number(it.unitPrice || 0).toFixed(2),
      total: Number(it.total || 0).toFixed(2),
    })),
  });
  return crypto.createHash('sha256').update(canon).digest('base64');
}

/**
 * Build a full envelope for an invoice document.
 *
 * @param {object} invoice — mongoose doc (lean/toObject accepted)
 * @param {object} options
 * @param {string} options.sellerName
 * @param {string} options.sellerVatNumber
 * @param {string} options.buyerName
 * @param {string} options.buyerVatNumber
 * @param {string} options.previousInvoiceHash — base64 hash of prior invoice
 * @param {number} options.icv — invoice counter value (monotonic per seller)
 */
function buildEnvelope(invoice, options = {}) {
  const {
    sellerName = 'مراكز الأوائل للتأهيل',
    sellerVatNumber = '300000000000003',
    buyerName = '',
    buyerVatNumber = '',
    previousInvoiceHash = '0',
    icv = 1,
  } = options;

  const uuid = invoice?.zatca?.uuid || uuidv4();
  const invoiceHash = canonicalHash(invoice);

  const qrCode = buildQrCode({
    sellerName,
    vatNumber: sellerVatNumber,
    timestamp: invoice.issueDate || new Date(),
    totalAmount: invoice.totalAmount,
    vatAmount: invoice.taxAmount,
  });

  return {
    uuid,
    icv,
    pih: previousInvoiceHash,
    invoiceHash,
    qrCode,
    invoiceType: buyerVatNumber ? 'STANDARD' : 'SIMPLIFIED',
    sellerName,
    sellerVatNumber,
    buyerName,
    buyerVatNumber,
    zatcaStatus: 'NOT_SUBMITTED',
  };
}

module.exports = {
  uuidv4,
  buildQrCode,
  canonicalHash,
  buildEnvelope,
};
