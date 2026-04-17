'use strict';

/**
 * Finance Calculations Service
 * خدمة حسابات المالية والفوترة
 * VAT 15% + ZATCA + شجرة الحسابات + مطالبات التأمين + إحصائيات
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

// ========================================
// CONSTANTS
// ========================================
const FINANCE_CONSTANTS = {
  VAT_RATE: 0.15, // 15% ضريبة القيمة المضافة
  VAT_RATE_PERCENT: 15,

  INVOICE_TYPES: {
    STANDARD: 'standard',
    SIMPLIFIED: 'simplified',
    DEBIT_NOTE: 'debit_note',
    CREDIT_NOTE: 'credit_note',
  },

  INVOICE_SUB_TYPES: {
    B2B: 'B2B',
    B2C: 'B2C',
  },

  VAT_CATEGORIES: {
    STANDARD: 'standard', // خاضع للضريبة 15%
    EXEMPT: 'exempt', // معفى
    ZERO_RATED: 'zero_rated', // صفري
  },

  PAYMENT_METHODS: {
    CASH: 'cash',
    CARD: 'card',
    BANK_TRANSFER: 'bank_transfer',
    INSURANCE: 'insurance',
    MADA: 'mada',
    APPLE_PAY: 'apple_pay',
    STC_PAY: 'stc_pay',
  },

  INVOICE_STATUS: {
    DRAFT: 'draft',
    ISSUED: 'issued',
    SENT: 'sent',
    PARTIALLY_PAID: 'partially_paid',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  },

  CLAIM_STATUS: {
    DRAFT: 'draft',
    ELIGIBILITY_CHECK: 'eligibility_check',
    PRIOR_AUTH_PENDING: 'prior_auth_pending',
    PRIOR_AUTH_APPROVED: 'prior_auth_approved',
    PRIOR_AUTH_DENIED: 'prior_auth_denied',
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    PARTIALLY_APPROVED: 'partially_approved',
    DENIED: 'denied',
    PAID: 'paid',
    WRITE_OFF: 'write_off',
  },

  ACCOUNT_TYPES: {
    ASSET: 'asset',
    LIABILITY: 'liability',
    EQUITY: 'equity',
    REVENUE: 'revenue',
    EXPENSE: 'expense',
  },

  NORMAL_BALANCE: {
    DEBIT: 'debit',
    CREDIT: 'credit',
  },

  // حدود العمر للديون
  AGING_BUCKETS: [
    { label: 'current', minDays: 0, maxDays: 30 },
    { label: '31-60', minDays: 31, maxDays: 60 },
    { label: '61-90', minDays: 61, maxDays: 90 },
    { label: '91-120', minDays: 91, maxDays: 120 },
    { label: 'over_120', minDays: 121, maxDays: Infinity },
  ],

  // تسعيرة الجلسات الافتراضية (ريال سعودي)
  DEFAULT_SESSION_PRICES: {
    pt: { individual_45: 200, individual_60: 250, group_45: 100 },
    ot: { individual_45: 200, individual_60: 250, group_45: 100 },
    speech: { individual_45: 200, individual_60: 250, group_45: 100 },
    aba: { individual_60: 300, individual_90: 400, group_60: 150 },
    psychology: { individual_60: 350 },
    special_education: { individual_60: 250, group_60: 120 },
    vocational: { individual_60: 200 },
    assessment: { full_assessment: 800 },
  },
};

// ========================================
// VAT CALCULATIONS
// ========================================

/**
 * حساب ضريبة القيمة المضافة
 * @param {number} amount - المبلغ
 * @param {string} category - standard|exempt|zero_rated
 * @param {boolean} priceIncludesVat - هل السعر شامل الضريبة؟
 * @returns {object} - {taxableAmount, vatAmount, totalWithVat}
 */
function calculateVAT(amount, category = 'standard', priceIncludesVat = false) {
  if (typeof amount !== 'number' || amount < 0) {
    return { taxableAmount: 0, vatAmount: 0, totalWithVat: 0, vatRate: 0 };
  }

  if (
    category === FINANCE_CONSTANTS.VAT_CATEGORIES.EXEMPT ||
    category === FINANCE_CONSTANTS.VAT_CATEGORIES.ZERO_RATED
  ) {
    return {
      taxableAmount: amount,
      vatAmount: 0,
      totalWithVat: amount,
      vatRate: 0,
      category,
    };
  }

  // standard 15%
  if (priceIncludesVat) {
    // استخراج الضريبة من السعر الشامل
    const taxableAmount = round2(amount / 1.15);
    const vatAmount = round2(amount - taxableAmount);
    return {
      taxableAmount,
      vatAmount,
      totalWithVat: amount,
      vatRate: FINANCE_CONSTANTS.VAT_RATE_PERCENT,
      category,
    };
  } else {
    const vatAmount = round2(amount * FINANCE_CONSTANTS.VAT_RATE);
    return {
      taxableAmount: amount,
      vatAmount,
      totalWithVat: round2(amount + vatAmount),
      vatRate: FINANCE_CONSTANTS.VAT_RATE_PERCENT,
      category,
    };
  }
}

/**
 * حساب ضريبة القيمة المضافة لعناصر فاتورة متعددة
 * @param {Array} items - [{amount, category, priceIncludesVat}]
 * @returns {object}
 */
function calculateInvoiceVAT(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { subtotal: 0, totalVat: 0, grandTotal: 0, items: [] };
  }

  let subtotal = 0;
  let totalVat = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = item.quantity || 1;
    const unitPrice = item.unitPrice || item.price || 0;
    const discountAmount = calculateDiscount(unitPrice * qty, item.discount, item.discountType);
    const taxableAmount = round2(unitPrice * qty - discountAmount);

    const vatCalc = calculateVAT(taxableAmount, item.vatCategory || 'standard', false);

    subtotal += taxableAmount;
    totalVat += vatCalc.vatAmount;

    processedItems.push({
      ...item,
      quantity: qty,
      unitPrice,
      discountAmount,
      taxableAmount,
      vatAmount: vatCalc.vatAmount,
      totalAmount: vatCalc.totalWithVat,
      vatRate: vatCalc.vatRate,
    });
  }

  return {
    subtotal: round2(subtotal),
    totalVat: round2(totalVat),
    grandTotal: round2(subtotal + totalVat),
    items: processedItems,
  };
}

/**
 * حساب الخصم
 * @param {number} amount
 * @param {number} discount
 * @param {string} discountType - 'fixed'|'percentage'
 * @returns {number}
 */
function calculateDiscount(amount, discount, discountType = 'fixed') {
  if (!discount || discount <= 0) return 0;
  if (discountType === 'percentage') {
    return round2(amount * (discount / 100));
  }
  return round2(Math.min(discount, amount));
}

// ========================================
// INVOICE CALCULATIONS
// ========================================

/**
 * حساب مبالغ الفاتورة الكاملة
 * @param {object} invoice - {items, discountAmount, discountType}
 * @returns {object}
 */
function calculateInvoiceTotals(invoice) {
  if (!invoice || !Array.isArray(invoice.items)) {
    return { isValid: false };
  }

  const vatResult = calculateInvoiceVAT(invoice.items);

  // خصم على مستوى الفاتورة
  const invoiceDiscount = calculateDiscount(
    vatResult.subtotal,
    invoice.invoiceDiscount || 0,
    invoice.invoiceDiscountType || 'fixed'
  );

  const taxableAfterDiscount = round2(vatResult.subtotal - invoiceDiscount);

  // إعادة حساب VAT بعد الخصم (إذا كان خصم على الفاتورة)
  const adjustedVat = invoice.invoiceDiscount
    ? round2(taxableAfterDiscount * FINANCE_CONSTANTS.VAT_RATE)
    : vatResult.totalVat;

  return {
    isValid: true,
    subtotal: vatResult.subtotal,
    invoiceDiscount,
    taxableAmount: taxableAfterDiscount,
    vatAmount: adjustedVat,
    grandTotal: round2(taxableAfterDiscount + adjustedVat),
    remainingAmount: round2(taxableAfterDiscount + adjustedVat - (invoice.paidAmount || 0)),
    items: vatResult.items,
  };
}

/**
 * حساب حالة دفع الفاتورة
 * @param {number} totalAmount
 * @param {number} paidAmount
 * @returns {string} - payment status
 */
function calculatePaymentStatus(totalAmount, paidAmount) {
  if (typeof totalAmount !== 'number' || typeof paidAmount !== 'number') return 'unpaid';
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount >= totalAmount) return 'paid';
  return 'partial';
}

/**
 * توليد رقم فاتورة
 * @param {string} prefix - 'INV'|'CN'|'DN'
 * @param {number} year
 * @param {number} sequence
 * @returns {string}
 */
function generateInvoiceNumber(prefix, year, sequence) {
  return `${prefix}-${year}-${String(sequence).padStart(7, '0')}`;
}

/**
 * حساب تاريخ الاستحقاق
 * @param {string} invoiceDate - 'YYYY-MM-DD'
 * @param {number} netDays - صافي أيام الدفع
 * @returns {string}
 */
function calculateDueDate(invoiceDate, netDays = 30) {
  if (!invoiceDate) return null;
  const date = new Date(invoiceDate);
  if (isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + netDays);
  return date.toISOString().split('T')[0];
}

/**
 * تحقق من تأخر الفاتورة
 * @param {string} dueDate
 * @param {string} currentDate
 * @returns {object}
 */
function checkInvoiceOverdue(dueDate, currentDate = new Date().toISOString().split('T')[0]) {
  if (!dueDate) return { isOverdue: false, daysOverdue: 0 };
  const due = new Date(dueDate);
  const current = new Date(currentDate);
  if (isNaN(due.getTime())) return { isOverdue: false, daysOverdue: 0 };

  const diffMs = current - due;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    isOverdue: diffDays > 0,
    daysOverdue: Math.max(0, diffDays),
  };
}

// ========================================
// ZATCA QR CODE GENERATION (TLV)
// ========================================

/**
 * توليد محتوى TLV لـ QR Code حسب مواصفات ZATCA
 * Tag 1: اسم البائع
 * Tag 2: الرقم الضريبي
 * Tag 3: تاريخ ووقت الفاتورة
 * Tag 4: إجمالي الفاتورة
 * Tag 5: مبلغ الضريبة
 * @returns {object} - {tlvFields, base64QR}
 */
function generateZatcaQRData(invoiceData) {
  if (!invoiceData) return { isValid: false };

  const { sellerName, vatNumber, invoiceDateTime, totalAmount, vatAmount } = invoiceData;

  if (!sellerName || !vatNumber || !invoiceDateTime) {
    return { isValid: false, error: 'بيانات ناقصة لإنشاء QR Code' };
  }

  const fields = [
    { tag: 1, value: sellerName },
    { tag: 2, value: vatNumber },
    { tag: 3, value: invoiceDateTime },
    { tag: 4, value: String(round2(totalAmount || 0)) },
    { tag: 5, value: String(round2(vatAmount || 0)) },
  ];

  // بناء TLV
  let tlvHex = '';
  for (const field of fields) {
    const valueBytes = Buffer.from(field.value, 'utf8');
    const tagHex = field.tag.toString(16).padStart(2, '0');
    const lenHex = valueBytes.length.toString(16).padStart(2, '0');
    tlvHex += tagHex + lenHex + valueBytes.toString('hex');
  }

  const base64QR = Buffer.from(tlvHex, 'hex').toString('base64');

  return {
    isValid: true,
    fields,
    tlvHex,
    base64QR,
  };
}

/**
 * التحقق من صحة الرقم الضريبي السعودي (15 رقم)
 * @param {string} vatNumber
 * @returns {boolean}
 */
function validateVatNumber(vatNumber) {
  if (!vatNumber) return false;
  const cleaned = String(vatNumber).replace(/\s/g, '');
  return /^\d{15}$/.test(cleaned);
}

/**
 * التحقق من صحة رقم IBAN السعودي
 * @param {string} iban
 * @returns {boolean}
 */
function validateSaudiIBAN(iban) {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return /^SA\d{22}$/.test(cleaned);
}

// ========================================
// INSURANCE CLAIMS
// ========================================

/**
 * حساب التحمل ومبلغ المطالبة للتأمين
 * @param {number} totalAmount - إجمالي تكلفة الخدمة
 * @param {object} insurance - {coveragePercentage, deductibleAmount, annualLimit, usedAmount}
 * @returns {object}
 */
function calculateInsuranceCoverage(totalAmount, insurance) {
  if (!totalAmount || !insurance) {
    return { isValid: false };
  }

  const { coveragePercentage = 100, deductibleAmount = 0, annualLimit, usedAmount = 0 } = insurance;

  // الخصم الأول (Deductible) - يطرح من المبلغ
  const afterDeductible = Math.max(0, totalAmount - deductibleAmount);

  // نسبة التغطية
  const coveredAmount = round2(afterDeductible * (coveragePercentage / 100));
  const patientShare = round2(totalAmount - coveredAmount);

  // التحقق من الحد السنوي
  let approvedAmount = coveredAmount;
  let limitExceeded = false;

  if (annualLimit !== undefined && annualLimit !== null) {
    const remainingLimit = Math.max(0, annualLimit - usedAmount);
    if (coveredAmount > remainingLimit) {
      approvedAmount = remainingLimit;
      limitExceeded = true;
    }
  }

  const finalPatientShare = round2(totalAmount - approvedAmount);

  return {
    isValid: true,
    totalAmount,
    deductibleAmount,
    afterDeductible,
    coveragePercentage,
    coveredAmount,
    approvedAmount,
    patientShare: finalPatientShare,
    limitExceeded,
    remainingAnnualLimit:
      annualLimit !== undefined ? Math.max(0, annualLimit - usedAmount - approvedAmount) : null,
  };
}

/**
 * التحقق من صحة بيانات المطالبة التأمينية
 * @param {object} claim
 * @returns {object} - {isValid, errors}
 */
function validateInsuranceClaim(claim) {
  const errors = [];

  if (!claim) {
    return { isValid: false, errors: ['بيانات المطالبة مطلوبة'] };
  }

  if (!claim.beneficiaryId) errors.push('رقم المستفيد مطلوب');
  if (!claim.insuranceCompanyId) errors.push('شركة التأمين مطلوبة');
  if (!claim.memberId) errors.push('رقم العضوية التأمينية مطلوب');
  if (!claim.policyNumber) errors.push('رقم البوليصة مطلوب');
  if (!claim.diagnosisCodes || claim.diagnosisCodes.length === 0)
    errors.push('رموز التشخيص (ICD-10) مطلوبة');
  if (!claim.items || claim.items.length === 0) errors.push('لا توجد خدمات في المطالبة');
  if (!claim.serviceDateFrom) errors.push('تاريخ بداية الخدمة مطلوب');
  if (!claim.serviceDateTo) errors.push('تاريخ نهاية الخدمة مطلوب');

  // التحقق من مبالغ العناصر
  if (claim.items) {
    for (const [i, item] of claim.items.entries()) {
      if (!item.serviceCode) errors.push(`الخدمة ${i + 1}: رمز الخدمة مطلوب`);
      if (!item.claimedAmount || item.claimedAmount <= 0)
        errors.push(`الخدمة ${i + 1}: مبلغ المطالبة غير صالح`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * حساب إجمالي المطالبة
 * @param {Array} items - [{quantity, unitPrice, claimedAmount}]
 * @returns {object}
 */
function calculateClaimTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { totalClaimed: 0, itemCount: 0 };
  }

  const totalClaimed = items.reduce((sum, item) => {
    const amount = item.claimedAmount || (item.quantity || 1) * (item.unitPrice || 0);
    return sum + amount;
  }, 0);

  return {
    totalClaimed: round2(totalClaimed),
    itemCount: items.length,
  };
}

// ========================================
// ACCOUNTING / JOURNAL ENTRIES
// ========================================

/**
 * التحقق من توازن القيد المحاسبي
 * @param {Array} lines - [{debit, credit}]
 * @returns {object}
 */
function validateJournalEntry(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { isBalanced: false, error: 'لا توجد سطور في القيد' };
  }

  if (lines.length < 2) {
    return { isBalanced: false, error: 'القيد يحتاج على الأقل سطرين' };
  }

  const totalDebit = round2(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (l.credit || 0), 0));

  const diff = Math.abs(totalDebit - totalCredit);

  return {
    isBalanced: diff < 0.01,
    totalDebit,
    totalCredit,
    difference: round2(diff),
    error: diff >= 0.01 ? `القيد غير متوازن: مدين=${totalDebit}, دائن=${totalCredit}` : null,
  };
}

/**
 * توليد سطور القيد المحاسبي للفاتورة
 * @param {object} invoice - {totalAmount, vatAmount, taxableAmount, invoiceType}
 * @param {object} accountCodes - {receivable, revenue, vat}
 * @returns {Array}
 */
function generateInvoiceJournalLines(invoice, accountCodes) {
  if (!invoice || !accountCodes) return [];

  const lines = [];

  // مدين: الذمم المدينة
  lines.push({
    accountCode: accountCodes.receivable,
    debit: invoice.totalAmount,
    credit: 0,
    description: `فاتورة ${invoice.invoiceNumber || ''}`,
  });

  // دائن: الإيرادات
  lines.push({
    accountCode: accountCodes.revenue,
    debit: 0,
    credit: invoice.taxableAmount || invoice.subtotal,
    description: 'إيرادات الخدمات',
  });

  // دائن: ضريبة القيمة المضافة (إذا وجدت)
  if (invoice.vatAmount > 0) {
    lines.push({
      accountCode: accountCodes.vat || '2140',
      debit: 0,
      credit: invoice.vatAmount,
      description: 'ضريبة القيمة المضافة 15%',
    });
  }

  return lines;
}

/**
 * حساب رصيد حساب
 * @param {string} accountType - asset|liability|equity|revenue|expense
 * @param {number} totalDebit
 * @param {number} totalCredit
 * @returns {object}
 */
function calculateAccountBalance(accountType, totalDebit, totalCredit) {
  const normalBalance = ['asset', 'expense'].includes(accountType) ? 'debit' : 'credit';

  let balance;
  if (normalBalance === 'debit') {
    balance = round2(totalDebit - totalCredit);
  } else {
    balance = round2(totalCredit - totalDebit);
  }

  return {
    normalBalance,
    totalDebit: round2(totalDebit),
    totalCredit: round2(totalCredit),
    balance,
    isNormalBalance: balance >= 0,
  };
}

// ========================================
// AGING REPORT
// ========================================

/**
 * تقرير تقادم الديون (Aging Report)
 * @param {Array} invoices - [{invoiceDate, dueDate, remainingAmount, beneficiaryId}]
 * @param {string} asOfDate - تاريخ التقرير
 * @returns {object}
 */
function calculateAgingReport(invoices, asOfDate = new Date().toISOString().split('T')[0]) {
  if (!Array.isArray(invoices)) {
    return { buckets: {}, total: 0 };
  }

  const unpaidInvoices = invoices.filter(
    inv => inv.remainingAmount > 0 && inv.status !== 'cancelled'
  );

  const buckets = {};
  for (const b of FINANCE_CONSTANTS.AGING_BUCKETS) {
    buckets[b.label] = { amount: 0, count: 0, invoices: [] };
  }

  let total = 0;

  for (const inv of unpaidInvoices) {
    const dueDate = inv.dueDate || inv.invoiceDate;
    const due = new Date(dueDate);
    const current = new Date(asOfDate);
    const ageDays = Math.max(0, Math.floor((current - due) / (1000 * 60 * 60 * 24)));

    const bucket = FINANCE_CONSTANTS.AGING_BUCKETS.find(
      b => ageDays >= b.minDays && ageDays <= b.maxDays
    );

    if (bucket) {
      buckets[bucket.label].amount += inv.remainingAmount;
      buckets[bucket.label].count++;
      buckets[bucket.label].invoices.push(inv);
    }

    total += inv.remainingAmount;
  }

  // تقريب المبالغ
  for (const key of Object.keys(buckets)) {
    buckets[key].amount = round2(buckets[key].amount);
  }

  return {
    buckets,
    total: round2(total),
    totalUnpaidInvoices: unpaidInvoices.length,
    asOfDate,
  };
}

// ========================================
// SESSION PRICING
// ========================================

/**
 * حساب سعر الجلسة
 * @param {string} specialization - pt|ot|speech|aba|...
 * @param {number} durationMinutes
 * @param {string} sessionType - individual|group|assessment
 * @param {object} customPricing - تسعيرة مخصصة (تتجاوز الافتراضية)
 * @returns {object}
 */
function calculateSessionPrice(
  specialization,
  durationMinutes,
  sessionType = 'individual',
  customPricing = null
) {
  const pricing = customPricing || FINANCE_CONSTANTS.DEFAULT_SESSION_PRICES[specialization];

  if (!pricing) {
    return { isValid: false, error: `لا تسعيرة للتخصص: ${specialization}` };
  }

  const key = `${sessionType}_${durationMinutes}`;
  const basePrice = pricing[key] || pricing[`${sessionType}_${durationMinutes}`];

  if (!basePrice) {
    return {
      isValid: false,
      error: `لا تسعيرة لـ ${specialization} - ${durationMinutes} دقيقة - ${sessionType}`,
    };
  }

  const vatCalc = calculateVAT(basePrice, 'standard', false);

  return {
    isValid: true,
    specialization,
    durationMinutes,
    sessionType,
    basePrice,
    vatAmount: vatCalc.vatAmount,
    totalWithVat: vatCalc.totalWithVat,
    vatRate: FINANCE_CONSTANTS.VAT_RATE_PERCENT,
    vatCategory: 'standard',
  };
}

// ========================================
// FINANCIAL STATISTICS
// ========================================

/**
 * إحصائيات الإيرادات الشهرية
 * @param {Array} invoices - المواعيد/الفواتير
 * @param {object} filters - {branchId, dateFrom, dateTo}
 * @returns {object}
 */
function calculateRevenueStatistics(invoices = [], filters = {}) {
  if (!Array.isArray(invoices)) return { total: 0 };

  let filtered = invoices;

  if (filters.branchId) {
    filtered = filtered.filter(i => i.branchId === filters.branchId);
  }

  if (filters.dateFrom || filters.dateTo) {
    filtered = filtered.filter(i => {
      if (filters.dateFrom && i.invoiceDate < filters.dateFrom) return false;
      if (filters.dateTo && i.invoiceDate > filters.dateTo) return false;
      return true;
    });
  }

  const totalRevenue = round2(filtered.reduce((s, i) => s + (i.totalAmount || 0), 0));
  const totalVat = round2(filtered.reduce((s, i) => s + (i.vatAmount || 0), 0));
  const totalPaid = round2(filtered.reduce((s, i) => s + (i.paidAmount || 0), 0));
  const totalOutstanding = round2(filtered.reduce((s, i) => s + (i.remainingAmount || 0), 0));

  const paidInvoices = filtered.filter(i => i.paymentStatus === 'paid').length;
  const unpaidInvoices = filtered.filter(i => i.paymentStatus === 'unpaid').length;
  const partialInvoices = filtered.filter(i => i.paymentStatus === 'partial').length;

  // حسب الخدمة
  const bySpecialization = {};
  for (const inv of filtered) {
    if (!inv.specialization) continue;
    if (!bySpecialization[inv.specialization]) bySpecialization[inv.specialization] = 0;
    bySpecialization[inv.specialization] += inv.totalAmount || 0;
  }

  for (const key of Object.keys(bySpecialization)) {
    bySpecialization[key] = round2(bySpecialization[key]);
  }

  // حسب طريقة الدفع
  const byPaymentMethod = {};
  for (const inv of filtered) {
    if (!inv.paymentMethod) continue;
    if (!byPaymentMethod[inv.paymentMethod]) byPaymentMethod[inv.paymentMethod] = 0;
    byPaymentMethod[inv.paymentMethod] += inv.paidAmount || 0;
  }

  for (const key of Object.keys(byPaymentMethod)) {
    byPaymentMethod[key] = round2(byPaymentMethod[key]);
  }

  const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

  return {
    total: filtered.length,
    totalRevenue,
    totalVat,
    totalPaid,
    totalOutstanding,
    collectionRate,
    paidInvoices,
    unpaidInvoices,
    partialInvoices,
    bySpecialization,
    byPaymentMethod,
    netRevenue: round2(totalRevenue - totalVat),
  };
}

/**
 * حساب ربحية الفرع
 * @param {object} branchData - {revenues, expenses}
 * @returns {object}
 */
function calculateBranchProfitability(branchData) {
  if (!branchData) return { isValid: false };

  const totalRevenue = round2(branchData.revenues || 0);
  const totalExpenses = round2(branchData.expenses || 0);
  const grossProfit = round2(totalRevenue - totalExpenses);
  const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  return {
    isValid: true,
    totalRevenue,
    totalExpenses,
    grossProfit,
    profitMargin,
    isProfitable: grossProfit >= 0,
  };
}

// ========================================
// BUDGET ANALYSIS
// ========================================

/**
 * تحليل الموازنة والانحراف
 * @param {number} budgetedAmount
 * @param {number} actualAmount
 * @returns {object}
 */
function calculateBudgetVariance(budgetedAmount, actualAmount) {
  if (typeof budgetedAmount !== 'number' || typeof actualAmount !== 'number') {
    return { isValid: false };
  }

  const variance = round2(actualAmount - budgetedAmount);
  const variancePercentage =
    budgetedAmount !== 0 ? Math.round((variance / Math.abs(budgetedAmount)) * 100) : 0;

  return {
    isValid: true,
    budgetedAmount,
    actualAmount,
    variance,
    variancePercentage,
    isFavorable: variance <= 0, // للمصروفات: أقل من الموازنة = ملائم
    status:
      Math.abs(variancePercentage) <= 5
        ? 'on_track'
        : Math.abs(variancePercentage) <= 15
          ? 'slight_deviation'
          : 'significant_deviation',
  };
}

// ========================================
// HELPER
// ========================================
function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  FINANCE_CONSTANTS,
  // VAT
  calculateVAT,
  calculateInvoiceVAT,
  calculateDiscount,
  // Invoice
  calculateInvoiceTotals,
  calculatePaymentStatus,
  generateInvoiceNumber,
  calculateDueDate,
  checkInvoiceOverdue,
  // ZATCA
  generateZatcaQRData,
  validateVatNumber,
  validateSaudiIBAN,
  // Insurance
  calculateInsuranceCoverage,
  validateInsuranceClaim,
  calculateClaimTotal,
  // Accounting
  validateJournalEntry,
  generateInvoiceJournalLines,
  calculateAccountBalance,
  // Aging
  calculateAgingReport,
  // Session Pricing
  calculateSessionPrice,
  // Statistics
  calculateRevenueStatistics,
  calculateBranchProfitability,
  calculateBudgetVariance,
};
