/**
 * zatca-envelope.test.js — unit tests for the envelope builder's
 * helpers (TLV encoder, UUID v4 format, canonical hash, QR base64).
 *
 * The XAdES signer has its own e2e suite (zatca-xml-signer.e2e.test.js)
 * with RSA-SHA256 verification. This file locks the pre-sign
 * envelope's primitives: if TLV encoding drifts, every QR code
 * downstream breaks silently because ZATCA's validator won't surface
 * the cause in a helpful way.
 */

'use strict';

const { buildEnvelope, canonicalHash, uuidv4 } = require('../services/zatcaEnvelope');

describe('uuidv4', () => {
  it('returns a canonical 36-char v4 UUID', () => {
    const u = uuidv4();
    // 8-4-4-4-12 with version nibble 4 and RFC 4122 variant bits
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns distinct values across calls', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i += 1) seen.add(uuidv4());
    expect(seen.size).toBe(100);
  });
});

describe('canonicalHash', () => {
  const baseInvoice = {
    invoiceNumber: 'INV-2026-0001',
    issueDate: new Date('2026-04-18T12:00:00Z'),
    subTotal: 1500,
    taxAmount: 225,
    totalAmount: 1725,
    beneficiary: '65aaaaaa0000000000000001',
    items: [{ description: 'جلسة علاج طبيعي', quantity: 5, unitPrice: 300, total: 1500 }],
  };

  it('is deterministic for identical inputs', () => {
    expect(canonicalHash(baseInvoice)).toBe(canonicalHash(baseInvoice));
  });

  it('returns base64 (44-char SHA-256)', () => {
    const h = canonicalHash(baseInvoice);
    expect(h).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it('changes when totalAmount changes', () => {
    const h1 = canonicalHash(baseInvoice);
    const h2 = canonicalHash({ ...baseInvoice, totalAmount: 1726 });
    expect(h1).not.toBe(h2);
  });

  it('changes when an item quantity changes', () => {
    const h1 = canonicalHash(baseInvoice);
    const h2 = canonicalHash({
      ...baseInvoice,
      items: [{ ...baseInvoice.items[0], quantity: 6 }],
    });
    expect(h1).not.toBe(h2);
  });
});

describe('buildEnvelope', () => {
  const invoice = {
    invoiceNumber: 'INV-2026-0002',
    issueDate: new Date('2026-04-18T09:15:00Z'),
    subTotal: 1000,
    taxAmount: 150,
    totalAmount: 1150,
    beneficiary: '65aaaaaa0000000000000002',
    items: [{ description: 'جلسة', quantity: 1, unitPrice: 1000, total: 1000 }],
  };

  it('returns uuid + invoiceHash + qrCode + icv + pih', () => {
    const env = buildEnvelope(invoice, { icv: 42 });
    expect(env).toMatchObject({
      uuid: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      ),
      invoiceHash: expect.any(String),
      qrCode: expect.any(String),
      icv: 42,
      pih: '0',
    });
  });

  it('reuses invoice.zatca.uuid if present (idempotency)', () => {
    const fixed = '11111111-1111-4111-8111-111111111111';
    const env = buildEnvelope({ ...invoice, zatca: { uuid: fixed } });
    expect(env.uuid).toBe(fixed);
  });

  it('picks SIMPLIFIED invoiceType when no buyer VAT', () => {
    const env = buildEnvelope(invoice, { buyerVatNumber: '' });
    expect(env.invoiceType).toBe('SIMPLIFIED');
  });

  it('picks STANDARD invoiceType when buyer VAT is set', () => {
    const env = buildEnvelope(invoice, { buyerVatNumber: '300987654321003' });
    expect(env.invoiceType).toBe('STANDARD');
  });

  it('qrCode decodes back to valid TLV with mandatory tags 1..5', () => {
    const env = buildEnvelope(invoice, {
      sellerName: 'مركز الأوائل',
      sellerVatNumber: '300000000000003',
    });
    const bytes = Buffer.from(env.qrCode, 'base64');
    // Walk the TLV structure: each record is [tag, len, value...]
    const tagsSeen = [];
    let i = 0;
    while (i < bytes.length) {
      const tag = bytes[i];
      const len = bytes[i + 1];
      tagsSeen.push(tag);
      i += 2 + len;
    }
    expect(tagsSeen).toEqual([1, 2, 3, 4, 5]);
    // Last byte should land exactly at buffer end (no trailing junk)
    expect(i).toBe(bytes.length);
  });

  it('qrCode encodes the total with 2-decimal precision', () => {
    const env = buildEnvelope({ ...invoice, totalAmount: 1150.5 }, {});
    const bytes = Buffer.from(env.qrCode, 'base64');
    // Walk to tag 4 (total) and decode its value
    let i = 0;
    let total = null;
    while (i < bytes.length) {
      const tag = bytes[i];
      const len = bytes[i + 1];
      const val = bytes.slice(i + 2, i + 2 + len).toString('utf8');
      if (tag === 4) total = val;
      i += 2 + len;
    }
    expect(total).toBe('1150.50');
  });

  it('sellerName field accepts UTF-8 Arabic correctly in TLV', () => {
    const env = buildEnvelope(invoice, { sellerName: 'مركز الأوائل للتأهيل' });
    const bytes = Buffer.from(env.qrCode, 'base64');
    // Tag 1 is the first record
    const len = bytes[1];
    const name = bytes.slice(2, 2 + len).toString('utf8');
    expect(name).toBe('مركز الأوائل للتأهيل');
  });
});
