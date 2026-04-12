/**
 * Unit Tests — zatcaCalculation.service.js
 * ZATCA VAT calculations — 100% pure, NO mocks needed
 */
'use strict';

const zatca = require('../../services/finance/zatcaCalculation.service');

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
describe('constants', () => {
  it('VAT rates', () => {
    expect(zatca.VAT_RATE_STANDARD).toBe(0.15);
    expect(zatca.VAT_RATE_ZERO).toBe(0.0);
  });

  it('VAT categories', () => {
    expect(zatca.VAT_CATEGORIES.STANDARD).toBe('S');
    expect(zatca.VAT_CATEGORIES.ZERO).toBe('Z');
    expect(zatca.VAT_CATEGORIES.EXEMPT).toBe('E');
    expect(zatca.VAT_CATEGORIES.NOT_SUBJECT).toBe('O');
  });

  it('invoice types', () => {
    expect(zatca.INVOICE_TYPES.STANDARD).toBe('388');
    expect(zatca.INVOICE_TYPES.DEBIT_NOTE).toBe('383');
    expect(zatca.INVOICE_TYPES.CREDIT_NOTE).toBe('381');
  });

  it('invoice subtypes', () => {
    expect(zatca.INVOICE_SUBTYPES.B2B).toBe('01');
    expect(zatca.INVOICE_SUBTYPES.B2C).toBe('02');
  });

  it('VAT_NUMBER_LENGTH', () => {
    expect(zatca.VAT_NUMBER_LENGTH).toBe(15);
  });
});

// ═══════════════════════════════════════
//  roundTo2Decimals
// ═══════════════════════════════════════
describe('roundTo2Decimals', () => {
  it('rounds normally', () => {
    expect(zatca.roundTo2Decimals(3.1415)).toBe(3.14);
    expect(zatca.roundTo2Decimals(3.145)).toBe(3.15);
  });

  it('handles integer', () => {
    expect(zatca.roundTo2Decimals(100)).toBe(100);
  });

  it('handles small values', () => {
    expect(zatca.roundTo2Decimals(0.005)).toBe(0.01);
  });
});

// ═══════════════════════════════════════
//  isValidVatNumber
// ═══════════════════════════════════════
describe('isValidVatNumber', () => {
  it('valid 15-digit starting and ending with 3', () => {
    expect(zatca.isValidVatNumber('300000000000003')).toBe(true);
    expect(zatca.isValidVatNumber('312345678901233')).toBe(true);
  });

  it('invalid — wrong length', () => {
    expect(zatca.isValidVatNumber('30000000000003')).toBe(false);
    expect(zatca.isValidVatNumber('3000000000000033')).toBe(false);
  });

  it('invalid — does not start with 3', () => {
    expect(zatca.isValidVatNumber('100000000000003')).toBe(false);
  });

  it('invalid — does not end with 3', () => {
    expect(zatca.isValidVatNumber('300000000000001')).toBe(false);
  });

  it('invalid — non-numeric', () => {
    expect(zatca.isValidVatNumber('30000000000abc3')).toBe(false);
  });

  it('invalid — null/undefined/empty', () => {
    expect(zatca.isValidVatNumber(null)).toBe(false);
    expect(zatca.isValidVatNumber(undefined)).toBe(false);
    expect(zatca.isValidVatNumber('')).toBe(false);
  });
});

// ═══════════════════════════════════════
//  calculateVat
// ═══════════════════════════════════════
describe('calculateVat', () => {
  it('standard rate (15%)', () => {
    const r = zatca.calculateVat(1000, 'S');
    expect(r.taxableAmount).toBe(1000);
    expect(r.vatAmount).toBe(150);
    expect(r.totalWithVat).toBe(1150);
    expect(r.vatRate).toBe(0.15);
    expect(r.vatCategory).toBe('S');
  });

  it('zero-rated', () => {
    const r = zatca.calculateVat(1000, 'Z');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(1000);
    expect(r.vatRate).toBe(0);
  });

  it('exempt', () => {
    const r = zatca.calculateVat(1000, 'E');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(1000);
  });

  it('not-subject', () => {
    const r = zatca.calculateVat(500, 'O');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(500);
  });

  it('defaults to standard', () => {
    const r = zatca.calculateVat(100);
    expect(r.vatRate).toBe(0.15);
    expect(r.vatAmount).toBe(15);
  });

  it('throws for negative amount', () => {
    expect(() => zatca.calculateVat(-100, 'S')).toThrow();
  });

  it('throws for NaN', () => {
    expect(() => zatca.calculateVat(NaN, 'S')).toThrow();
  });

  it('throws for invalid category', () => {
    expect(() => zatca.calculateVat(100, 'X')).toThrow();
  });
});

// ═══════════════════════════════════════
//  extractVatFromTotal
// ═══════════════════════════════════════
describe('extractVatFromTotal', () => {
  it('standard: extracts VAT from total', () => {
    const r = zatca.extractVatFromTotal(1150, 'S');
    expect(r.netAmount).toBeCloseTo(1000, 2);
    expect(r.vatAmount).toBeCloseTo(150, 2);
    expect(r.vatRate).toBe(0.15);
  });

  it('zero-rated: no VAT', () => {
    const r = zatca.extractVatFromTotal(1000, 'Z');
    expect(r.netAmount).toBe(1000);
    expect(r.vatAmount).toBe(0);
    expect(r.vatRate).toBe(0);
  });

  it('exempt: no VAT', () => {
    const r = zatca.extractVatFromTotal(500, 'E');
    expect(r.netAmount).toBe(500);
    expect(r.vatAmount).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateDiscount
// ═══════════════════════════════════════
describe('calculateDiscount', () => {
  it('fixed discount', () => {
    const r = zatca.calculateDiscount(1000, 200, 'fixed');
    expect(r.discountAmount).toBe(200);
    expect(r.amountAfterDiscount).toBe(800);
  });

  it('throws when fixed discount exceeds amount', () => {
    expect(() => zatca.calculateDiscount(100, 200, 'fixed')).toThrow();
  });

  it('percentage discount', () => {
    const r = zatca.calculateDiscount(1000, 10, 'percentage');
    expect(r.discountAmount).toBe(100);
    expect(r.amountAfterDiscount).toBe(900);
  });

  it('throws for percentage > 100', () => {
    expect(() => zatca.calculateDiscount(1000, 110, 'percentage')).toThrow();
  });

  it('throws for negative percentage', () => {
    expect(() => zatca.calculateDiscount(1000, -5, 'percentage')).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateInvoiceTotals
// ═══════════════════════════════════════
describe('calculateInvoiceTotals', () => {
  it('single standard item', () => {
    const items = [{ unitPrice: 100, quantity: 2, discountAmount: 0, vatCategory: 'S' }];
    const r = zatca.calculateInvoiceTotals(items);
    expect(r.subtotal).toBe(200);
    expect(r.totalDiscount).toBe(0);
    expect(r.taxableAmount).toBe(200);
    expect(r.vatAmount).toBe(30);
    expect(r.totalAmount).toBe(230);
    expect(r.itemsWithVat).toHaveLength(1);
  });

  it('mixed categories', () => {
    const items = [
      { unitPrice: 100, quantity: 1, vatCategory: 'S' },
      { unitPrice: 200, quantity: 1, vatCategory: 'E' },
      { unitPrice: 50, quantity: 1, vatCategory: 'Z' },
    ];
    const r = zatca.calculateInvoiceTotals(items);
    expect(r.taxableAmount).toBe(100);
    expect(r.exemptAmount).toBe(200);
    expect(r.zeroRatedAmount).toBe(50);
    expect(r.vatAmount).toBe(15);
    expect(r.totalAmount).toBe(365);
  });

  it('with discounts', () => {
    const items = [{ unitPrice: 500, quantity: 1, discountAmount: 50, vatCategory: 'S' }];
    const r = zatca.calculateInvoiceTotals(items);
    expect(r.subtotal).toBe(500);
    expect(r.totalDiscount).toBe(50);
    expect(r.taxableAmount).toBe(450);
    expect(r.vatAmount).toBeCloseTo(67.5, 2);
  });

  it('quantity defaults to 1', () => {
    const items = [{ unitPrice: 100, vatCategory: 'S' }];
    const r = zatca.calculateInvoiceTotals(items);
    expect(r.subtotal).toBe(100);
  });

  it('throws for empty items array', () => {
    expect(() => zatca.calculateInvoiceTotals([])).toThrow();
  });
});

// ═══════════════════════════════════════
//  encodeTlvField / QR Code
// ═══════════════════════════════════════
describe('encodeTlvField', () => {
  it('returns a Buffer', () => {
    const buf = zatca.encodeTlvField(1, 'Test');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf[0]).toBe(1); // tag
    expect(buf[1]).toBe(4); // length of 'Test'
  });

  it('handles Arabic text', () => {
    const buf = zatca.encodeTlvField(1, 'شركة');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf[0]).toBe(1);
  });

  it('throws for non-string value', () => {
    expect(() => zatca.encodeTlvField(1, 123)).toThrow();
  });
});

describe('generateZatcaQrCode', () => {
  it('generates base64 QR data', () => {
    const qr = zatca.generateZatcaQrCode({
      sellerName: 'شركة التأهيل',
      vatNumber: '300000000000003',
      invoiceTimestamp: '2025-01-15T10:00:00Z',
      totalAmount: 1150,
      vatAmount: 150,
    });
    expect(typeof qr).toBe('string');
    expect(qr.length).toBeGreaterThan(0);
    // Should be valid base64
    expect(() => Buffer.from(qr, 'base64')).not.toThrow();
  });

  it('throws for invalid VAT number', () => {
    expect(() =>
      zatca.generateZatcaQrCode({
        sellerName: 'Test',
        vatNumber: 'invalid',
        invoiceTimestamp: '2025-01-15T10:00:00Z',
        totalAmount: 100,
        vatAmount: 15,
      })
    ).toThrow();
  });
});

describe('decodeZatcaQrCode', () => {
  it('round-trips encode/decode', () => {
    const input = {
      sellerName: 'شركة التأهيل',
      vatNumber: '300000000000003',
      invoiceTimestamp: '2025-01-15T10:00:00Z',
      totalAmount: 1150,
      vatAmount: 150,
    };
    const encoded = zatca.generateZatcaQrCode(input);
    const decoded = zatca.decodeZatcaQrCode(encoded);
    expect(decoded.sellerName).toBe(input.sellerName);
    expect(decoded.vatNumber).toBe(input.vatNumber);
    expect(decoded.invoiceTimestamp).toBe(input.invoiceTimestamp);
    expect(decoded.totalAmount).toBe(1150);
    expect(decoded.vatAmount).toBe(150);
  });
});

// ═══════════════════════════════════════
//  generateInvoiceNumber / generateNoteNumber
// ═══════════════════════════════════════
describe('generateInvoiceNumber', () => {
  it('formats correctly', () => {
    expect(zatca.generateInvoiceNumber(2025, 1)).toBe('INV-2025-0000001');
    expect(zatca.generateInvoiceNumber(2025, 123)).toBe('INV-2025-0000123');
  });

  it('throws for invalid year', () => {
    expect(() => zatca.generateInvoiceNumber(1999, 1)).toThrow();
    expect(() => zatca.generateInvoiceNumber(2101, 1)).toThrow();
  });

  it('throws for seq < 1', () => {
    expect(() => zatca.generateInvoiceNumber(2025, 0)).toThrow();
  });
});

describe('generateNoteNumber', () => {
  it('credit note', () => {
    expect(zatca.generateNoteNumber('credit', 2025, 1)).toBe('CN-2025-000001');
  });

  it('debit note', () => {
    expect(zatca.generateNoteNumber('debit', 2025, 42)).toBe('DN-2025-000042');
  });

  it('throws for invalid type', () => {
    expect(() => zatca.generateNoteNumber('refund', 2025, 1)).toThrow();
  });
});

// ═══════════════════════════════════════
//  validateInvoiceForZatca
// ═══════════════════════════════════════
describe('validateInvoiceForZatca', () => {
  const validInvoice = {
    invoiceNumber: 'INV-2025-0000001',
    invoiceDate: '2025-01-15',
    sellerName: 'شركة التأهيل',
    sellerVatNumber: '300000000000003',
    items: [{ unitPrice: 100, quantity: 1 }],
    totalAmount: 115,
    invoiceTypeCode: '388',
  };

  it('valid invoice passes', () => {
    const r = zatca.validateInvoiceForZatca(validInvoice);
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('null invoice', () => {
    const r = zatca.validateInvoiceForZatca(null);
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('missing invoiceNumber', () => {
    const r = zatca.validateInvoiceForZatca({ ...validInvoice, invoiceNumber: '' });
    expect(r.isValid).toBe(false);
    expect(
      r.errors.some(e => e.includes('رقم الفاتورة') || e.toLowerCase().includes('invoice'))
    ).toBe(true);
  });

  it('invalid VAT number', () => {
    const r = zatca.validateInvoiceForZatca({ ...validInvoice, sellerVatNumber: 'bad' });
    expect(r.isValid).toBe(false);
  });

  it('empty items', () => {
    const r = zatca.validateInvoiceForZatca({ ...validInvoice, items: [] });
    expect(r.isValid).toBe(false);
  });

  it('invalid invoiceTypeCode', () => {
    const r = zatca.validateInvoiceForZatca({ ...validInvoice, invoiceTypeCode: '999' });
    expect(r.isValid).toBe(false);
  });

  it('negative totalAmount', () => {
    const r = zatca.validateInvoiceForZatca({ ...validInvoice, totalAmount: -10 });
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  getRehabServiceVatCategory
// ═══════════════════════════════════════
describe('getRehabServiceVatCategory', () => {
  it('exempt services', () => {
    [
      'pt',
      'ot',
      'speech',
      'aba',
      'psychology',
      'special_education',
      'vocational',
      'nursing',
      'medical',
      'assessment',
      'consultation',
    ].forEach(svc => {
      expect(zatca.getRehabServiceVatCategory(svc)).toBe('E');
    });
  });

  it('standard services', () => {
    [
      'equipment_rental',
      'transportation',
      'catering',
      'administrative',
      'training_external',
    ].forEach(svc => {
      expect(zatca.getRehabServiceVatCategory(svc)).toBe('S');
    });
  });

  it('unknown defaults to standard', () => {
    expect(zatca.getRehabServiceVatCategory('unknown_service')).toBe('S');
  });
});
