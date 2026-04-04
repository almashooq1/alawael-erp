'use strict';

/**
 * خدمة حسابات ZATCA وضريبة القيمة المضافة السعودية
 * ZATCA VAT Calculation Service — Saudi Arabia
 *
 * يغطي:
 *  - حساب ضريبة القيمة المضافة (15% قياسي، 0%، معفي)
 *  - تشفير TLV للـ QR Code (مواصفات ZATCA)
 *  - حساب مجاميع الفاتورة (قبل/بعد الضريبة)
 *  - التحقق من صحة الرقم الضريبي السعودي
 *  - توليد أرقام الفواتير
 *  - تصنيف بنود الفاتورة وأسباب الإعفاء
 *
 * المراجع:
 *  - نظام ضريبة القيمة المضافة - هيئة الزكاة والضريبة والجمارك
 *  - ZATCA e-Invoicing Phase 2 (Fatoora) Requirements v3.2
 *  - UBL 2.1 Standard
 */

// ─── ثوابت ───────────────────────────────────────────────────────────────────

/** معدل ضريبة القيمة المضافة القياسي في المملكة */
const VAT_RATE_STANDARD = 0.15;

/** معدل ضريبة القيمة المضافة الصفري */
const VAT_RATE_ZERO = 0.0;

/** فئات ضريبة القيمة المضافة */
const VAT_CATEGORIES = {
  STANDARD: 'S', // خاضع للضريبة 15%
  ZERO: 'Z', // صفري الضريبة
  EXEMPT: 'E', // معفي من الضريبة
  NOT_SUBJECT: 'O', // غير خاضع للضريبة (خارج النطاق)
};

/** أنواع الفواتير (رموز UBL) */
const INVOICE_TYPES = {
  STANDARD: '388', // فاتورة ضريبية
  DEBIT_NOTE: '383', // إشعار دائن
  CREDIT_NOTE: '381', // إشعار مدين
};

/** الفئات الفرعية لأنواع الفواتير */
const INVOICE_SUBTYPES = {
  B2B: '01', // بين شركات (يستلزم المسح)
  B2C: '02', // للمستهلك (يستلزم الإبلاغ فقط)
};

/** حجم رقم الضريبة السعودي */
const VAT_NUMBER_LENGTH = 15;

// ─── التحقق من الرقم الضريبي ─────────────────────────────────────────────────

/**
 * التحقق من صحة الرقم الضريبي السعودي
 * يبدأ بـ 3، وينتهي بـ 3، ومكون من 15 رقماً
 * @param {string} vatNumber
 * @returns {boolean}
 */
function isValidVatNumber(vatNumber) {
  if (typeof vatNumber !== 'string') return false;
  if (vatNumber.length !== VAT_NUMBER_LENGTH) return false;
  if (!/^\d{15}$/.test(vatNumber)) return false;
  if (!vatNumber.startsWith('3')) return false;
  if (!vatNumber.endsWith('3')) return false;
  return true;
}

// ─── حسابات ضريبة القيمة المضافة ─────────────────────────────────────────────

/**
 * حساب ضريبة القيمة المضافة لمبلغ معين
 * @param {number} amount - المبلغ قبل الضريبة
 * @param {string} [category='S'] - فئة الضريبة (S, Z, E, O)
 * @returns {{vatAmount, totalWithVat, vatRate, vatCategory}}
 */
function calculateVat(amount, category = VAT_CATEGORIES.STANDARD) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error(`المبلغ غير صالح: ${amount}`);
  }

  const validCategories = Object.values(VAT_CATEGORIES);
  if (!validCategories.includes(category)) {
    throw new Error(`فئة ضريبة غير صالحة: ${category}. المتاح: ${validCategories.join(', ')}`);
  }

  let vatRate = 0;
  if (category === VAT_CATEGORIES.STANDARD) {
    vatRate = VAT_RATE_STANDARD;
  } else if (category === VAT_CATEGORIES.ZERO) {
    vatRate = VAT_RATE_ZERO;
  }
  // EXEMPT و NOT_SUBJECT: لا ضريبة

  const vatAmount = roundTo2Decimals(amount * vatRate);
  const totalWithVat = roundTo2Decimals(amount + vatAmount);

  return {
    taxableAmount: roundTo2Decimals(amount),
    vatAmount,
    totalWithVat,
    vatRate,
    vatCategory: category,
  };
}

/**
 * استخراج المبلغ قبل الضريبة من مبلغ شامل للضريبة (VAT-inclusive)
 * @param {number} totalIncludingVat - المبلغ الإجمالي شامل الضريبة
 * @param {string} [category='S']
 * @returns {{netAmount, vatAmount, vatRate}}
 */
function extractVatFromTotal(totalIncludingVat, category = VAT_CATEGORIES.STANDARD) {
  if (typeof totalIncludingVat !== 'number' || isNaN(totalIncludingVat) || totalIncludingVat < 0) {
    throw new Error(`المبلغ الإجمالي غير صالح: ${totalIncludingVat}`);
  }

  let vatRate = 0;
  if (category === VAT_CATEGORIES.STANDARD) {
    vatRate = VAT_RATE_STANDARD;
  }

  if (vatRate === 0) {
    return {
      netAmount: roundTo2Decimals(totalIncludingVat),
      vatAmount: 0,
      vatRate: 0,
    };
  }

  const netAmount = roundTo2Decimals(totalIncludingVat / (1 + vatRate));
  const vatAmount = roundTo2Decimals(totalIncludingVat - netAmount);

  return { netAmount, vatAmount, vatRate };
}

// ─── حسابات الفاتورة الكاملة ──────────────────────────────────────────────────

/**
 * حساب مجاميع الفاتورة الكاملة من بنودها
 * @param {Array<{unitPrice, quantity, discountAmount, vatCategory}>} items
 * @returns {{subtotal, totalDiscount, taxableAmount, exemptAmount, zeroRatedAmount, vatAmount, totalAmount, itemsWithVat}}
 */
function calculateInvoiceTotals(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('بنود الفاتورة يجب أن تكون مصفوفة غير فارغة');
  }

  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let exemptAmount = 0;
  let zeroRatedAmount = 0;
  let vatAmount = 0;

  const itemsWithVat = items.map((item, index) => {
    const qty = item.quantity || 1;
    const unitPrice = item.unitPrice || 0;
    const discount = item.discountAmount || 0;
    const category = item.vatCategory || VAT_CATEGORIES.STANDARD;

    if (typeof unitPrice !== 'number' || isNaN(unitPrice)) {
      throw new Error(`سعر البند #${index + 1} غير صالح`);
    }

    const lineTotal = roundTo2Decimals(qty * unitPrice);
    const lineAfterDiscount = roundTo2Decimals(lineTotal - discount);

    const vatCalc = calculateVat(lineAfterDiscount, category);

    subtotal += lineTotal;
    totalDiscount += discount;

    if (category === VAT_CATEGORIES.STANDARD) {
      taxableAmount += lineAfterDiscount;
      vatAmount += vatCalc.vatAmount;
    } else if (category === VAT_CATEGORIES.EXEMPT) {
      exemptAmount += lineAfterDiscount;
    } else if (category === VAT_CATEGORIES.ZERO) {
      zeroRatedAmount += lineAfterDiscount;
    }

    return {
      ...item,
      lineTotal,
      lineAfterDiscount,
      vatAmount: vatCalc.vatAmount,
      totalWithVat: vatCalc.totalWithVat,
      vatRate: vatCalc.vatRate,
    };
  });

  const totalAmount = roundTo2Decimals(taxableAmount + exemptAmount + zeroRatedAmount + vatAmount);

  return {
    subtotal: roundTo2Decimals(subtotal),
    totalDiscount: roundTo2Decimals(totalDiscount),
    taxableAmount: roundTo2Decimals(taxableAmount),
    exemptAmount: roundTo2Decimals(exemptAmount),
    zeroRatedAmount: roundTo2Decimals(zeroRatedAmount),
    vatAmount: roundTo2Decimals(vatAmount),
    totalAmount,
    itemsWithVat,
  };
}

// ─── TLV Encoding (ZATCA QR Code) ────────────────────────────────────────────

/**
 * تشفير قيمة واحدة بصيغة TLV (Tag-Length-Value)
 * المواصفة: ZATCA e-Invoicing - Appendix A
 * @param {number} tag - رقم الوسم (1-5)
 * @param {string} value - القيمة النصية
 * @returns {Buffer}
 */
function encodeTlvField(tag, value) {
  if (typeof value !== 'string') {
    throw new Error(`قيمة الوسم ${tag} يجب أن تكون نصاً`);
  }

  const valueBuffer = Buffer.from(value, 'utf8');
  const tagBuffer = Buffer.alloc(1);
  tagBuffer.writeUInt8(tag);
  const lengthBuffer = Buffer.alloc(1);
  lengthBuffer.writeUInt8(valueBuffer.length);

  return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

/**
 * توليد QR Code بتنسيق TLV حسب مواصفات ZATCA
 *
 * الوسوم:
 *   Tag 1: اسم البائع (Seller's name)
 *   Tag 2: الرقم الضريبي للبائع (VAT registration number)
 *   Tag 3: تاريخ ووقت إصدار الفاتورة (Timestamp)
 *   Tag 4: إجمالي الفاتورة شامل الضريبة (Invoice total)
 *   Tag 5: إجمالي ضريبة القيمة المضافة (VAT total)
 *
 * @param {{sellerName, vatNumber, invoiceTimestamp, totalAmount, vatAmount}} data
 * @returns {string} Base64 encoded TLV string
 */
function generateZatcaQrCode(data) {
  const { sellerName, vatNumber, invoiceTimestamp, totalAmount, vatAmount } = data;

  if (!sellerName || typeof sellerName !== 'string') {
    throw new Error('اسم البائع مطلوب');
  }
  if (!isValidVatNumber(vatNumber)) {
    throw new Error(`الرقم الضريبي غير صالح: ${vatNumber}`);
  }
  if (!invoiceTimestamp || typeof invoiceTimestamp !== 'string') {
    throw new Error('تاريخ ووقت الفاتورة مطلوب');
  }
  if (typeof totalAmount !== 'number' || isNaN(totalAmount)) {
    throw new Error('إجمالي الفاتورة غير صالح');
  }
  if (typeof vatAmount !== 'number' || isNaN(vatAmount)) {
    throw new Error('مبلغ ضريبة القيمة المضافة غير صالح');
  }

  const tlvBuffer = Buffer.concat([
    encodeTlvField(1, sellerName),
    encodeTlvField(2, vatNumber),
    encodeTlvField(3, invoiceTimestamp),
    encodeTlvField(4, totalAmount.toFixed(2)),
    encodeTlvField(5, vatAmount.toFixed(2)),
  ]);

  return tlvBuffer.toString('base64');
}

/**
 * فك تشفير QR Code من Base64 TLV للتحقق منه
 * @param {string} base64Qr
 * @returns {{sellerName, vatNumber, invoiceTimestamp, totalAmount, vatAmount}}
 */
function decodeZatcaQrCode(base64Qr) {
  if (typeof base64Qr !== 'string') {
    throw new Error('QR Code يجب أن يكون نصاً Base64');
  }

  const buffer = Buffer.from(base64Qr, 'base64');
  const result = {};
  const tagNames = {
    1: 'sellerName',
    2: 'vatNumber',
    3: 'invoiceTimestamp',
    4: 'totalAmount',
    5: 'vatAmount',
  };

  let offset = 0;
  while (offset < buffer.length) {
    const tag = buffer.readUInt8(offset);
    offset++;
    const length = buffer.readUInt8(offset);
    offset++;
    const value = buffer.slice(offset, offset + length).toString('utf8');
    offset += length;

    const fieldName = tagNames[tag];
    if (fieldName) {
      result[fieldName] = value;
    }
  }

  // تحويل الأرقام
  if (result.totalAmount) result.totalAmount = parseFloat(result.totalAmount);
  if (result.vatAmount) result.vatAmount = parseFloat(result.vatAmount);

  return result;
}

// ─── توليد أرقام الفواتير ─────────────────────────────────────────────────────

/**
 * توليد رقم فاتورة بالصيغة السعودية: INV-YYYY-XXXXXXX
 * @param {number} year - السنة (رباعية)
 * @param {number} sequence - الرقم التسلسلي
 * @returns {string}
 */
function generateInvoiceNumber(year, sequence) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`سنة غير صالحة: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`الرقم التسلسلي يجب أن يكون عدداً صحيحاً موجباً: ${sequence}`);
  }
  return `INV-${year}-${String(sequence).padStart(7, '0')}`;
}

/**
 * توليد رقم إشعار دائن/مدين
 * @param {string} type - 'credit' أو 'debit'
 * @param {number} year
 * @param {number} sequence
 * @returns {string}
 */
function generateNoteNumber(type, year, sequence) {
  const prefix = type === 'credit' ? 'CN' : 'DN';
  if (!['credit', 'debit'].includes(type)) {
    throw new Error(`نوع غير صالح: ${type}`);
  }
  if (!Number.isInteger(year) || year < 2000) {
    throw new Error(`سنة غير صالحة: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`الرقم التسلسلي يجب أن يكون موجباً: ${sequence}`);
  }
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

// ─── حساب الخصومات ────────────────────────────────────────────────────────────

/**
 * حساب مبلغ الخصم
 * @param {number} amount - المبلغ الأصلي
 * @param {number} discountValue - قيمة الخصم
 * @param {'percentage'|'fixed'} discountType - نوع الخصم
 * @returns {{discountAmount, amountAfterDiscount}}
 */
function calculateDiscount(amount, discountValue, discountType = 'fixed') {
  if (typeof amount !== 'number' || amount < 0) {
    throw new Error(`المبلغ غير صالح: ${amount}`);
  }
  if (typeof discountValue !== 'number' || discountValue < 0) {
    throw new Error(`قيمة الخصم غير صالحة: ${discountValue}`);
  }

  let discountAmount = 0;

  if (discountType === 'percentage') {
    if (discountValue > 100) {
      throw new Error('نسبة الخصم لا يمكن أن تتجاوز 100%');
    }
    discountAmount = roundTo2Decimals(amount * (discountValue / 100));
  } else if (discountType === 'fixed') {
    if (discountValue > amount) {
      throw new Error('قيمة الخصم لا يمكن أن تتجاوز المبلغ الأصلي');
    }
    discountAmount = roundTo2Decimals(discountValue);
  } else {
    throw new Error(`نوع خصم غير صالح: ${discountType}`);
  }

  const amountAfterDiscount = roundTo2Decimals(amount - discountAmount);

  return { discountAmount, amountAfterDiscount };
}

// ─── تحديد فئة الضريبة لخدمات التأهيل ───────────────────────────────────────

/**
 * تحديد فئة ضريبة القيمة المضافة لخدمات مراكز التأهيل
 * بناءً على قرارات هيئة الزكاة والضريبة والجمارك
 *
 * الخدمات الصحية المعتمدة = معفاة من الضريبة (VAT_CATEGORIES.EXEMPT)
 * المستلزمات والأجهزة = خاضعة للضريبة (VAT_CATEGORIES.STANDARD)
 *
 * @param {string} serviceType - نوع الخدمة
 * @returns {string} فئة الضريبة
 */
function getRehabServiceVatCategory(serviceType) {
  const exemptServices = [
    'pt', // علاج طبيعي
    'ot', // علاج وظيفي
    'speech', // علاج نطق ولغة
    'aba', // تحليل السلوك التطبيقي
    'psychology', // خدمات نفسية
    'special_education', // تربية خاصة
    'vocational', // تأهيل مهني
    'nursing', // تمريض
    'medical', // خدمات طبية
    'assessment', // تقييم وتشخيص
    'consultation', // استشارة طبية
  ];

  const standardServices = [
    'equipment_rental', // تأجير معدات
    'transportation', // نقل (غير مرتبط بالعلاج)
    'catering', // تموين
    'administrative', // خدمات إدارية
    'training_external', // تدريب خارجي
  ];

  if (exemptServices.includes(serviceType)) {
    return VAT_CATEGORIES.EXEMPT;
  }
  if (standardServices.includes(serviceType)) {
    return VAT_CATEGORIES.STANDARD;
  }
  // افتراضي: خاضع للضريبة
  return VAT_CATEGORIES.STANDARD;
}

// ─── تقريب الأرقام ────────────────────────────────────────────────────────────

/**
 * تقريب رقم إلى منزلتين عشريتين (محاسبي)
 * @param {number} value
 * @returns {number}
 */
function roundTo2Decimals(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ─── التحقق من بيانات الفاتورة ───────────────────────────────────────────────

/**
 * التحقق من صحة بيانات الفاتورة قبل الإرسال إلى ZATCA
 * @param {object} invoice
 * @returns {{isValid, errors}}
 */
function validateInvoiceForZatca(invoice) {
  const errors = [];

  if (!invoice) {
    return { isValid: false, errors: ['بيانات الفاتورة مطلوبة'] };
  }

  if (!invoice.invoiceNumber) errors.push('رقم الفاتورة مطلوب');
  if (!invoice.invoiceDate) errors.push('تاريخ الفاتورة مطلوب');
  if (!invoice.sellerName) errors.push('اسم البائع مطلوب');
  if (!isValidVatNumber(invoice.sellerVatNumber)) {
    errors.push('الرقم الضريبي للبائع غير صالح (يجب أن يكون 15 رقماً يبدأ وينتهي بـ 3)');
  }
  if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
    errors.push('بنود الفاتورة مطلوبة');
  }
  if (typeof invoice.totalAmount !== 'number' || invoice.totalAmount < 0) {
    errors.push('المبلغ الإجمالي غير صالح');
  }
  if (!Object.values(INVOICE_TYPES).includes(invoice.invoiceTypeCode)) {
    errors.push(`نوع الفاتورة غير صالح. المتاح: ${Object.values(INVOICE_TYPES).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ─── الصادرات ─────────────────────────────────────────────────────────────────

module.exports = {
  // الحسابات الضريبية
  calculateVat,
  extractVatFromTotal,
  calculateInvoiceTotals,
  calculateDiscount,

  // QR Code ZATCA
  encodeTlvField,
  generateZatcaQrCode,
  decodeZatcaQrCode,

  // توليد الأرقام
  generateInvoiceNumber,
  generateNoteNumber,

  // التحقق والتصنيف
  isValidVatNumber,
  validateInvoiceForZatca,
  getRehabServiceVatCategory,

  // مساعد
  roundTo2Decimals,

  // الثوابت
  VAT_RATE_STANDARD,
  VAT_RATE_ZERO,
  VAT_CATEGORIES,
  INVOICE_TYPES,
  INVOICE_SUBTYPES,
  VAT_NUMBER_LENGTH,
};
