/**
 * ZATCA E-Invoicing Calculations Service
 * خدمة حسابات الفوترة الإلكترونية ZATCA - Phase 2
 *
 * Pure Business Logic - No HTTP, No DB
 * متوافق مع: ZATCA Phase 2 (Fatoora), VAT 15%, UBL 2.1
 * المملكة العربية السعودية
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// الثوابت
// ═══════════════════════════════════════════════════════════════

const VAT_RATE_STANDARD = 0.15; // 15% ضريبة القيمة المضافة القياسية
const VAT_RATE_ZERO = 0.0; // 0% معفاة صفرية
const VAT_RATE_EXEMPT = null; // معفاة كلياً (Exempt)

const VAT_CATEGORIES = {
  STANDARD: 'S', // خاضع للضريبة 15%
  ZERO_RATED: 'Z', // صفري الضريبة
  EXEMPT: 'E', // معفى
  OUT_OF_SCOPE: 'O', // خارج نطاق الضريبة
};

const INVOICE_TYPES = {
  STANDARD: '388', // فاتورة ضريبية
  CREDIT_NOTE: '381', // إشعار دائن
  DEBIT_NOTE: '383', // إشعار مدين
};

const INVOICE_SUBTYPES = {
  B2B: '0100000', // بين منشآت (يجب المسح - Clearance)
  B2C: '0200000', // للمستهلك (إبلاغ - Reporting)
};

// TLV Tags حسب مواصفات ZATCA
const TLV_TAGS = {
  SELLER_NAME: 1,
  VAT_NUMBER: 2,
  TIMESTAMP: 3,
  INVOICE_TOTAL: 4,
  VAT_TOTAL: 5,
};

// حدود الفاتورة المبسطة (B2C)
const SIMPLIFIED_INVOICE_THRESHOLD = 1000; // SAR

// رمز الدولة
const COUNTRY_CODE = 'SA';
const CURRENCY_CODE = 'SAR';

// ═══════════════════════════════════════════════════════════════
// دوال التحقق
// ═══════════════════════════════════════════════════════════════

/**
 * التحقق من صحة الرقم الضريبي السعودي (VAT Number)
 * يجب أن يبدأ بـ 3 وينتهي بـ 3 ومكون من 15 رقماً
 */
function validateVATNumber(vatNumber) {
  if (!vatNumber || typeof vatNumber !== 'string') {
    throw new Error('الرقم الضريبي مطلوب');
  }
  const cleaned = vatNumber.trim();
  if (!/^\d{15}$/.test(cleaned)) {
    throw new Error('الرقم الضريبي يجب أن يتكون من 15 رقماً');
  }
  if (!cleaned.startsWith('3')) {
    throw new Error('الرقم الضريبي السعودي يجب أن يبدأ بـ 3');
  }
  if (!cleaned.endsWith('3')) {
    throw new Error('الرقم الضريبي السعودي يجب أن ينتهي بـ 3');
  }
  return true;
}

/**
 * التحقق من صحة رقم الهوية الوطنية (10 أرقام) أو الإقامة
 */
function validateNationalId(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('رقم الهوية مطلوب');
  }
  if (!/^\d{10}$/.test(id.trim())) {
    throw new Error('رقم الهوية يجب أن يتكون من 10 أرقام');
  }
  return true;
}

/**
 * التحقق من صحة UUID
 */
function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('UUID مطلوب');
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID غير صالح');
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// حسابات ضريبة القيمة المضافة
// ═══════════════════════════════════════════════════════════════

/**
 * حساب ضريبة القيمة المضافة على مبلغ
 * @param {number} amount - المبلغ (قبل الضريبة)
 * @param {string} category - فئة الضريبة (S, Z, E, O)
 * @returns {{ taxableAmount, vatAmount, totalAmount, vatRate }}
 */
function calculateVAT(amount, category = VAT_CATEGORIES.STANDARD) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('المبلغ يجب أن يكون رقماً');
  }
  if (amount < 0) {
    throw new Error('المبلغ لا يمكن أن يكون سالباً');
  }
  if (!Object.values(VAT_CATEGORIES).includes(category)) {
    throw new Error(`فئة الضريبة غير صالحة: ${category}`);
  }

  let vatRate = 0;
  if (category === VAT_CATEGORIES.STANDARD) {
    vatRate = VAT_RATE_STANDARD;
  } else if (category === VAT_CATEGORIES.ZERO_RATED) {
    vatRate = VAT_RATE_ZERO;
  }
  // EXEMPT و OUT_OF_SCOPE = 0 ضريبة

  const vatAmount = Math.round(amount * vatRate * 100) / 100;
  const totalAmount = Math.round((amount + vatAmount) * 100) / 100;

  return {
    taxableAmount: Math.round(amount * 100) / 100,
    vatAmount,
    totalAmount,
    vatRate: vatRate * 100, // كنسبة مئوية
    category,
  };
}

/**
 * استخراج المبلغ قبل الضريبة من المبلغ الإجمالي (reverse calculation)
 * @param {number} totalAmount - المبلغ شامل الضريبة
 * @param {string} category - فئة الضريبة
 */
function extractAmountExcludingVAT(totalAmount, category = VAT_CATEGORIES.STANDARD) {
  if (typeof totalAmount !== 'number' || isNaN(totalAmount)) {
    throw new Error('المبلغ الإجمالي يجب أن يكون رقماً');
  }
  if (totalAmount < 0) {
    throw new Error('المبلغ لا يمكن أن يكون سالباً');
  }

  let divisor = 1;
  if (category === VAT_CATEGORIES.STANDARD) {
    divisor = 1 + VAT_RATE_STANDARD; // 1.15
  }

  const amountExclVAT = Math.round((totalAmount / divisor) * 100) / 100;
  const vatAmount = Math.round((totalAmount - amountExclVAT) * 100) / 100;

  return {
    amountExcludingVAT: amountExclVAT,
    vatAmount,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════
// حسابات الفاتورة
// ═══════════════════════════════════════════════════════════════

/**
 * حساب مبلغ الخصم
 * @param {number} price - السعر الأصلي
 * @param {number} discount - قيمة الخصم
 * @param {string} discountType - نوع الخصم: 'fixed' | 'percentage'
 */
function calculateDiscount(price, discount, discountType = 'fixed') {
  if (typeof price !== 'number' || price < 0) {
    throw new Error('السعر يجب أن يكون رقماً غير سالب');
  }
  if (typeof discount !== 'number' || discount < 0) {
    throw new Error('الخصم يجب أن يكون رقماً غير سالب');
  }
  if (!['fixed', 'percentage'].includes(discountType)) {
    throw new Error('نوع الخصم يجب أن يكون fixed أو percentage');
  }

  let discountAmount;
  if (discountType === 'percentage') {
    if (discount > 100) {
      throw new Error('نسبة الخصم لا يمكن أن تتجاوز 100%');
    }
    discountAmount = Math.round(price * (discount / 100) * 100) / 100;
  } else {
    if (discount > price) {
      throw new Error('مبلغ الخصم لا يمكن أن يتجاوز السعر');
    }
    discountAmount = Math.round(discount * 100) / 100;
  }

  const priceAfterDiscount = Math.round((price - discountAmount) * 100) / 100;

  return {
    originalPrice: Math.round(price * 100) / 100,
    discountAmount,
    priceAfterDiscount,
    discountPercentage: Math.round((discountAmount / price) * 10000) / 100,
  };
}

/**
 * حساب سطر فاتورة واحد (invoice line)
 * @param {Object} line - بيانات السطر
 */
function calculateInvoiceLine(line) {
  const {
    quantity,
    unitPrice,
    discount = 0,
    discountType = 'fixed',
    vatCategory = VAT_CATEGORIES.STANDARD,
  } = line;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('الكمية يجب أن تكون عدداً صحيحاً موجباً');
  }
  if (typeof unitPrice !== 'number' || unitPrice < 0) {
    throw new Error('سعر الوحدة يجب أن يكون رقماً غير سالب');
  }

  const grossAmount = Math.round(quantity * unitPrice * 100) / 100;

  let discountAmount = 0;
  if (discount > 0) {
    const discCalc = calculateDiscount(grossAmount, discount, discountType);
    discountAmount = discCalc.discountAmount;
  }

  const taxableAmount = Math.round((grossAmount - discountAmount) * 100) / 100;
  const vatResult = calculateVAT(taxableAmount, vatCategory);

  return {
    quantity,
    unitPrice: Math.round(unitPrice * 100) / 100,
    grossAmount,
    discountAmount,
    taxableAmount,
    vatCategory,
    vatRate: vatResult.vatRate,
    vatAmount: vatResult.vatAmount,
    lineTotal: vatResult.totalAmount,
  };
}

/**
 * حساب مجاميع الفاتورة الكاملة
 * @param {Array} lines - أسطر الفاتورة
 * @param {number} globalDiscount - خصم إضافي على الإجمالي
 */
function calculateInvoiceTotals(lines, globalDiscount = 0) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('يجب أن تحتوي الفاتورة على سطر واحد على الأقل');
  }
  if (typeof globalDiscount !== 'number' || globalDiscount < 0) {
    throw new Error('الخصم الإجمالي يجب أن يكون رقماً غير سالب');
  }

  const calculatedLines = lines.map((line, index) => {
    try {
      return calculateInvoiceLine(line);
    } catch (err) {
      throw new Error(`خطأ في السطر ${index + 1}: ${err.message}`);
    }
  });

  // تجميع حسب فئة الضريبة
  const vatBreakdown = {};
  let subtotal = 0;
  let totalVat = 0;
  let totalDiscount = 0;

  calculatedLines.forEach(line => {
    subtotal = Math.round((subtotal + line.grossAmount) * 100) / 100;
    totalDiscount = Math.round((totalDiscount + line.discountAmount) * 100) / 100;
    totalVat = Math.round((totalVat + line.vatAmount) * 100) / 100;

    const cat = line.vatCategory;
    if (!vatBreakdown[cat]) {
      vatBreakdown[cat] = { taxableAmount: 0, vatAmount: 0, vatRate: line.vatRate };
    }
    vatBreakdown[cat].taxableAmount =
      Math.round((vatBreakdown[cat].taxableAmount + line.taxableAmount) * 100) / 100;
    vatBreakdown[cat].vatAmount =
      Math.round((vatBreakdown[cat].vatAmount + line.vatAmount) * 100) / 100;
  });

  // تطبيق الخصم الإجمالي (على المبلغ الخاضع للضريبة)
  const taxableSubtotal = Math.round((subtotal - totalDiscount) * 100) / 100;

  if (globalDiscount > taxableSubtotal) {
    throw new Error('الخصم الإجمالي لا يمكن أن يتجاوز مجموع الفاتورة');
  }

  const grandTotal = Math.round((taxableSubtotal + totalVat) * 100) / 100;

  return {
    lines: calculatedLines,
    subtotal,
    totalDiscount,
    taxableAmount: taxableSubtotal,
    totalVat,
    grandTotal,
    vatBreakdown,
    currency: CURRENCY_CODE,
  };
}

// ═══════════════════════════════════════════════════════════════
// TLV Encoding لـ QR Code
// ═══════════════════════════════════════════════════════════════

/**
 * تشفير قيمة واحدة بتنسيق TLV
 * @param {number} tag - رقم الحقل (1-5)
 * @param {string} value - القيمة النصية
 * @returns {Buffer}
 */
function encodeTLVField(tag, value) {
  if (!Number.isInteger(tag) || tag < 1 || tag > 9) {
    throw new Error(`رقم الحقل غير صالح: ${tag}`);
  }
  if (typeof value !== 'string') {
    throw new Error('القيمة يجب أن تكون نصاً');
  }

  const valueBuffer = Buffer.from(value, 'utf8');
  const tagBuffer = Buffer.alloc(1);
  const lengthBuffer = Buffer.alloc(1);

  tagBuffer.writeUInt8(tag, 0);
  lengthBuffer.writeUInt8(valueBuffer.length, 0);

  return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

/**
 * توليد QR Code بتنسيق TLV حسب مواصفات ZATCA
 * Tags:
 *   1 = اسم البائع
 *   2 = الرقم الضريبي
 *   3 = تاريخ ووقت الفاتورة (ISO 8601)
 *   4 = إجمالي الفاتورة (شامل الضريبة)
 *   5 = إجمالي الضريبة
 *
 * @param {Object} invoiceData
 * @returns {string} Base64 encoded TLV
 */
function generateZATCAQRCode(invoiceData) {
  const { sellerName, vatNumber, invoiceDateTime, totalAmount, vatAmount } = invoiceData;

  if (!sellerName || typeof sellerName !== 'string' || sellerName.trim() === '') {
    throw new Error('اسم البائع مطلوب');
  }
  validateVATNumber(vatNumber);
  if (!invoiceDateTime || typeof invoiceDateTime !== 'string') {
    throw new Error('تاريخ الفاتورة مطلوب');
  }
  // التحقق من تنسيق ISO 8601
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(invoiceDateTime)) {
    throw new Error('تاريخ الفاتورة يجب أن يكون بتنسيق ISO 8601: YYYY-MM-DDTHH:mm:ssZ');
  }
  if (typeof totalAmount !== 'number' || totalAmount < 0) {
    throw new Error('المبلغ الإجمالي يجب أن يكون رقماً غير سالب');
  }
  if (typeof vatAmount !== 'number' || vatAmount < 0) {
    throw new Error('مبلغ الضريبة يجب أن يكون رقماً غير سالب');
  }

  const tlvBuffers = [
    encodeTLVField(TLV_TAGS.SELLER_NAME, sellerName.trim()),
    encodeTLVField(TLV_TAGS.VAT_NUMBER, vatNumber.trim()),
    encodeTLVField(TLV_TAGS.TIMESTAMP, invoiceDateTime),
    encodeTLVField(TLV_TAGS.INVOICE_TOTAL, totalAmount.toFixed(2)),
    encodeTLVField(TLV_TAGS.VAT_TOTAL, vatAmount.toFixed(2)),
  ];

  const combined = Buffer.concat(tlvBuffers);
  return combined.toString('base64');
}

/**
 * فك تشفير QR Code TLV (للتحقق)
 * @param {string} base64QR - QR Code بتنسيق Base64
 * @returns {Object} بيانات مفككة
 */
function decodeZATCAQRCode(base64QR) {
  if (!base64QR || typeof base64QR !== 'string') {
    throw new Error('QR Code مطلوب');
  }

  const buffer = Buffer.from(base64QR, 'base64');
  const result = {};
  const tagNames = {
    1: 'sellerName',
    2: 'vatNumber',
    3: 'invoiceDateTime',
    4: 'totalAmount',
    5: 'vatAmount',
  };

  let offset = 0;
  while (offset < buffer.length) {
    const tag = buffer.readUInt8(offset);
    const length = buffer.readUInt8(offset + 1);
    const value = buffer.slice(offset + 2, offset + 2 + length).toString('utf8');
    offset += 2 + length;

    if (tagNames[tag]) {
      result[tagNames[tag]] = value;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// حسابات الإشعارات (Credit/Debit Notes)
// ═══════════════════════════════════════════════════════════════

/**
 * حساب إشعار دائن (استرداد/تخفيض)
 * @param {Object} originalInvoice - الفاتورة الأصلية
 * @param {Array} refundLines - أسطر الاسترداد
 */
function calculateCreditNote(originalInvoice, refundLines) {
  if (!originalInvoice || typeof originalInvoice !== 'object') {
    throw new Error('بيانات الفاتورة الأصلية مطلوبة');
  }
  if (!refundLines || !Array.isArray(refundLines) || refundLines.length === 0) {
    throw new Error('يجب أن يحتوي الإشعار على سطر واحد على الأقل');
  }

  const creditTotals = calculateInvoiceTotals(refundLines);

  // التحقق من عدم تجاوز قيمة الفاتورة الأصلية
  if (creditTotals.grandTotal > originalInvoice.grandTotal) {
    throw new Error('قيمة الإشعار الدائن لا يمكن أن تتجاوز قيمة الفاتورة الأصلية');
  }

  return {
    type: INVOICE_TYPES.CREDIT_NOTE,
    originalInvoiceRef: originalInvoice.invoiceNumber,
    ...creditTotals,
    // قيم سالبة لإظهار الخصم
    netEffect: {
      taxableAmount: -creditTotals.taxableAmount,
      vatAmount: -creditTotals.totalVat,
      grandTotal: -creditTotals.grandTotal,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// التحقق من بيانات الفاتورة
// ═══════════════════════════════════════════════════════════════

/**
 * التحقق الكامل من صحة بيانات فاتورة ZATCA
 * @param {Object} invoice - بيانات الفاتورة
 * @returns {{ isValid, errors }}
 */
function validateInvoiceData(invoice) {
  const errors = [];

  if (!invoice || typeof invoice !== 'object') {
    return { isValid: false, errors: ['بيانات الفاتورة مطلوبة'] };
  }

  // التحقق من الحقول الإلزامية
  if (!invoice.invoiceNumber || typeof invoice.invoiceNumber !== 'string') {
    errors.push('رقم الفاتورة مطلوب');
  }
  if (!invoice.invoiceDate) {
    errors.push('تاريخ الفاتورة مطلوب');
  }
  if (!invoice.sellerName || invoice.sellerName.trim() === '') {
    errors.push('اسم البائع مطلوب');
  }
  if (!invoice.sellerVATNumber) {
    errors.push('الرقم الضريبي للبائع مطلوب');
  } else {
    try {
      validateVATNumber(invoice.sellerVATNumber);
    } catch (e) {
      errors.push(e.message);
    }
  }
  if (!invoice.invoiceType || !Object.values(INVOICE_TYPES).includes(invoice.invoiceType)) {
    errors.push('نوع الفاتورة غير صالح');
  }
  if (!Array.isArray(invoice.lines) || invoice.lines.length === 0) {
    errors.push('يجب أن تحتوي الفاتورة على سطر واحد على الأقل');
  }

  // التحقق من فاتورة B2B: يجب أن يكون لها الرقم الضريبي للمشتري
  if (invoice.invoiceSubType === INVOICE_SUBTYPES.B2B) {
    if (!invoice.buyerVATNumber) {
      errors.push('فاتورة B2B تتطلب الرقم الضريبي للمشتري');
    } else {
      try {
        validateVATNumber(invoice.buyerVATNumber);
      } catch (e) {
        errors.push(`رقم ضريبي المشتري: ${e.message}`);
      }
    }
  }

  // التحقق من تاريخ الاستحقاق
  if (invoice.dueDate && invoice.invoiceDate) {
    if (new Date(invoice.dueDate) < new Date(invoice.invoiceDate)) {
      errors.push('تاريخ الاستحقاق يجب أن يكون بعد أو يساوي تاريخ الفاتورة');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════
// تحليل وإحصاءات الفواتير
// ═══════════════════════════════════════════════════════════════

/**
 * تقرير ضريبة القيمة المضافة الشهري
 * @param {Array} invoices - قائمة الفواتير
 * @param {string} period - الفترة مثل '2025-01'
 */
function generateVATReport(invoices, period) {
  if (!Array.isArray(invoices)) {
    throw new Error('قائمة الفواتير يجب أن تكون مصفوفة');
  }
  if (!period || typeof period !== 'string' || !/^\d{4}-\d{2}$/.test(period)) {
    throw new Error('الفترة يجب أن تكون بتنسيق YYYY-MM');
  }

  let totalSales = 0;
  let totalVATCollected = 0;
  let totalPurchases = 0;
  let totalVATPaid = 0;
  let invoiceCount = 0;
  let creditNoteCount = 0;
  const vatByCategory = {};

  invoices.forEach(invoice => {
    if (invoice.invoiceType === INVOICE_TYPES.CREDIT_NOTE) {
      creditNoteCount++;
      totalSales = Math.round((totalSales - (invoice.taxableAmount || 0)) * 100) / 100;
      totalVATCollected = Math.round((totalVATCollected - (invoice.totalVat || 0)) * 100) / 100;
    } else {
      invoiceCount++;
      totalSales = Math.round((totalSales + (invoice.taxableAmount || 0)) * 100) / 100;
      totalVATCollected = Math.round((totalVATCollected + (invoice.totalVat || 0)) * 100) / 100;
    }

    // تجميع حسب الفئة
    if (invoice.vatBreakdown) {
      Object.entries(invoice.vatBreakdown).forEach(([cat, data]) => {
        if (!vatByCategory[cat]) {
          vatByCategory[cat] = { taxableAmount: 0, vatAmount: 0 };
        }
        vatByCategory[cat].taxableAmount =
          Math.round((vatByCategory[cat].taxableAmount + data.taxableAmount) * 100) / 100;
        vatByCategory[cat].vatAmount =
          Math.round((vatByCategory[cat].vatAmount + data.vatAmount) * 100) / 100;
      });
    }
  });

  const netVATDue = Math.round((totalVATCollected - totalVATPaid) * 100) / 100;

  return {
    period,
    sales: {
      totalTaxableAmount: totalSales,
      totalVATCollected,
      invoiceCount,
      creditNoteCount,
    },
    purchases: {
      totalPurchases,
      totalVATPaid,
    },
    vatByCategory,
    netVATDue,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * حساب إجماليات مجموعة فواتير (للتقارير)
 * @param {Array} invoices
 */
function summarizeInvoices(invoices) {
  if (!Array.isArray(invoices)) {
    throw new Error('قائمة الفواتير يجب أن تكون مصفوفة');
  }

  const summary = {
    total: invoices.length,
    totalGrandAmount: 0,
    totalVAT: 0,
    totalTaxable: 0,
    byStatus: {},
    byType: {},
  };

  invoices.forEach(inv => {
    summary.totalGrandAmount =
      Math.round((summary.totalGrandAmount + (inv.grandTotal || 0)) * 100) / 100;
    summary.totalVAT = Math.round((summary.totalVAT + (inv.totalVat || 0)) * 100) / 100;
    summary.totalTaxable =
      Math.round((summary.totalTaxable + (inv.taxableAmount || 0)) * 100) / 100;

    const status = inv.status || 'unknown';
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

    const type = inv.invoiceType || 'unknown';
    summary.byType[type] = (summary.byType[type] || 0) + 1;
  });

  return summary;
}

/**
 * التحقق من حالة ZATCA الواجبة حسب نوع الفاتورة
 * B2B > 1000 SAR → مسح (Clearance)
 * B2C أو أقل من 1000 SAR → إبلاغ (Reporting)
 */
function determineZATCARequirement(invoice) {
  if (!invoice || typeof invoice !== 'object') {
    throw new Error('بيانات الفاتورة مطلوبة');
  }

  const isB2B = invoice.invoiceSubType === INVOICE_SUBTYPES.B2B;
  const isHighValue = (invoice.grandTotal || 0) >= SIMPLIFIED_INVOICE_THRESHOLD;

  let requirement;
  if (isB2B) {
    requirement = 'clearance'; // مسح إلزامي
  } else if (isHighValue) {
    requirement = 'reporting'; // إبلاغ
  } else {
    requirement = 'simplified_reporting'; // إبلاغ مبسط
  }

  return {
    requirement,
    isB2B,
    isHighValue,
    threshold: SIMPLIFIED_INVOICE_THRESHOLD,
    description: {
      clearance: 'مسح إلزامي - يجب الحصول على موافقة ZATCA قبل إرسال الفاتورة',
      reporting: 'إبلاغ - يجب إرسال الفاتورة لـ ZATCA خلال 24 ساعة',
      simplified_reporting: 'إبلاغ مبسط - إرسال دفعي مسموح',
    }[requirement],
  };
}

// ═══════════════════════════════════════════════════════════════
// الصادرات
// ═══════════════════════════════════════════════════════════════

module.exports = {
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
};
