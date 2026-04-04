'use strict';

/**
 * اختبارات وحدة ZATCA وضريبة القيمة المضافة السعودية
 * ZATCA VAT Calculation Tests — Saudi Arabia
 */

const {
  calculateVat,
  extractVatFromTotal,
  calculateInvoiceTotals,
  calculateDiscount,
  encodeTlvField,
  generateZatcaQrCode,
  decodeZatcaQrCode,
  generateInvoiceNumber,
  generateNoteNumber,
  isValidVatNumber,
  validateInvoiceForZatca,
  getRehabServiceVatCategory,
  roundTo2Decimals,
  VAT_RATE_STANDARD,
  VAT_RATE_ZERO,
  VAT_CATEGORIES,
  INVOICE_TYPES,
  INVOICE_SUBTYPES,
  VAT_NUMBER_LENGTH,
} = require('../services/finance/zatcaCalculation.service');

// ─── بيانات اختبار مشتركة ────────────────────────────────────────────────────
const VALID_VAT_NUMBER = '300000000000003';
const VALID_SELLER_NAME = 'مركز الأوائل للتأهيل';
const VALID_TIMESTAMP = '2026-04-03T10:00:00Z';

// ─── 1. الثوابت ──────────────────────────────────────────────────────────────
describe('الثوابت والتعريفات', () => {
  test('VAT_RATE_STANDARD = 0.15', () => {
    expect(VAT_RATE_STANDARD).toBe(0.15);
  });

  test('VAT_RATE_ZERO = 0', () => {
    expect(VAT_RATE_ZERO).toBe(0);
  });

  test('فئات الضريبة الأربع موجودة', () => {
    expect(VAT_CATEGORIES.STANDARD).toBe('S');
    expect(VAT_CATEGORIES.ZERO).toBe('Z');
    expect(VAT_CATEGORIES.EXEMPT).toBe('E');
    expect(VAT_CATEGORIES.NOT_SUBJECT).toBe('O');
  });

  test('أنواع الفواتير UBL صحيحة', () => {
    expect(INVOICE_TYPES.STANDARD).toBe('388');
    expect(INVOICE_TYPES.DEBIT_NOTE).toBe('383');
    expect(INVOICE_TYPES.CREDIT_NOTE).toBe('381');
  });

  test('الفئات الفرعية للفواتير', () => {
    expect(INVOICE_SUBTYPES.B2B).toBe('01');
    expect(INVOICE_SUBTYPES.B2C).toBe('02');
  });

  test('طول الرقم الضريبي = 15', () => {
    expect(VAT_NUMBER_LENGTH).toBe(15);
  });
});

// ─── 2. التحقق من الرقم الضريبي ─────────────────────────────────────────────
describe('isValidVatNumber — التحقق من الرقم الضريبي السعودي', () => {
  describe('أرقام صالحة', () => {
    test('رقم ضريبي صالح يبدأ وينتهي بـ 3', () => {
      expect(isValidVatNumber('300000000000003')).toBe(true);
    });

    test('رقم ضريبي صالح آخر', () => {
      expect(isValidVatNumber('311111111111113')).toBe(true);
    });

    test('الرقم الضريبي الحقيقي للهيئة', () => {
      expect(isValidVatNumber('399999999900003')).toBe(true);
    });
  });

  describe('أرقام غير صالحة', () => {
    test('أقل من 15 رقماً', () => {
      expect(isValidVatNumber('30000000000003')).toBe(false);
    });

    test('أكثر من 15 رقماً', () => {
      expect(isValidVatNumber('3000000000000030')).toBe(false);
    });

    test('لا يبدأ بـ 3', () => {
      expect(isValidVatNumber('200000000000003')).toBe(false);
    });

    test('لا ينتهي بـ 3', () => {
      expect(isValidVatNumber('300000000000001')).toBe(false);
    });

    test('يحتوي على حروف', () => {
      expect(isValidVatNumber('3000000000000A3')).toBe(false);
    });

    test('سلسلة فارغة', () => {
      expect(isValidVatNumber('')).toBe(false);
    });

    test('null', () => {
      expect(isValidVatNumber(null)).toBe(false);
    });

    test('رقم (وليس نصاً)', () => {
      expect(isValidVatNumber(300000000000003)).toBe(false);
    });

    test('undefined', () => {
      expect(isValidVatNumber(undefined)).toBe(false);
    });
  });
});

// ─── 3. حساب ضريبة القيمة المضافة ───────────────────────────────────────────
describe('calculateVat — حساب الضريبة', () => {
  describe('الفئة القياسية S (15%)', () => {
    test('100 ريال × 15% = 15 ريال ضريبة', () => {
      const result = calculateVat(100, 'S');
      expect(result.vatAmount).toBe(15);
      expect(result.totalWithVat).toBe(115);
      expect(result.vatRate).toBe(0.15);
    });

    test('1000 ريال × 15% = 150 ريال', () => {
      const result = calculateVat(1000, 'S');
      expect(result.vatAmount).toBe(150);
      expect(result.totalWithVat).toBe(1150);
    });

    test('تقريب صحيح: 33.33 × 15%', () => {
      const result = calculateVat(33.33, 'S');
      expect(result.vatAmount).toBe(5.0);
      expect(result.vatAmount).toBe(roundTo2Decimals(33.33 * 0.15));
    });

    test('استخدام الفئة الافتراضية S', () => {
      const result = calculateVat(200);
      expect(result.vatAmount).toBe(30);
      expect(result.vatCategory).toBe('S');
    });

    test('الحقول المُعادة صحيحة', () => {
      const result = calculateVat(500, 'S');
      expect(result).toHaveProperty('taxableAmount', 500);
      expect(result).toHaveProperty('vatAmount', 75);
      expect(result).toHaveProperty('totalWithVat', 575);
      expect(result).toHaveProperty('vatRate', 0.15);
      expect(result).toHaveProperty('vatCategory', 'S');
    });
  });

  describe('الفئة الصفرية Z (0%)', () => {
    test('100 ريال، فئة Z، لا ضريبة', () => {
      const result = calculateVat(100, 'Z');
      expect(result.vatAmount).toBe(0);
      expect(result.totalWithVat).toBe(100);
      expect(result.vatRate).toBe(0);
    });
  });

  describe('الفئة المعفاة E', () => {
    test('100 ريال، فئة E، لا ضريبة', () => {
      const result = calculateVat(100, 'E');
      expect(result.vatAmount).toBe(0);
      expect(result.totalWithVat).toBe(100);
    });
  });

  describe('الفئة خارج النطاق O', () => {
    test('100 ريال، فئة O، لا ضريبة', () => {
      const result = calculateVat(100, 'O');
      expect(result.vatAmount).toBe(0);
      expect(result.totalWithVat).toBe(100);
    });
  });

  describe('حالات الخطأ', () => {
    test('مبلغ سالب', () => {
      expect(() => calculateVat(-100, 'S')).toThrow();
    });

    test('مبلغ NaN', () => {
      expect(() => calculateVat(NaN, 'S')).toThrow();
    });

    test('فئة ضريبة غير صالحة', () => {
      expect(() => calculateVat(100, 'X')).toThrow();
    });

    test('صفر ريال صالح', () => {
      const result = calculateVat(0, 'S');
      expect(result.vatAmount).toBe(0);
      expect(result.totalWithVat).toBe(0);
    });
  });
});

// ─── 4. استخراج الضريبة من المجموع ──────────────────────────────────────────
describe('extractVatFromTotal — استخراج الضريبة من المجموع الشامل', () => {
  test('115 ريال شامل 15% → 100 صافي + 15 ضريبة', () => {
    const result = extractVatFromTotal(115, 'S');
    expect(result.netAmount).toBe(100);
    expect(result.vatAmount).toBe(15);
    expect(result.vatRate).toBe(0.15);
  });

  test('1150 ريال → 1000 صافي + 150 ضريبة', () => {
    const result = extractVatFromTotal(1150, 'S');
    expect(result.netAmount).toBe(1000);
    expect(result.vatAmount).toBe(150);
  });

  test('فئة Z: المبلغ = الصافي', () => {
    const result = extractVatFromTotal(100, 'Z');
    expect(result.netAmount).toBe(100);
    expect(result.vatAmount).toBe(0);
  });

  test('فئة E: المبلغ = الصافي', () => {
    const result = extractVatFromTotal(200, 'E');
    expect(result.netAmount).toBe(200);
    expect(result.vatAmount).toBe(0);
  });

  test('التحقق: صافي + ضريبة = إجمالي', () => {
    const total = 575;
    const result = extractVatFromTotal(total, 'S');
    expect(result.netAmount + result.vatAmount).toBe(total);
  });

  test('مبلغ سالب يرمي خطأ', () => {
    expect(() => extractVatFromTotal(-100, 'S')).toThrow();
  });
});

// ─── 5. مجاميع الفاتورة الكاملة ──────────────────────────────────────────────
describe('calculateInvoiceTotals — مجاميع الفاتورة', () => {
  test('بند واحد خاضع للضريبة', () => {
    const items = [{ unitPrice: 1000, quantity: 1, vatCategory: 'S' }];
    const result = calculateInvoiceTotals(items);
    expect(result.subtotal).toBe(1000);
    expect(result.taxableAmount).toBe(1000);
    expect(result.vatAmount).toBe(150);
    expect(result.totalAmount).toBe(1150);
    expect(result.exemptAmount).toBe(0);
  });

  test('بند واحد معفى', () => {
    const items = [{ unitPrice: 500, quantity: 2, vatCategory: 'E' }];
    const result = calculateInvoiceTotals(items);
    expect(result.subtotal).toBe(1000);
    expect(result.exemptAmount).toBe(1000);
    expect(result.vatAmount).toBe(0);
    expect(result.taxableAmount).toBe(0);
    expect(result.totalAmount).toBe(1000);
  });

  test('بنود مختلطة: خاضع + معفى', () => {
    const items = [
      { unitPrice: 200, quantity: 1, vatCategory: 'S' }, // 200 + 30 ضريبة
      { unitPrice: 300, quantity: 1, vatCategory: 'E' }, // 300 معفى
    ];
    const result = calculateInvoiceTotals(items);
    expect(result.taxableAmount).toBe(200);
    expect(result.exemptAmount).toBe(300);
    expect(result.vatAmount).toBe(30);
    expect(result.totalAmount).toBe(530);
  });

  test('بند مع خصم', () => {
    const items = [{ unitPrice: 1000, quantity: 1, discountAmount: 100, vatCategory: 'S' }];
    const result = calculateInvoiceTotals(items);
    expect(result.totalDiscount).toBe(100);
    expect(result.taxableAmount).toBe(900);
    expect(result.vatAmount).toBe(135);
    expect(result.totalAmount).toBe(1035);
  });

  test('بنود متعددة مع كميات مختلفة', () => {
    const items = [
      { unitPrice: 100, quantity: 5, vatCategory: 'S' }, // 500 + 75
      { unitPrice: 200, quantity: 2, vatCategory: 'Z' }, // 400 صفري
      { unitPrice: 150, quantity: 1, vatCategory: 'E' }, // 150 معفى
    ];
    const result = calculateInvoiceTotals(items);
    expect(result.subtotal).toBe(1050);
    expect(result.taxableAmount).toBe(500);
    expect(result.zeroRatedAmount).toBe(400);
    expect(result.exemptAmount).toBe(150);
    expect(result.vatAmount).toBe(75);
    expect(result.totalAmount).toBe(1125);
  });

  test('مصفوفة فارغة تُلقي خطأ', () => {
    expect(() => calculateInvoiceTotals([])).toThrow();
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => calculateInvoiceTotals(null)).toThrow();
  });

  test('itemsWithVat تحتوي على الحسابات', () => {
    const items = [{ unitPrice: 100, quantity: 1, vatCategory: 'S' }];
    const result = calculateInvoiceTotals(items);
    expect(result.itemsWithVat[0]).toHaveProperty('vatAmount', 15);
    expect(result.itemsWithVat[0]).toHaveProperty('totalWithVat', 115);
    expect(result.itemsWithVat[0]).toHaveProperty('lineTotal', 100);
  });
});

// ─── 6. الخصومات ─────────────────────────────────────────────────────────────
describe('calculateDiscount — حساب الخصومات', () => {
  describe('خصم نسبة مئوية', () => {
    test('خصم 10% من 1000', () => {
      const result = calculateDiscount(1000, 10, 'percentage');
      expect(result.discountAmount).toBe(100);
      expect(result.amountAfterDiscount).toBe(900);
    });

    test('خصم 50% من 200', () => {
      const result = calculateDiscount(200, 50, 'percentage');
      expect(result.discountAmount).toBe(100);
      expect(result.amountAfterDiscount).toBe(100);
    });

    test('خصم 100% مقبول', () => {
      const result = calculateDiscount(500, 100, 'percentage');
      expect(result.discountAmount).toBe(500);
      expect(result.amountAfterDiscount).toBe(0);
    });

    test('خصم فوق 100% يرمي خطأ', () => {
      expect(() => calculateDiscount(1000, 101, 'percentage')).toThrow();
    });
  });

  describe('خصم ثابت', () => {
    test('خصم 50 ريال من 500', () => {
      const result = calculateDiscount(500, 50, 'fixed');
      expect(result.discountAmount).toBe(50);
      expect(result.amountAfterDiscount).toBe(450);
    });

    test('خصم يساوي المبلغ', () => {
      const result = calculateDiscount(100, 100, 'fixed');
      expect(result.discountAmount).toBe(100);
      expect(result.amountAfterDiscount).toBe(0);
    });

    test('خصم أكبر من المبلغ يرمي خطأ', () => {
      expect(() => calculateDiscount(100, 150, 'fixed')).toThrow();
    });
  });

  describe('حالات الخطأ', () => {
    test('نوع خصم غير صالح', () => {
      expect(() => calculateDiscount(100, 10, 'unknown')).toThrow();
    });

    test('مبلغ سالب', () => {
      expect(() => calculateDiscount(-100, 10, 'fixed')).toThrow();
    });

    test('قيمة خصم سالبة', () => {
      expect(() => calculateDiscount(100, -10, 'fixed')).toThrow();
    });
  });
});

// ─── 7. TLV Encoding ─────────────────────────────────────────────────────────
describe('encodeTlvField — تشفير TLV', () => {
  test('الوسم 1 مع قيمة نصية', () => {
    const buf = encodeTlvField(1, 'Hello');
    expect(buf[0]).toBe(1); // tag
    expect(buf[1]).toBe(5); // length of 'Hello'
    expect(buf.slice(2).toString('utf8')).toBe('Hello');
  });

  test('الوسم 2 مع الرقم الضريبي', () => {
    const vatNumber = VALID_VAT_NUMBER;
    const buf = encodeTlvField(2, vatNumber);
    expect(buf[0]).toBe(2);
    expect(buf[1]).toBe(vatNumber.length);
    expect(buf.slice(2).toString('utf8')).toBe(vatNumber);
  });

  test('نص عربي بترميز UTF-8', () => {
    const arabicText = 'مركز التأهيل';
    const buf = encodeTlvField(1, arabicText);
    expect(buf[0]).toBe(1);
    const decoded = buf.slice(2).toString('utf8');
    expect(decoded).toBe(arabicText);
  });

  test('الحجم الإجمالي: 1 (tag) + 1 (length) + n (value)', () => {
    const value = 'Test';
    const buf = encodeTlvField(3, value);
    expect(buf.length).toBe(1 + 1 + Buffer.from(value, 'utf8').length);
  });

  test('قيمة غير نصية تُلقي خطأ', () => {
    expect(() => encodeTlvField(1, 123)).toThrow();
  });

  test('مبلغ بتنسيق نصي', () => {
    const amount = '1150.00';
    const buf = encodeTlvField(4, amount);
    expect(buf.slice(2).toString('utf8')).toBe(amount);
  });
});

// ─── 8. QR Code ZATCA ────────────────────────────────────────────────────────
describe('generateZatcaQrCode — توليد QR Code', () => {
  const validData = {
    sellerName: VALID_SELLER_NAME,
    vatNumber: VALID_VAT_NUMBER,
    invoiceTimestamp: VALID_TIMESTAMP,
    totalAmount: 1150.0,
    vatAmount: 150.0,
  };

  test('يُنتج سلسلة Base64', () => {
    const qr = generateZatcaQrCode(validData);
    expect(typeof qr).toBe('string');
    expect(qr.length).toBeGreaterThan(0);
    // التحقق من صحة Base64
    expect(() => Buffer.from(qr, 'base64')).not.toThrow();
  });

  test('QR code مختلف لبيانات مختلفة', () => {
    const qr1 = generateZatcaQrCode(validData);
    const qr2 = generateZatcaQrCode({ ...validData, totalAmount: 2300 });
    expect(qr1).not.toBe(qr2);
  });

  test('اسم بائع غائب يرمي خطأ', () => {
    expect(() => generateZatcaQrCode({ ...validData, sellerName: '' })).toThrow();
    expect(() => generateZatcaQrCode({ ...validData, sellerName: null })).toThrow();
  });

  test('رقم ضريبي غير صالح يرمي خطأ', () => {
    expect(() => generateZatcaQrCode({ ...validData, vatNumber: '123' })).toThrow();
  });

  test('تاريخ فاتورة غائب يرمي خطأ', () => {
    expect(() => generateZatcaQrCode({ ...validData, invoiceTimestamp: '' })).toThrow();
  });

  test('مبلغ غير رقمي يرمي خطأ', () => {
    expect(() => generateZatcaQrCode({ ...validData, totalAmount: 'abc' })).toThrow();
  });
});

// ─── 9. Decode QR Code ───────────────────────────────────────────────────────
describe('decodeZatcaQrCode — فك تشفير QR Code', () => {
  const validData = {
    sellerName: VALID_SELLER_NAME,
    vatNumber: VALID_VAT_NUMBER,
    invoiceTimestamp: VALID_TIMESTAMP,
    totalAmount: 1150.0,
    vatAmount: 150.0,
  };

  test('encode ثم decode يُعيد نفس البيانات', () => {
    const qr = generateZatcaQrCode(validData);
    const decoded = decodeZatcaQrCode(qr);

    expect(decoded.sellerName).toBe(validData.sellerName);
    expect(decoded.vatNumber).toBe(validData.vatNumber);
    expect(decoded.invoiceTimestamp).toBe(validData.invoiceTimestamp);
    expect(decoded.totalAmount).toBe(validData.totalAmount);
    expect(decoded.vatAmount).toBe(validData.vatAmount);
  });

  test('totalAmount و vatAmount تُعاد كأرقام', () => {
    const qr = generateZatcaQrCode(validData);
    const decoded = decodeZatcaQrCode(qr);
    expect(typeof decoded.totalAmount).toBe('number');
    expect(typeof decoded.vatAmount).toBe('number');
  });

  test('الاسم العربي يُفكّ بشكل صحيح', () => {
    const qr = generateZatcaQrCode(validData);
    const decoded = decodeZatcaQrCode(qr);
    expect(decoded.sellerName).toBe(VALID_SELLER_NAME);
  });

  test('بيانات بمبالغ صفرية', () => {
    const qr = generateZatcaQrCode({ ...validData, vatAmount: 0 });
    const decoded = decodeZatcaQrCode(qr);
    expect(decoded.vatAmount).toBe(0);
  });

  test('غير Base64 لا يُلقي خطأ (يُعيد ناتجاً فارغاً أو جزئياً)', () => {
    // لا نتوقع خطأ لكن النتيجة قد تكون غير كاملة
    expect(() => decodeZatcaQrCode('not-base64-at-all=')).not.toThrow();
  });

  test('غير نصي يرمي خطأ', () => {
    expect(() => decodeZatcaQrCode(null)).toThrow();
  });
});

// ─── 10. توليد أرقام الفواتير ────────────────────────────────────────────────
describe('generateInvoiceNumber — توليد أرقام الفواتير', () => {
  test('صيغة INV-YYYY-XXXXXXX صحيحة', () => {
    expect(generateInvoiceNumber(2026, 1)).toBe('INV-2026-0000001');
    expect(generateInvoiceNumber(2026, 100)).toBe('INV-2026-0000100');
    expect(generateInvoiceNumber(2026, 9999999)).toBe('INV-2026-9999999');
  });

  test('السنة 2024', () => {
    expect(generateInvoiceNumber(2024, 1)).toBe('INV-2024-0000001');
  });

  test('رقم تسلسلي من 7 أرقام يُحفظ كما هو', () => {
    expect(generateInvoiceNumber(2026, 1234567)).toBe('INV-2026-1234567');
  });

  test('سنة غير صالحة تُلقي خطأ', () => {
    expect(() => generateInvoiceNumber(1999, 1)).toThrow();
    expect(() => generateInvoiceNumber(2200, 1)).toThrow();
  });

  test('رقم تسلسلي صفر تُلقي خطأ', () => {
    expect(() => generateInvoiceNumber(2026, 0)).toThrow();
  });

  test('رقم تسلسلي سالب تُلقي خطأ', () => {
    expect(() => generateInvoiceNumber(2026, -1)).toThrow();
  });

  test('رقم تسلسلي غير صحيح تُلقي خطأ', () => {
    expect(() => generateInvoiceNumber(2026, 1.5)).toThrow();
  });
});

// ─── 11. توليد أرقام الإشعارات ───────────────────────────────────────────────
describe('generateNoteNumber — توليد أرقام الإشعارات', () => {
  test('إشعار دائن CN-YYYY-XXXXXX', () => {
    expect(generateNoteNumber('credit', 2026, 1)).toBe('CN-2026-000001');
    expect(generateNoteNumber('credit', 2026, 100)).toBe('CN-2026-000100');
  });

  test('إشعار مدين DN-YYYY-XXXXXX', () => {
    expect(generateNoteNumber('debit', 2026, 1)).toBe('DN-2026-000001');
    expect(generateNoteNumber('debit', 2026, 999999)).toBe('DN-2026-999999');
  });

  test('نوع غير صالح تُلقي خطأ', () => {
    expect(() => generateNoteNumber('other', 2026, 1)).toThrow();
  });

  test('سنة غير صالحة تُلقي خطأ', () => {
    expect(() => generateNoteNumber('credit', 1999, 1)).toThrow();
  });

  test('رقم تسلسلي سالب تُلقي خطأ', () => {
    expect(() => generateNoteNumber('credit', 2026, -1)).toThrow();
  });
});

// ─── 12. فئات الضريبة لخدمات التأهيل ────────────────────────────────────────
describe('getRehabServiceVatCategory — تصنيف خدمات التأهيل', () => {
  describe('خدمات معفاة E', () => {
    const exemptServices = [
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
    ];

    exemptServices.forEach(service => {
      test(`${service} = EXEMPT (E)`, () => {
        expect(getRehabServiceVatCategory(service)).toBe('E');
      });
    });
  });

  describe('خدمات خاضعة للضريبة S', () => {
    const standardServices = [
      'equipment_rental',
      'transportation',
      'catering',
      'administrative',
      'training_external',
    ];

    standardServices.forEach(service => {
      test(`${service} = STANDARD (S)`, () => {
        expect(getRehabServiceVatCategory(service)).toBe('S');
      });
    });
  });

  test('خدمة مجهولة = STANDARD افتراضياً', () => {
    expect(getRehabServiceVatCategory('unknown_service')).toBe('S');
    expect(getRehabServiceVatCategory('misc')).toBe('S');
  });
});

// ─── 13. التحقق من بيانات الفاتورة ──────────────────────────────────────────
describe('validateInvoiceForZatca — التحقق من الفاتورة', () => {
  const validInvoice = {
    invoiceNumber: 'INV-2026-0000001',
    invoiceDate: '2026-04-03',
    sellerName: VALID_SELLER_NAME,
    sellerVatNumber: VALID_VAT_NUMBER,
    items: [{ unitPrice: 1000, quantity: 1, vatCategory: 'E' }],
    totalAmount: 1000,
    invoiceTypeCode: '388',
  };

  test('فاتورة صالحة', () => {
    const result = validateInvoiceForZatca(validInvoice);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('رقم فاتورة مفقود', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, invoiceNumber: undefined });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('رقم الفاتورة'))).toBe(true);
  });

  test('تاريخ فاتورة مفقود', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, invoiceDate: undefined });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('تاريخ'))).toBe(true);
  });

  test('اسم البائع مفقود', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, sellerName: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('البائع'))).toBe(true);
  });

  test('رقم ضريبي غير صالح', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, sellerVatNumber: '12345' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('ضريبي'))).toBe(true);
  });

  test('بنود فارغة', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, items: [] });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('بنود'))).toBe(true);
  });

  test('مبلغ إجمالي سالب', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, totalAmount: -100 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('الإجمالي'))).toBe(true);
  });

  test('نوع فاتورة غير صالح', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, invoiceTypeCode: '999' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('نوع'))).toBe(true);
  });

  test('null يُعيد خطأ', () => {
    const result = validateInvoiceForZatca(null);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('إشعار دائن 381 صالح', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, invoiceTypeCode: '381' });
    expect(result.isValid).toBe(true);
  });

  test('إشعار مدين 383 صالح', () => {
    const result = validateInvoiceForZatca({ ...validInvoice, invoiceTypeCode: '383' });
    expect(result.isValid).toBe(true);
  });
});

// ─── 14. roundTo2Decimals ────────────────────────────────────────────────────
describe('roundTo2Decimals — التقريب المحاسبي', () => {
  test('100.005 → 100.01', () => {
    expect(roundTo2Decimals(100.005)).toBe(100.01);
  });

  test('100.004 → 100', () => {
    expect(roundTo2Decimals(100.004)).toBe(100);
  });

  test('0 يبقى 0', () => {
    expect(roundTo2Decimals(0)).toBe(0);
  });

  test('أرقام صحيحة تبقى كما هي', () => {
    expect(roundTo2Decimals(1500)).toBe(1500);
  });

  test('1.005 → 1.01 (مشكلة الفاصلة العائمة)', () => {
    // Number.EPSILON تعالج هذا
    expect(roundTo2Decimals(1.005)).toBe(1.01);
  });

  test('أرقام سالبة', () => {
    // Math.round للأرقام السالبة يتجه نحو الصفر (Half-up toward zero)
    // -10.555 * 100 = -1055.4999... → Math.round = -1055 → -10.55
    expect(roundTo2Decimals(-10.555)).toBe(-10.55);
    expect(roundTo2Decimals(-10.504)).toBe(-10.5);
    expect(roundTo2Decimals(-10.506)).toBe(-10.51);
  });
});

// ─── 15. سيناريوهات متكاملة ───────────────────────────────────────────────────
describe('سيناريوهات متكاملة — End-to-End', () => {
  test('فاتورة جلسة علاج طبيعي معفاة مع QR Code كامل', () => {
    // 1. تحديد فئة الضريبة
    const category = getRehabServiceVatCategory('pt');
    expect(category).toBe('E');

    // 2. حساب مجاميع الفاتورة
    const items = [{ unitPrice: 300, quantity: 3, vatCategory: category }];
    const totals = calculateInvoiceTotals(items);
    expect(totals.exemptAmount).toBe(900);
    expect(totals.vatAmount).toBe(0);
    expect(totals.totalAmount).toBe(900);

    // 3. التحقق من صحة الفاتورة
    const invoice = {
      invoiceNumber: generateInvoiceNumber(2026, 1),
      invoiceDate: '2026-04-03',
      sellerName: VALID_SELLER_NAME,
      sellerVatNumber: VALID_VAT_NUMBER,
      items,
      totalAmount: totals.totalAmount,
      invoiceTypeCode: INVOICE_TYPES.STANDARD,
    };
    const validation = validateInvoiceForZatca(invoice);
    expect(validation.isValid).toBe(true);

    // 4. توليد QR Code
    const qr = generateZatcaQrCode({
      sellerName: VALID_SELLER_NAME,
      vatNumber: VALID_VAT_NUMBER,
      invoiceTimestamp: VALID_TIMESTAMP,
      totalAmount: totals.totalAmount,
      vatAmount: totals.vatAmount,
    });
    expect(typeof qr).toBe('string');

    // 5. التحقق من QR Code
    const decoded = decodeZatcaQrCode(qr);
    expect(decoded.totalAmount).toBe(900);
    expect(decoded.vatAmount).toBe(0);
  });

  test('فاتورة خدمات إدارية خاضعة للضريبة 15%', () => {
    const category = getRehabServiceVatCategory('administrative');
    expect(category).toBe('S');

    const items = [{ unitPrice: 1000, quantity: 1, vatCategory: category }];
    const totals = calculateInvoiceTotals(items);
    expect(totals.vatAmount).toBe(150);
    expect(totals.totalAmount).toBe(1150);

    const qr = generateZatcaQrCode({
      sellerName: VALID_SELLER_NAME,
      vatNumber: VALID_VAT_NUMBER,
      invoiceTimestamp: VALID_TIMESTAMP,
      totalAmount: totals.totalAmount,
      vatAmount: totals.vatAmount,
    });
    const decoded = decodeZatcaQrCode(qr);
    expect(decoded.vatAmount).toBe(150);
    expect(decoded.totalAmount).toBe(1150);
  });

  test('فاتورة مختلطة مع خصم وQR Code', () => {
    // علاج طبيعي (معفى) + تأجير معدات (خاضع)
    const ptCategory = getRehabServiceVatCategory('pt');
    const equipCategory = getRehabServiceVatCategory('equipment_rental');

    const discountResult = calculateDiscount(100, 10, 'percentage');
    expect(discountResult.discountAmount).toBe(10);

    const items = [
      { unitPrice: 500, quantity: 2, vatCategory: ptCategory, discountAmount: 100 },
      { unitPrice: 200, quantity: 1, vatCategory: equipCategory },
    ];
    const totals = calculateInvoiceTotals(items);

    // PT: (500*2 - 100) = 900 معفى
    // Equipment: 200 + 30 ضريبة = 230
    expect(totals.exemptAmount).toBe(900);
    expect(totals.taxableAmount).toBe(200);
    expect(totals.vatAmount).toBe(30);
    expect(totals.totalAmount).toBe(1130);
  });

  test('دورة حياة كاملة: فاتورة → إشعار دائن', () => {
    const invoiceNum = generateInvoiceNumber(2026, 42);
    expect(invoiceNum).toBe('INV-2026-0000042');

    const creditNoteNum = generateNoteNumber('credit', 2026, 42);
    expect(creditNoteNum).toBe('CN-2026-000042');

    // التحقق من صحة الإشعار
    const creditNote = {
      invoiceNumber: creditNoteNum,
      invoiceDate: '2026-04-03',
      sellerName: VALID_SELLER_NAME,
      sellerVatNumber: VALID_VAT_NUMBER,
      items: [{ unitPrice: 300, quantity: 1, vatCategory: 'E' }],
      totalAmount: 300,
      invoiceTypeCode: INVOICE_TYPES.CREDIT_NOTE,
    };
    const validation = validateInvoiceForZatca(creditNote);
    expect(validation.isValid).toBe(true);
  });

  test('استخراج الضريبة وإعادة حسابها يُعطي نفس النتيجة', () => {
    const original = calculateVat(1000, 'S');
    const totalWithVat = original.totalWithVat;

    const extracted = extractVatFromTotal(totalWithVat, 'S');
    expect(extracted.netAmount).toBe(1000);
    expect(extracted.vatAmount).toBe(original.vatAmount);
  });
});
