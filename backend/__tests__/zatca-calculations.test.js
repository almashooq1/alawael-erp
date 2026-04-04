/**
 * اختبارات وحدة ZATCA E-Invoicing Calculations
 * Pure Unit Tests - No HTTP, No DB
 */

'use strict';

const {
  // الثوابت
  VAT_RATE_STANDARD,
  VAT_RATE_ZERO,
  VAT_CATEGORIES,
  INVOICE_TYPES,
  INVOICE_SUBTYPES,
  TLV_TAGS,
  SIMPLIFIED_INVOICE_THRESHOLD,
  COUNTRY_CODE,
  CURRENCY_CODE,

  // التحقق
  validateVATNumber,
  validateNationalId,
  validateUUID,
  validateInvoiceData,

  // حسابات VAT
  calculateVAT,
  extractAmountExcludingVAT,

  // حسابات الفاتورة
  calculateDiscount,
  calculateInvoiceLine,
  calculateInvoiceTotals,
  calculateCreditNote,

  // TLV / QR Code
  encodeTLVField,
  generateZATCAQRCode,
  decodeZATCAQRCode,

  // التحليل والتقارير
  generateVATReport,
  summarizeInvoices,
  determineZATCARequirement,
} = require('../services/finance/zatcaCalculations.service');

// ═══════════════════════════════════════════════════════════════
// الثوابت
// ═══════════════════════════════════════════════════════════════

describe('الثوابت', () => {
  test('VAT_RATE_STANDARD = 0.15', () => {
    expect(VAT_RATE_STANDARD).toBe(0.15);
  });
  test('VAT_RATE_ZERO = 0', () => {
    expect(VAT_RATE_ZERO).toBe(0);
  });
  test('VAT_CATEGORIES يحتوي الفئات الصحيحة', () => {
    expect(VAT_CATEGORIES.STANDARD).toBe('S');
    expect(VAT_CATEGORIES.ZERO_RATED).toBe('Z');
    expect(VAT_CATEGORIES.EXEMPT).toBe('E');
    expect(VAT_CATEGORIES.OUT_OF_SCOPE).toBe('O');
  });
  test('INVOICE_TYPES صحيحة', () => {
    expect(INVOICE_TYPES.STANDARD).toBe('388');
    expect(INVOICE_TYPES.CREDIT_NOTE).toBe('381');
    expect(INVOICE_TYPES.DEBIT_NOTE).toBe('383');
  });
  test('INVOICE_SUBTYPES صحيحة', () => {
    expect(INVOICE_SUBTYPES.B2B).toBe('0100000');
    expect(INVOICE_SUBTYPES.B2C).toBe('0200000');
  });
  test('SIMPLIFIED_INVOICE_THRESHOLD = 1000', () => {
    expect(SIMPLIFIED_INVOICE_THRESHOLD).toBe(1000);
  });
  test('COUNTRY_CODE = SA', () => {
    expect(COUNTRY_CODE).toBe('SA');
  });
  test('CURRENCY_CODE = SAR', () => {
    expect(CURRENCY_CODE).toBe('SAR');
  });
  test('TLV_TAGS صحيحة', () => {
    expect(TLV_TAGS.SELLER_NAME).toBe(1);
    expect(TLV_TAGS.VAT_NUMBER).toBe(2);
    expect(TLV_TAGS.TIMESTAMP).toBe(3);
    expect(TLV_TAGS.INVOICE_TOTAL).toBe(4);
    expect(TLV_TAGS.VAT_TOTAL).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// validateVATNumber
// ═══════════════════════════════════════════════════════════════

describe('validateVATNumber - التحقق من الرقم الضريبي', () => {
  test('رقم ضريبي صحيح: 15 رقم، يبدأ بـ 3 وينتهي بـ 3', () => {
    expect(() => validateVATNumber('300000000000003')).not.toThrow();
  });
  test('يُرجع true للرقم الصحيح', () => {
    expect(validateVATNumber('300000000000003')).toBe(true);
  });
  test('رقم أقل من 15 رقم يُطلق خطأ', () => {
    expect(() => validateVATNumber('30000000000003')).toThrow('15 رقماً');
  });
  test('رقم أكثر من 15 رقم يُطلق خطأ', () => {
    expect(() => validateVATNumber('3000000000000030')).toThrow('15 رقماً');
  });
  test('لا يبدأ بـ 3 يُطلق خطأ', () => {
    expect(() => validateVATNumber('100000000000003')).toThrow('يبدأ بـ 3');
  });
  test('لا ينتهي بـ 3 يُطلق خطأ', () => {
    expect(() => validateVATNumber('300000000000005')).toThrow('ينتهي بـ 3');
  });
  test('null يُطلق خطأ', () => {
    expect(() => validateVATNumber(null)).toThrow('مطلوب');
  });
  test('رقم (ليس نصاً) يُطلق خطأ', () => {
    expect(() => validateVATNumber(300000000000003)).toThrow('مطلوب');
  });
  test('يحتوي أحرف يُطلق خطأ', () => {
    expect(() => validateVATNumber('3000000000000A3')).toThrow('15 رقماً');
  });
});

// ═══════════════════════════════════════════════════════════════
// validateNationalId
// ═══════════════════════════════════════════════════════════════

describe('validateNationalId - التحقق من رقم الهوية', () => {
  test('هوية صحيحة: 10 أرقام', () => {
    expect(() => validateNationalId('1234567890')).not.toThrow();
  });
  test('يُرجع true للهوية الصحيحة', () => {
    expect(validateNationalId('1234567890')).toBe(true);
  });
  test('أقل من 10 أرقام يُطلق خطأ', () => {
    expect(() => validateNationalId('123456789')).toThrow('10 أرقام');
  });
  test('أكثر من 10 أرقام يُطلق خطأ', () => {
    expect(() => validateNationalId('12345678901')).toThrow('10 أرقام');
  });
  test('يحتوي أحرف يُطلق خطأ', () => {
    expect(() => validateNationalId('123456789A')).toThrow('10 أرقام');
  });
  test('null يُطلق خطأ', () => {
    expect(() => validateNationalId(null)).toThrow('مطلوب');
  });
});

// ═══════════════════════════════════════════════════════════════
// validateUUID
// ═══════════════════════════════════════════════════════════════

describe('validateUUID', () => {
  test('UUID صحيح لا يُطلق خطأ', () => {
    expect(() => validateUUID('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
  });
  test('UUID بأحرف كبيرة صحيح', () => {
    expect(() => validateUUID('550E8400-E29B-41D4-A716-446655440000')).not.toThrow();
  });
  test('UUID بتنسيق خاطئ يُطلق خطأ', () => {
    expect(() => validateUUID('not-a-uuid')).toThrow('UUID غير صالح');
  });
  test('null يُطلق خطأ', () => {
    expect(() => validateUUID(null)).toThrow('UUID مطلوب');
  });
  test('UUID ناقص يُطلق خطأ', () => {
    expect(() => validateUUID('550e8400-e29b-41d4')).toThrow('UUID غير صالح');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateVAT
// ═══════════════════════════════════════════════════════════════

describe('calculateVAT - حساب ضريبة القيمة المضافة', () => {
  test('مبلغ 100 ريال - فئة S: ضريبة 15 ريال', () => {
    const result = calculateVAT(100, 'S');
    expect(result.vatAmount).toBe(15);
    expect(result.totalAmount).toBe(115);
    expect(result.vatRate).toBe(15);
  });

  test('مبلغ 1000 ريال - فئة S: ضريبة 150 ريال', () => {
    const result = calculateVAT(1000, 'S');
    expect(result.vatAmount).toBe(150);
    expect(result.totalAmount).toBe(1150);
  });

  test('مبلغ 100 ريال - فئة Z (صفرية): ضريبة 0', () => {
    const result = calculateVAT(100, 'Z');
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(100);
    expect(result.vatRate).toBe(0);
  });

  test('مبلغ 100 ريال - فئة E (معفاة): ضريبة 0', () => {
    const result = calculateVAT(100, 'E');
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(100);
  });

  test('مبلغ 100 ريال - فئة O (خارج النطاق): ضريبة 0', () => {
    const result = calculateVAT(100, 'O');
    expect(result.vatAmount).toBe(0);
  });

  test('مبلغ 0: ضريبة 0', () => {
    const result = calculateVAT(0, 'S');
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  test('مبلغ 33.33 ريال: تقريب صحيح', () => {
    const result = calculateVAT(33.33, 'S');
    expect(result.vatAmount).toBe(5); // 33.33 * 0.15 = 4.9995 → 5.00
    expect(result.totalAmount).toBe(38.33);
  });

  test('فئة غير صالحة تُطلق خطأ', () => {
    expect(() => calculateVAT(100, 'X')).toThrow('فئة الضريبة غير صالحة');
  });

  test('مبلغ سالب يُطلق خطأ', () => {
    expect(() => calculateVAT(-100, 'S')).toThrow('سالباً');
  });

  test('نص بدلاً من رقم يُطلق خطأ', () => {
    expect(() => calculateVAT('100', 'S')).toThrow('رقماً');
  });

  test('NaN يُطلق خطأ', () => {
    expect(() => calculateVAT(NaN, 'S')).toThrow('رقماً');
  });

  test('الفئة الافتراضية هي S', () => {
    const result = calculateVAT(100);
    expect(result.vatAmount).toBe(15);
  });

  test('result.taxableAmount = المبلغ المُدخل', () => {
    const result = calculateVAT(200, 'S');
    expect(result.taxableAmount).toBe(200);
    expect(result.category).toBe('S');
  });
});

// ═══════════════════════════════════════════════════════════════
// extractAmountExcludingVAT
// ═══════════════════════════════════════════════════════════════

describe('extractAmountExcludingVAT - استخراج المبلغ قبل الضريبة', () => {
  test('115 ريال → 100 قبل ضريبة + 15 ضريبة', () => {
    const result = extractAmountExcludingVAT(115, 'S');
    expect(result.amountExcludingVAT).toBe(100);
    expect(result.vatAmount).toBe(15);
    expect(result.totalAmount).toBe(115);
  });

  test('1150 ريال → 1000 قبل ضريبة + 150 ضريبة', () => {
    const result = extractAmountExcludingVAT(1150, 'S');
    expect(result.amountExcludingVAT).toBe(1000);
    expect(result.vatAmount).toBe(150);
  });

  test('فئة Z (صفرية): نفس المبلغ', () => {
    const result = extractAmountExcludingVAT(100, 'Z');
    expect(result.amountExcludingVAT).toBe(100);
    expect(result.vatAmount).toBe(0);
  });

  test('مبلغ سالب يُطلق خطأ', () => {
    expect(() => extractAmountExcludingVAT(-115, 'S')).toThrow('سالباً');
  });

  test('نص يُطلق خطأ', () => {
    expect(() => extractAmountExcludingVAT('115', 'S')).toThrow('رقماً');
  });

  test('0 → 0', () => {
    const result = extractAmountExcludingVAT(0, 'S');
    expect(result.amountExcludingVAT).toBe(0);
    expect(result.vatAmount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateDiscount
// ═══════════════════════════════════════════════════════════════

describe('calculateDiscount - حساب الخصم', () => {
  test('خصم ثابت 50 من 200: priceAfterDiscount = 150', () => {
    const result = calculateDiscount(200, 50, 'fixed');
    expect(result.discountAmount).toBe(50);
    expect(result.priceAfterDiscount).toBe(150);
    expect(result.originalPrice).toBe(200);
  });

  test('خصم نسبي 10% من 200: discountAmount = 20', () => {
    const result = calculateDiscount(200, 10, 'percentage');
    expect(result.discountAmount).toBe(20);
    expect(result.priceAfterDiscount).toBe(180);
  });

  test('خصم 0: priceAfterDiscount = originalPrice', () => {
    const result = calculateDiscount(100, 0, 'fixed');
    expect(result.discountAmount).toBe(0);
    expect(result.priceAfterDiscount).toBe(100);
  });

  test('خصم 100% من المبلغ: priceAfterDiscount = 0', () => {
    const result = calculateDiscount(100, 100, 'percentage');
    expect(result.discountAmount).toBe(100);
    expect(result.priceAfterDiscount).toBe(0);
  });

  test('خصم ثابت يتجاوز السعر يُطلق خطأ', () => {
    expect(() => calculateDiscount(100, 150, 'fixed')).toThrow('لا يمكن أن يتجاوز السعر');
  });

  test('نسبة خصم > 100% تُطلق خطأ', () => {
    expect(() => calculateDiscount(100, 110, 'percentage')).toThrow('100%');
  });

  test('نوع خصم غير صالح يُطلق خطأ', () => {
    expect(() => calculateDiscount(100, 10, 'invalid')).toThrow();
  });

  test('سعر سالب يُطلق خطأ', () => {
    expect(() => calculateDiscount(-100, 10, 'fixed')).toThrow('غير سالب');
  });

  test('الخصم الافتراضي هو fixed', () => {
    const result = calculateDiscount(200, 20);
    expect(result.discountAmount).toBe(20);
  });

  test('discountPercentage صحيح: 20/200 = 10%', () => {
    const result = calculateDiscount(200, 20, 'fixed');
    expect(result.discountPercentage).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateInvoiceLine
// ═══════════════════════════════════════════════════════════════

describe('calculateInvoiceLine - حساب سطر الفاتورة', () => {
  test('سطر بسيط: 2 × 100 = 200 + 30 ضريبة = 230', () => {
    const line = calculateInvoiceLine({ quantity: 2, unitPrice: 100 });
    expect(line.grossAmount).toBe(200);
    expect(line.vatAmount).toBe(30);
    expect(line.lineTotal).toBe(230);
    expect(line.taxableAmount).toBe(200);
    expect(line.discountAmount).toBe(0);
  });

  test('سطر مع خصم ثابت: 3 × 100 = 300 - 30 = 270 + 40.5 ضريبة', () => {
    const line = calculateInvoiceLine({
      quantity: 3,
      unitPrice: 100,
      discount: 30,
      discountType: 'fixed',
    });
    expect(line.grossAmount).toBe(300);
    expect(line.discountAmount).toBe(30);
    expect(line.taxableAmount).toBe(270);
    expect(line.vatAmount).toBe(40.5);
    expect(line.lineTotal).toBe(310.5);
  });

  test('سطر مع خصم نسبي 10%: 2 × 100 = 200 - 20 = 180 + 27 ضريبة', () => {
    const line = calculateInvoiceLine({
      quantity: 2,
      unitPrice: 100,
      discount: 10,
      discountType: 'percentage',
    });
    expect(line.discountAmount).toBe(20);
    expect(line.taxableAmount).toBe(180);
    expect(line.vatAmount).toBe(27);
  });

  test('سطر معفى من الضريبة: vatAmount = 0', () => {
    const line = calculateInvoiceLine({ quantity: 1, unitPrice: 100, vatCategory: 'E' });
    expect(line.vatAmount).toBe(0);
    expect(line.lineTotal).toBe(100);
  });

  test('سطر صفري الضريبة: vatAmount = 0', () => {
    const line = calculateInvoiceLine({ quantity: 1, unitPrice: 100, vatCategory: 'Z' });
    expect(line.vatAmount).toBe(0);
    expect(line.lineTotal).toBe(100);
  });

  test('كمية غير صحيحة (0) تُطلق خطأ', () => {
    expect(() => calculateInvoiceLine({ quantity: 0, unitPrice: 100 })).toThrow('صحيحاً موجباً');
  });

  test('كمية سالبة تُطلق خطأ', () => {
    expect(() => calculateInvoiceLine({ quantity: -1, unitPrice: 100 })).toThrow('صحيحاً موجباً');
  });

  test('كمية كسرية تُطلق خطأ', () => {
    expect(() => calculateInvoiceLine({ quantity: 1.5, unitPrice: 100 })).toThrow('صحيحاً موجباً');
  });

  test('سعر وحدة سالب يُطلق خطأ', () => {
    expect(() => calculateInvoiceLine({ quantity: 1, unitPrice: -50 })).toThrow('غير سالب');
  });

  test('unitPrice = 0 صحيح', () => {
    const line = calculateInvoiceLine({ quantity: 1, unitPrice: 0 });
    expect(line.grossAmount).toBe(0);
    expect(line.vatAmount).toBe(0);
  });

  test('result يحتوي جميع الحقول', () => {
    const line = calculateInvoiceLine({ quantity: 1, unitPrice: 100 });
    expect(line).toHaveProperty('quantity');
    expect(line).toHaveProperty('unitPrice');
    expect(line).toHaveProperty('grossAmount');
    expect(line).toHaveProperty('discountAmount');
    expect(line).toHaveProperty('taxableAmount');
    expect(line).toHaveProperty('vatCategory');
    expect(line).toHaveProperty('vatRate');
    expect(line).toHaveProperty('vatAmount');
    expect(line).toHaveProperty('lineTotal');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateInvoiceTotals
// ═══════════════════════════════════════════════════════════════

describe('calculateInvoiceTotals - مجاميع الفاتورة', () => {
  const sampleLines = [
    { quantity: 1, unitPrice: 100 }, // 100 + 15 = 115
    { quantity: 2, unitPrice: 50 }, // 100 + 15 = 115
  ];

  test('سطران: subtotal = 200، totalVat = 30، grandTotal = 230', () => {
    const result = calculateInvoiceTotals(sampleLines);
    expect(result.subtotal).toBe(200);
    expect(result.totalVat).toBe(30);
    expect(result.grandTotal).toBe(230);
  });

  test('taxableAmount = subtotal عند عدم وجود خصم', () => {
    const result = calculateInvoiceTotals(sampleLines);
    expect(result.taxableAmount).toBe(200);
  });

  test('totalDiscount = 0 عند عدم وجود خصم', () => {
    const result = calculateInvoiceTotals(sampleLines);
    expect(result.totalDiscount).toBe(0);
  });

  test('lines في النتيجة = عدد السطور المُدخلة', () => {
    const result = calculateInvoiceTotals(sampleLines);
    expect(result.lines).toHaveLength(2);
  });

  test('vatBreakdown يجمع حسب الفئة', () => {
    const mixedLines = [
      { quantity: 1, unitPrice: 100, vatCategory: 'S' },
      { quantity: 1, unitPrice: 50, vatCategory: 'E' },
    ];
    const result = calculateInvoiceTotals(mixedLines);
    expect(result.vatBreakdown['S']).toBeDefined();
    expect(result.vatBreakdown['E']).toBeDefined();
    expect(result.vatBreakdown['S'].taxableAmount).toBe(100);
    expect(result.vatBreakdown['S'].vatAmount).toBe(15);
    expect(result.vatBreakdown['E'].taxableAmount).toBe(50);
    expect(result.vatBreakdown['E'].vatAmount).toBe(0);
  });

  test('مصفوفة فارغة تُطلق خطأ', () => {
    expect(() => calculateInvoiceTotals([])).toThrow('سطر واحد على الأقل');
  });

  test('ليست مصفوفة تُطلق خطأ', () => {
    expect(() => calculateInvoiceTotals(null)).toThrow();
  });

  test('خصم إجمالي سالب يُطلق خطأ', () => {
    expect(() => calculateInvoiceTotals(sampleLines, -10)).toThrow('غير سالب');
  });

  test('خطأ في سطر يُشير لرقم السطر', () => {
    const badLines = [
      { quantity: 1, unitPrice: 100 },
      { quantity: 0, unitPrice: 50 }, // باطل
    ];
    expect(() => calculateInvoiceTotals(badLines)).toThrow('السطر 2');
  });

  test('currency = SAR', () => {
    const result = calculateInvoiceTotals(sampleLines);
    expect(result.currency).toBe('SAR');
  });

  test('فاتورة جلسة علاج نطق: 3 جلسات × 200 ريال', () => {
    const lines = [{ quantity: 3, unitPrice: 200 }];
    const result = calculateInvoiceTotals(lines);
    expect(result.subtotal).toBe(600);
    expect(result.totalVat).toBe(90); // 600 * 15% = 90
    expect(result.grandTotal).toBe(690);
  });
});

// ═══════════════════════════════════════════════════════════════
// encodeTLVField
// ═══════════════════════════════════════════════════════════════

describe('encodeTLVField - تشفير TLV', () => {
  test('يُرجع Buffer', () => {
    const result = encodeTLVField(1, 'test');
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('البايت الأول = رقم الحقل (tag)', () => {
    const result = encodeTLVField(2, 'test');
    expect(result[0]).toBe(2);
  });

  test('البايت الثاني = طول القيمة', () => {
    const value = 'hello';
    const result = encodeTLVField(1, value);
    expect(result[1]).toBe(value.length);
  });

  test('الباقي = القيمة بترميز UTF-8', () => {
    const value = 'test';
    const result = encodeTLVField(1, value);
    expect(result.slice(2).toString('utf8')).toBe(value);
  });

  test('رقم حقل 0 يُطلق خطأ', () => {
    expect(() => encodeTLVField(0, 'test')).toThrow('غير صالح');
  });

  test('رقم حقل 10 يُطلق خطأ', () => {
    expect(() => encodeTLVField(10, 'test')).toThrow('غير صالح');
  });

  test('قيمة غير نصية تُطلق خطأ', () => {
    expect(() => encodeTLVField(1, 123)).toThrow('نصاً');
  });

  test('قيمة عربية تُشفَّر بشكل صحيح', () => {
    const value = 'مركز التأهيل';
    const result = encodeTLVField(1, value);
    const decodedValue = result.slice(2).toString('utf8');
    expect(decodedValue).toBe(value);
  });
});

// ═══════════════════════════════════════════════════════════════
// generateZATCAQRCode + decodeZATCAQRCode
// ═══════════════════════════════════════════════════════════════

describe('generateZATCAQRCode و decodeZATCAQRCode', () => {
  const validData = {
    sellerName: 'مركز الأوائل للتأهيل',
    vatNumber: '300000000000003',
    invoiceDateTime: '2025-01-15T10:30:00Z',
    totalAmount: 1150.0,
    vatAmount: 150.0,
  };

  test('يُرجع Base64 string', () => {
    const qr = generateZATCAQRCode(validData);
    expect(typeof qr).toBe('string');
    // التحقق من أنه Base64 صالح
    expect(() => Buffer.from(qr, 'base64')).not.toThrow();
  });

  test('QR Code يمكن فك تشفيره', () => {
    const qr = generateZATCAQRCode(validData);
    const decoded = decodeZATCAQRCode(qr);
    expect(decoded.sellerName).toBe(validData.sellerName);
    expect(decoded.vatNumber).toBe(validData.vatNumber);
    expect(decoded.invoiceDateTime).toBe(validData.invoiceDateTime);
    expect(decoded.totalAmount).toBe(validData.totalAmount.toFixed(2));
    expect(decoded.vatAmount).toBe(validData.vatAmount.toFixed(2));
  });

  test('اسم بائع فارغ يُطلق خطأ', () => {
    expect(() => generateZATCAQRCode({ ...validData, sellerName: '' })).toThrow('اسم البائع');
  });

  test('اسم بائع مساحات فقط يُطلق خطأ', () => {
    expect(() => generateZATCAQRCode({ ...validData, sellerName: '   ' })).toThrow('اسم البائع');
  });

  test('رقم ضريبي خاطئ يُطلق خطأ', () => {
    expect(() => generateZATCAQRCode({ ...validData, vatNumber: '12345' })).toThrow();
  });

  test('تاريخ بتنسيق خاطئ يُطلق خطأ', () => {
    expect(() => generateZATCAQRCode({ ...validData, invoiceDateTime: '2025-01-15' })).toThrow(
      'ISO 8601'
    );
  });

  test('مبلغ سالب يُطلق خطأ', () => {
    expect(() => generateZATCAQRCode({ ...validData, totalAmount: -100 })).toThrow('غير سالب');
  });

  test('ضريبة سالبة تُطلق خطأ', () => {
    expect(() => generateZATCAQRCode({ ...validData, vatAmount: -10 })).toThrow('غير سالب');
  });

  test('decode: QR Code null يُطلق خطأ', () => {
    expect(() => decodeZATCAQRCode(null)).toThrow('مطلوب');
  });

  test('التشفير وفك التشفير: بيانات مركز تأهيل حقيقية', () => {
    const data = {
      sellerName: 'مركز الأوائل لتأهيل ذوي الاحتياجات الخاصة',
      vatNumber: '310122393500003',
      invoiceDateTime: '2025-03-15T08:00:00Z',
      totalAmount: 2300.0,
      vatAmount: 300.0,
    };
    const qr = generateZATCAQRCode(data);
    const decoded = decodeZATCAQRCode(qr);
    expect(decoded.sellerName).toBe(data.sellerName);
    expect(decoded.vatAmount).toBe('300.00');
  });
});

// ═══════════════════════════════════════════════════════════════
// validateInvoiceData
// ═══════════════════════════════════════════════════════════════

describe('validateInvoiceData - التحقق من الفاتورة', () => {
  const validInvoice = {
    invoiceNumber: 'INV-2025-00001',
    invoiceDate: '2025-01-15',
    sellerName: 'مركز الأوائل',
    sellerVATNumber: '300000000000003',
    invoiceType: '388',
    invoiceSubType: '0200000',
    lines: [{ quantity: 1, unitPrice: 100 }],
  };

  test('فاتورة صحيحة: isValid = true', () => {
    const result = validateInvoiceData(validInvoice);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('null: isValid = false', () => {
    const result = validateInvoiceData(null);
    expect(result.isValid).toBe(false);
  });

  test('بدون رقم فاتورة: خطأ', () => {
    const inv = { ...validInvoice, invoiceNumber: undefined };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('رقم الفاتورة'))).toBe(true);
  });

  test('بدون تاريخ: خطأ', () => {
    const inv = { ...validInvoice, invoiceDate: undefined };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
  });

  test('بدون اسم البائع: خطأ', () => {
    const inv = { ...validInvoice, sellerName: '' };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('اسم البائع'))).toBe(true);
  });

  test('رقم ضريبي خاطئ: خطأ', () => {
    const inv = { ...validInvoice, sellerVATNumber: '12345' };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
  });

  test('نوع فاتورة خاطئ: خطأ', () => {
    const inv = { ...validInvoice, invoiceType: '999' };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('نوع الفاتورة'))).toBe(true);
  });

  test('لا توجد أسطر: خطأ', () => {
    const inv = { ...validInvoice, lines: [] };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('سطر واحد'))).toBe(true);
  });

  test('B2B بدون رقم ضريبي للمشتري: خطأ', () => {
    const inv = { ...validInvoice, invoiceSubType: '0100000' };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('B2B'))).toBe(true);
  });

  test('B2B مع رقم ضريبي صحيح للمشتري: صحيح', () => {
    const inv = { ...validInvoice, invoiceSubType: '0100000', buyerVATNumber: '300000000000003' };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(true);
  });

  test('تاريخ استحقاق قبل تاريخ الفاتورة: خطأ', () => {
    const inv = { ...validInvoice, dueDate: '2025-01-10', invoiceDate: '2025-01-15' };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('الاستحقاق'))).toBe(true);
  });

  test('تاريخ استحقاق بعد تاريخ الفاتورة: صحيح', () => {
    const inv = { ...validInvoice, dueDate: '2025-01-30', invoiceDate: '2025-01-15' };
    const result = validateInvoiceData(inv);
    expect(result.isValid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateCreditNote
// ═══════════════════════════════════════════════════════════════

describe('calculateCreditNote - الإشعار الدائن', () => {
  const originalInvoice = {
    invoiceNumber: 'INV-2025-00001',
    grandTotal: 1150,
    taxableAmount: 1000,
    totalVat: 150,
  };

  test('إشعار دائن جزئي: يُرجع النوع الصحيح', () => {
    const refundLines = [{ quantity: 1, unitPrice: 100 }]; // 115 إجمالي
    const result = calculateCreditNote(originalInvoice, refundLines);
    expect(result.type).toBe(INVOICE_TYPES.CREDIT_NOTE);
  });

  test('رقم الفاتورة الأصلية في الإشعار', () => {
    const refundLines = [{ quantity: 1, unitPrice: 100 }];
    const result = calculateCreditNote(originalInvoice, refundLines);
    expect(result.originalInvoiceRef).toBe('INV-2025-00001');
  });

  test('netEffect يحتوي قيماً سالبة', () => {
    const refundLines = [{ quantity: 1, unitPrice: 100 }];
    const result = calculateCreditNote(originalInvoice, refundLines);
    expect(result.netEffect.grandTotal).toBeLessThan(0);
    expect(result.netEffect.vatAmount).toBeLessThan(0);
    expect(result.netEffect.taxableAmount).toBeLessThan(0);
  });

  test('إشعار يتجاوز قيمة الفاتورة الأصلية يُطلق خطأ', () => {
    const refundLines = [{ quantity: 10, unitPrice: 200 }]; // 2300 > 1150
    expect(() => calculateCreditNote(originalInvoice, refundLines)).toThrow('لا يمكن أن تتجاوز');
  });

  test('فاتورة أصلية null تُطلق خطأ', () => {
    expect(() => calculateCreditNote(null, [{ quantity: 1, unitPrice: 10 }])).toThrow();
  });

  test('أسطر فارغة تُطلق خطأ', () => {
    expect(() => calculateCreditNote(originalInvoice, [])).toThrow('سطر واحد');
  });
});

// ═══════════════════════════════════════════════════════════════
// determineZATCARequirement
// ═══════════════════════════════════════════════════════════════

describe('determineZATCARequirement - متطلبات ZATCA', () => {
  test('B2B → clearance', () => {
    const inv = { invoiceSubType: '0100000', grandTotal: 5000 };
    const result = determineZATCARequirement(inv);
    expect(result.requirement).toBe('clearance');
    expect(result.isB2B).toBe(true);
  });

  test('B2C مبلغ >= 1000 → reporting', () => {
    const inv = { invoiceSubType: '0200000', grandTotal: 1000 };
    const result = determineZATCARequirement(inv);
    expect(result.requirement).toBe('reporting');
    expect(result.isHighValue).toBe(true);
  });

  test('B2C مبلغ < 1000 → simplified_reporting', () => {
    const inv = { invoiceSubType: '0200000', grandTotal: 500 };
    const result = determineZATCARequirement(inv);
    expect(result.requirement).toBe('simplified_reporting');
    expect(result.isHighValue).toBe(false);
  });

  test('B2B مبلغ صغير لا يزال clearance', () => {
    const inv = { invoiceSubType: '0100000', grandTotal: 100 };
    const result = determineZATCARequirement(inv);
    expect(result.requirement).toBe('clearance');
  });

  test('يُرجع الحقول الكاملة', () => {
    const inv = { invoiceSubType: '0200000', grandTotal: 1500 };
    const result = determineZATCARequirement(inv);
    expect(result).toHaveProperty('requirement');
    expect(result).toHaveProperty('isB2B');
    expect(result).toHaveProperty('isHighValue');
    expect(result).toHaveProperty('threshold');
    expect(result).toHaveProperty('description');
    expect(result.threshold).toBe(1000);
  });

  test('null يُطلق خطأ', () => {
    expect(() => determineZATCARequirement(null)).toThrow();
  });

  test('description يحتوي نصاً توضيحياً', () => {
    const inv = { invoiceSubType: '0100000', grandTotal: 500 };
    const result = determineZATCARequirement(inv);
    expect(typeof result.description).toBe('string');
    expect(result.description.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// generateVATReport
// ═══════════════════════════════════════════════════════════════

describe('generateVATReport - تقرير الضريبة', () => {
  const invoices = [
    {
      invoiceType: '388',
      taxableAmount: 1000,
      totalVat: 150,
      vatBreakdown: { S: { taxableAmount: 1000, vatAmount: 150 } },
    },
    {
      invoiceType: '388',
      taxableAmount: 500,
      totalVat: 75,
      vatBreakdown: { S: { taxableAmount: 500, vatAmount: 75 } },
    },
    {
      invoiceType: '381', // إشعار دائن
      taxableAmount: 200,
      totalVat: 30,
    },
  ];

  test('مصفوفة فارغة: invoiceCount = 0', () => {
    const result = generateVATReport([], '2025-01');
    expect(result.sales.invoiceCount).toBe(0);
    expect(result.sales.totalVATCollected).toBe(0);
  });

  test('invoiceCount = عدد الفواتير (بدون إشعارات)', () => {
    const result = generateVATReport(invoices, '2025-01');
    expect(result.sales.invoiceCount).toBe(2);
  });

  test('creditNoteCount = عدد الإشعارات الدائنة', () => {
    const result = generateVATReport(invoices, '2025-01');
    expect(result.sales.creditNoteCount).toBe(1);
  });

  test('totalVATCollected = 150 + 75 - 30 = 195', () => {
    const result = generateVATReport(invoices, '2025-01');
    expect(result.sales.totalVATCollected).toBe(195);
  });

  test('totalTaxableAmount = 1000 + 500 - 200 = 1300', () => {
    const result = generateVATReport(invoices, '2025-01');
    expect(result.sales.totalTaxableAmount).toBe(1300);
  });

  test('period في النتيجة', () => {
    const result = generateVATReport([], '2025-03');
    expect(result.period).toBe('2025-03');
  });

  test('generatedAt موجود', () => {
    const result = generateVATReport([], '2025-01');
    expect(result.generatedAt).toBeDefined();
  });

  test('تنسيق فترة خاطئ يُطلق خطأ', () => {
    expect(() => generateVATReport([], '01-2025')).toThrow('YYYY-MM');
  });

  test('ليست مصفوفة يُطلق خطأ', () => {
    expect(() => generateVATReport(null, '2025-01')).toThrow('مصفوفة');
  });

  test('vatByCategory يجمع بشكل صحيح', () => {
    const result = generateVATReport(invoices, '2025-01');
    expect(result.vatByCategory['S']).toBeDefined();
    expect(result.vatByCategory['S'].taxableAmount).toBe(1500);
    expect(result.vatByCategory['S'].vatAmount).toBe(225);
  });

  test('netVATDue = totalVATCollected - totalVATPaid', () => {
    const result = generateVATReport(invoices, '2025-01');
    expect(result.netVATDue).toBe(result.sales.totalVATCollected - result.purchases.totalVATPaid);
  });
});

// ═══════════════════════════════════════════════════════════════
// summarizeInvoices
// ═══════════════════════════════════════════════════════════════

describe('summarizeInvoices - ملخص الفواتير', () => {
  const invoices = [
    { grandTotal: 1150, totalVat: 150, taxableAmount: 1000, status: 'paid', invoiceType: '388' },
    { grandTotal: 575, totalVat: 75, taxableAmount: 500, status: 'pending', invoiceType: '388' },
    { grandTotal: 230, totalVat: 30, taxableAmount: 200, status: 'paid', invoiceType: '381' },
  ];

  test('total = عدد الفواتير', () => {
    const result = summarizeInvoices(invoices);
    expect(result.total).toBe(3);
  });

  test('totalGrandAmount = مجموع كل الإجماليات', () => {
    const result = summarizeInvoices(invoices);
    expect(result.totalGrandAmount).toBe(1955);
  });

  test('totalVAT = مجموع كل الضرائب', () => {
    const result = summarizeInvoices(invoices);
    expect(result.totalVAT).toBe(255);
  });

  test('totalTaxable صحيح', () => {
    const result = summarizeInvoices(invoices);
    expect(result.totalTaxable).toBe(1700);
  });

  test('byStatus يجمع بشكل صحيح', () => {
    const result = summarizeInvoices(invoices);
    expect(result.byStatus['paid']).toBe(2);
    expect(result.byStatus['pending']).toBe(1);
  });

  test('byType يجمع بشكل صحيح', () => {
    const result = summarizeInvoices(invoices);
    expect(result.byType['388']).toBe(2);
    expect(result.byType['381']).toBe(1);
  });

  test('مصفوفة فارغة: total = 0', () => {
    const result = summarizeInvoices([]);
    expect(result.total).toBe(0);
    expect(result.totalGrandAmount).toBe(0);
  });

  test('ليست مصفوفة يُطلق خطأ', () => {
    expect(() => summarizeInvoices('not array')).toThrow('مصفوفة');
  });
});

// ═══════════════════════════════════════════════════════════════
// سيناريوهات متكاملة - مركز تأهيل
// ═══════════════════════════════════════════════════════════════

describe('سيناريوهات متكاملة - مركز تأهيل ذوي الإعاقة', () => {
  test('فاتورة جلسات علاجية متعددة', () => {
    const lines = [
      { quantity: 4, unitPrice: 200, vatCategory: 'S', description: 'جلسات علاج طبيعي' },
      { quantity: 3, unitPrice: 250, vatCategory: 'S', description: 'جلسات علاج وظيفي' },
      { quantity: 2, unitPrice: 300, vatCategory: 'S', description: 'جلسات علاج نطق' },
    ];
    const totals = calculateInvoiceTotals(lines);
    // 4×200 + 3×250 + 2×300 = 800+750+600 = 2150
    expect(totals.taxableAmount).toBe(2150);
    expect(totals.totalVat).toBe(322.5); // 2150 * 15%
    expect(totals.grandTotal).toBe(2472.5);
  });

  test('فاتورة مع خصم لمستفيد يحمل تأمين', () => {
    const lines = [
      { quantity: 10, unitPrice: 200, discount: 20, discountType: 'percentage', vatCategory: 'S' },
    ];
    const totals = calculateInvoiceTotals(lines);
    // 10×200 = 2000 - 20% = 1600 + 15% = 1840
    expect(totals.subtotal).toBe(2000);
    expect(totals.totalDiscount).toBe(400); // 20%
    expect(totals.taxableAmount).toBe(1600);
    expect(totals.totalVat).toBe(240);
    expect(totals.grandTotal).toBe(1840);
  });

  test('توليد QR Code وفك تشفيره - سيناريو حقيقي', () => {
    // حساب الفاتورة أولاً
    const lines = [{ quantity: 5, unitPrice: 200 }];
    const totals = calculateInvoiceTotals(lines);
    // 1000 + 150 = 1150
    expect(totals.grandTotal).toBe(1150);

    // توليد QR Code
    const qr = generateZATCAQRCode({
      sellerName: 'مركز الأوائل للتأهيل',
      vatNumber: '310122393500003',
      invoiceDateTime: '2025-03-15T09:00:00Z',
      totalAmount: totals.grandTotal,
      vatAmount: totals.totalVat,
    });

    // فك التشفير والتحقق
    const decoded = decodeZATCAQRCode(qr);
    expect(decoded.totalAmount).toBe('1150.00');
    expect(decoded.vatAmount).toBe('150.00');
  });

  test('دورة فاتورة + إشعار دائن جزئي', () => {
    // الفاتورة الأصلية
    const lines = [{ quantity: 10, unitPrice: 200 }];
    const originalTotals = calculateInvoiceTotals(lines);
    expect(originalTotals.grandTotal).toBe(2300);

    // إشعار دائن لإلغاء جلستين
    const creditLines = [{ quantity: 2, unitPrice: 200 }];
    const credit = calculateCreditNote(
      { invoiceNumber: 'INV-001', grandTotal: originalTotals.grandTotal },
      creditLines
    );

    expect(credit.type).toBe('381');
    expect(credit.grandTotal).toBe(460); // 2×200 + 15%
    expect(credit.netEffect.grandTotal).toBe(-460);
  });

  test('تحديد متطلب ZATCA لفاتورة مستشفى تأمين (B2B)', () => {
    const inv = { invoiceSubType: '0100000', grandTotal: 15000 };
    const req = determineZATCARequirement(inv);
    expect(req.requirement).toBe('clearance');
    expect(req.description).toContain('ZATCA');
  });

  test('تقرير ضريبي شهري لمركز تأهيل', () => {
    const monthlyInvoices = [
      {
        invoiceType: '388',
        taxableAmount: 5000,
        totalVat: 750,
        vatBreakdown: { S: { taxableAmount: 5000, vatAmount: 750 } },
      },
      {
        invoiceType: '388',
        taxableAmount: 3000,
        totalVat: 450,
        vatBreakdown: { S: { taxableAmount: 3000, vatAmount: 450 } },
      },
      { invoiceType: '381', taxableAmount: 500, totalVat: 75 }, // إشعار دائن
    ];
    const report = generateVATReport(monthlyInvoices, '2025-03');
    expect(report.sales.invoiceCount).toBe(2);
    expect(report.sales.totalTaxableAmount).toBe(7500); // 5000+3000-500
    expect(report.sales.totalVATCollected).toBe(1125); // 750+450-75
    expect(report.netVATDue).toBe(1125);
  });

  test('التحقق من صحة فاتورة كاملة', () => {
    const invoice = {
      invoiceNumber: 'INV-2025-00100',
      invoiceDate: '2025-03-15',
      dueDate: '2025-04-15',
      sellerName: 'مركز الأوائل للتأهيل',
      sellerVATNumber: '310122393500003',
      invoiceType: '388',
      invoiceSubType: '0200000',
      lines: [{ quantity: 5, unitPrice: 200 }],
    };
    const validation = validateInvoiceData(invoice);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
