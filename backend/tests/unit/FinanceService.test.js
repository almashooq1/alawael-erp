/**
 * Unit Tests — FinanceService.js (ZatcaService only)
 * Pure static methods — QR TLV generation, XML, hash
 */
'use strict';

const { ZatcaService } = require('../../services/finance/FinanceService');

// ═══════════════════════════════════════
//  generateQrTLV
// ═══════════════════════════════════════
describe('ZatcaService.generateQrTLV', () => {
  const sellerName = 'شركة الأوائل';
  const vatNumber = '300000000000003';
  const date = new Date('2025-06-15T10:30:00Z');
  const totalAmount = 1150.0;
  const vatAmount = 150.0;

  it('returns a base64 string', () => {
    const qr = ZatcaService.generateQrTLV(sellerName, vatNumber, date, totalAmount, vatAmount);
    expect(typeof qr).toBe('string');
    // Base64 characters only
    expect(qr).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('decodes back to valid TLV tags', () => {
    const qr = ZatcaService.generateQrTLV(sellerName, vatNumber, date, totalAmount, vatAmount);
    const buf = Buffer.from(qr, 'base64');
    // TLV: tag 1 = seller name
    expect(buf[0]).toBe(1);
    const len1 = buf[1];
    const seller = buf.slice(2, 2 + len1).toString('utf8');
    expect(seller).toBe(sellerName);
  });

  it('includes all 5 TLV tags', () => {
    const qr = ZatcaService.generateQrTLV(sellerName, vatNumber, date, totalAmount, vatAmount);
    const buf = Buffer.from(qr, 'base64');
    const tags = [];
    let i = 0;
    while (i < buf.length) {
      const tag = buf[i];
      const len = buf[i + 1];
      tags.push(tag);
      i += 2 + len;
    }
    expect(tags).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles different amounts', () => {
    const qr1 = ZatcaService.generateQrTLV(sellerName, vatNumber, date, 100, 15);
    const qr2 = ZatcaService.generateQrTLV(sellerName, vatNumber, date, 200, 30);
    expect(qr1).not.toBe(qr2);
  });

  it('handles zero amounts', () => {
    const qr = ZatcaService.generateQrTLV(sellerName, vatNumber, date, 0, 0);
    expect(typeof qr).toBe('string');
    expect(qr.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
//  generateInvoiceXml
// ═══════════════════════════════════════
describe('ZatcaService.generateInvoiceXml', () => {
  const invoice = {
    invoice_number: 'INV-2025-001',
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    invoice_date: new Date('2025-06-15'),
    invoice_subtype: 'b2b',
    taxable_amount: 1000,
    total_amount: 1150,
  };
  const seller = {
    name_ar: 'شركة الأوائل',
    vat_number: '300000000000003',
  };

  it('returns XML string', () => {
    const xml = ZatcaService.generateInvoiceXml(invoice, seller);
    expect(typeof xml).toBe('string');
    expect(xml).toContain('<?xml');
    expect(xml).toContain('Invoice');
  });

  it('includes invoice number', () => {
    const xml = ZatcaService.generateInvoiceXml(invoice, seller);
    expect(xml).toContain('INV-2025-001');
  });

  it('includes UUID', () => {
    const xml = ZatcaService.generateInvoiceXml(invoice, seller);
    expect(xml).toContain('550e8400-e29b-41d4-a716-446655440000');
  });

  it('includes seller info', () => {
    const xml = ZatcaService.generateInvoiceXml(invoice, seller);
    expect(xml).toContain('شركة الأوائل');
    expect(xml).toContain('300000000000003');
  });

  it('includes amounts', () => {
    const xml = ZatcaService.generateInvoiceXml(invoice, seller);
    expect(xml).toContain('1000');
    expect(xml).toContain('1150');
  });

  it('b2c subtype works', () => {
    const b2c = { ...invoice, invoice_subtype: 'b2c' };
    const xml = ZatcaService.generateInvoiceXml(b2c, seller);
    expect(xml).toContain('0100000');
  });

  it('b2b subtype works', () => {
    const xml = ZatcaService.generateInvoiceXml(invoice, seller);
    expect(xml).toContain('0200000');
  });
});

// ═══════════════════════════════════════
//  generateInvoiceHash
// ═══════════════════════════════════════
describe('ZatcaService.generateInvoiceHash', () => {
  it('returns base64 hash', () => {
    const hash = ZatcaService.generateInvoiceHash('<Invoice>test</Invoice>');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('same input produces same hash', () => {
    const xml = '<Invoice>consistent</Invoice>';
    expect(ZatcaService.generateInvoiceHash(xml)).toBe(ZatcaService.generateInvoiceHash(xml));
  });

  it('different input produces different hash', () => {
    const h1 = ZatcaService.generateInvoiceHash('<Invoice>A</Invoice>');
    const h2 = ZatcaService.generateInvoiceHash('<Invoice>B</Invoice>');
    expect(h1).not.toBe(h2);
  });

  it('hash length consistent (SHA-256 base64 = 44 chars)', () => {
    const hash = ZatcaService.generateInvoiceHash('<Invoice>test</Invoice>');
    expect(hash.length).toBe(44);
  });
});
