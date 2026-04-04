'use strict';

const {
  FINANCE_CONSTANTS,
  calculateVAT,
  calculateInvoiceVAT,
  calculateDiscount,
  calculateInvoiceTotals,
  calculatePaymentStatus,
  generateInvoiceNumber,
  calculateDueDate,
  checkInvoiceOverdue,
  generateZatcaQRData,
  validateVatNumber,
  validateSaudiIBAN,
  calculateInsuranceCoverage,
  validateInsuranceClaim,
  calculateClaimTotal,
  validateJournalEntry,
  generateInvoiceJournalLines,
  calculateAccountBalance,
  calculateAgingReport,
  calculateSessionPrice,
  calculateRevenueStatistics,
  calculateBranchProfitability,
  calculateBudgetVariance,
} = require('../services/finance/financeCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('FINANCE_CONSTANTS', () => {
  test('VAT_RATE = 0.15', () => expect(FINANCE_CONSTANTS.VAT_RATE).toBe(0.15));
  test('VAT_RATE_PERCENT = 15', () => expect(FINANCE_CONSTANTS.VAT_RATE_PERCENT).toBe(15));
  test('INVOICE_TYPES محددة', () => {
    expect(FINANCE_CONSTANTS.INVOICE_TYPES.STANDARD).toBe('standard');
    expect(FINANCE_CONSTANTS.INVOICE_TYPES.CREDIT_NOTE).toBe('credit_note');
  });
  test('VAT_CATEGORIES محددة', () => {
    expect(FINANCE_CONSTANTS.VAT_CATEGORIES.STANDARD).toBe('standard');
    expect(FINANCE_CONSTANTS.VAT_CATEGORIES.EXEMPT).toBe('exempt');
    expect(FINANCE_CONSTANTS.VAT_CATEGORIES.ZERO_RATED).toBe('zero_rated');
  });
  test('AGING_BUCKETS لها 5 مستويات', () => {
    expect(FINANCE_CONSTANTS.AGING_BUCKETS.length).toBe(5);
    expect(FINANCE_CONSTANTS.AGING_BUCKETS[0].label).toBe('current');
    expect(FINANCE_CONSTANTS.AGING_BUCKETS[4].label).toBe('over_120');
  });
  test('DEFAULT_SESSION_PRICES لها تخصصات', () => {
    expect(FINANCE_CONSTANTS.DEFAULT_SESSION_PRICES.pt).toBeDefined();
    expect(FINANCE_CONSTANTS.DEFAULT_SESSION_PRICES.aba).toBeDefined();
  });
});

// ========================================
// VAT CALCULATIONS
// ========================================
describe('calculateVAT', () => {
  test('standard: 200 → vat=30, total=230', () => {
    const r = calculateVAT(200, 'standard');
    expect(r.taxableAmount).toBe(200);
    expect(r.vatAmount).toBe(30);
    expect(r.totalWithVat).toBe(230);
    expect(r.vatRate).toBe(15);
  });

  test('exempt: لا ضريبة', () => {
    const r = calculateVAT(200, 'exempt');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(200);
    expect(r.vatRate).toBe(0);
  });

  test('zero_rated: لا ضريبة', () => {
    const r = calculateVAT(200, 'zero_rated');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(200);
  });

  test('سعر شامل الضريبة: 230 → taxable=200, vat=30', () => {
    const r = calculateVAT(230, 'standard', true);
    expect(r.taxableAmount).toBeCloseTo(200, 1);
    expect(r.vatAmount).toBeCloseTo(30, 1);
    expect(r.totalWithVat).toBe(230);
  });

  test('قيمة سالبة → 0', () => {
    const r = calculateVAT(-100, 'standard');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(0);
  });

  test('قيمة غير رقمية → 0', () => {
    const r = calculateVAT('abc', 'standard');
    expect(r.vatAmount).toBe(0);
  });

  test('قيمة صفر → 0', () => {
    const r = calculateVAT(0, 'standard');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(0);
  });

  test('مبلغ كبير: 10000 → vat=1500', () => {
    const r = calculateVAT(10000, 'standard');
    expect(r.vatAmount).toBe(1500);
    expect(r.totalWithVat).toBe(11500);
  });
});

describe('calculateDiscount', () => {
  test('خصم ثابت: 50 من 500 = 50', () => expect(calculateDiscount(500, 50, 'fixed')).toBe(50));
  test('خصم نسبي: 10% من 500 = 50', () =>
    expect(calculateDiscount(500, 10, 'percentage')).toBe(50));
  test('خصم أكبر من المبلغ → يُحدد بالمبلغ', () =>
    expect(calculateDiscount(100, 200, 'fixed')).toBe(100));
  test('خصم صفر → 0', () => expect(calculateDiscount(500, 0)).toBe(0));
  test('بدون خصم → 0', () => expect(calculateDiscount(500, null)).toBe(0));
  test('نسبة 15% من 1000 = 150', () => expect(calculateDiscount(1000, 15, 'percentage')).toBe(150));
});

describe('calculateInvoiceVAT', () => {
  test('عنصر واحد standard', () => {
    const r = calculateInvoiceVAT([{ unitPrice: 200, quantity: 1, vatCategory: 'standard' }]);
    expect(r.subtotal).toBe(200);
    expect(r.totalVat).toBe(30);
    expect(r.grandTotal).toBe(230);
  });

  test('عناصر متعددة', () => {
    const r = calculateInvoiceVAT([
      { unitPrice: 200, quantity: 2, vatCategory: 'standard' },
      { unitPrice: 100, quantity: 1, vatCategory: 'exempt' },
    ]);
    expect(r.subtotal).toBe(500);
    expect(r.totalVat).toBe(60); // فقط على 400
    expect(r.grandTotal).toBe(560);
  });

  test('مع خصم على العنصر', () => {
    const r = calculateInvoiceVAT([
      { unitPrice: 200, quantity: 1, vatCategory: 'standard', discount: 20, discountType: 'fixed' },
    ]);
    expect(r.subtotal).toBe(180);
    expect(r.totalVat).toBe(27);
  });

  test('قائمة فارغة → صفر', () => {
    const r = calculateInvoiceVAT([]);
    expect(r.grandTotal).toBe(0);
  });

  test('null → صفر', () => {
    const r = calculateInvoiceVAT(null);
    expect(r.grandTotal).toBe(0);
  });
});

// ========================================
// INVOICE CALCULATIONS
// ========================================
describe('calculateInvoiceTotals', () => {
  test('فاتورة بسيطة', () => {
    const r = calculateInvoiceTotals({
      items: [{ unitPrice: 200, quantity: 1, vatCategory: 'standard' }],
    });
    expect(r.isValid).toBe(true);
    expect(r.subtotal).toBe(200);
    expect(r.vatAmount).toBe(30);
    expect(r.grandTotal).toBe(230);
  });

  test('مع خصم على الفاتورة', () => {
    const r = calculateInvoiceTotals({
      items: [{ unitPrice: 1000, quantity: 1, vatCategory: 'standard' }],
      invoiceDiscount: 100,
      invoiceDiscountType: 'fixed',
    });
    expect(r.subtotal).toBe(1000);
    expect(r.invoiceDiscount).toBe(100);
    expect(r.taxableAmount).toBe(900);
    expect(r.vatAmount).toBe(135);
    expect(r.grandTotal).toBe(1035);
  });

  test('مع مبلغ مدفوع مسبقاً', () => {
    const r = calculateInvoiceTotals({
      items: [{ unitPrice: 200, quantity: 1, vatCategory: 'standard' }],
      paidAmount: 100,
    });
    expect(r.remainingAmount).toBe(130);
  });

  test('null → isValid false', () => {
    expect(calculateInvoiceTotals(null).isValid).toBe(false);
    expect(calculateInvoiceTotals({ items: null }).isValid).toBe(false);
  });
});

describe('calculatePaymentStatus', () => {
  test('غير مدفوع', () => expect(calculatePaymentStatus(1000, 0)).toBe('unpaid'));
  test('مدفوع كاملاً', () => expect(calculatePaymentStatus(1000, 1000)).toBe('paid'));
  test('مدفوع جزئياً', () => expect(calculatePaymentStatus(1000, 500)).toBe('partial'));
  test('زيادة في الدفع → paid', () => expect(calculatePaymentStatus(1000, 1100)).toBe('paid'));
  test('قيم غير رقمية → unpaid', () => expect(calculatePaymentStatus(null, null)).toBe('unpaid'));
});

describe('generateInvoiceNumber', () => {
  test('INV-2025-0000001', () =>
    expect(generateInvoiceNumber('INV', 2025, 1)).toBe('INV-2025-0000001'));
  test('CN-2025-0000099', () =>
    expect(generateInvoiceNumber('CN', 2025, 99)).toBe('CN-2025-0000099'));
  test('INV-2025-1234567', () =>
    expect(generateInvoiceNumber('INV', 2025, 1234567)).toBe('INV-2025-1234567'));
});

describe('calculateDueDate', () => {
  test('30 يوم بعد 2025-01-01', () =>
    expect(calculateDueDate('2025-01-01', 30)).toBe('2025-01-31'));
  test('60 يوم', () => expect(calculateDueDate('2025-01-01', 60)).toBe('2025-03-02'));
  test('null → null', () => expect(calculateDueDate(null)).toBeNull());
  test('تاريخ غير صالح → null', () => expect(calculateDueDate('bad')).toBeNull());
  test('افتراضي 30 يوم', () => expect(calculateDueDate('2025-01-01')).toBe('2025-01-31'));
});

describe('checkInvoiceOverdue', () => {
  test('متأخرة 10 أيام', () => {
    const r = checkInvoiceOverdue('2025-01-01', '2025-01-11');
    expect(r.isOverdue).toBe(true);
    expect(r.daysOverdue).toBe(10);
  });
  test('موعد اليوم - ليست متأخرة', () => {
    const r = checkInvoiceOverdue('2025-01-11', '2025-01-11');
    expect(r.isOverdue).toBe(false);
    expect(r.daysOverdue).toBe(0);
  });
  test('مستقبلية - ليست متأخرة', () => {
    const r = checkInvoiceOverdue('2025-12-31', '2025-01-01');
    expect(r.isOverdue).toBe(false);
  });
  test('null dueDate → ليست متأخرة', () => {
    expect(checkInvoiceOverdue(null).isOverdue).toBe(false);
  });
});

// ========================================
// ZATCA
// ========================================
describe('generateZatcaQRData', () => {
  const validData = {
    sellerName: 'مركز الأوائل',
    vatNumber: '310000000000003',
    invoiceDateTime: '2025-01-06T09:00:00Z',
    totalAmount: 230,
    vatAmount: 30,
  };

  test('إنشاء QR صالح', () => {
    const r = generateZatcaQRData(validData);
    expect(r.isValid).toBe(true);
    expect(r.base64QR).toBeDefined();
    expect(r.fields.length).toBe(5);
  });

  test('تضمين الحقول الصحيحة', () => {
    const r = generateZatcaQRData(validData);
    expect(r.fields[0].tag).toBe(1); // اسم البائع
    expect(r.fields[1].tag).toBe(2); // الرقم الضريبي
    expect(r.fields[2].tag).toBe(3); // التاريخ
    expect(r.fields[3].tag).toBe(4); // الإجمالي
    expect(r.fields[4].tag).toBe(5); // الضريبة
  });

  test('null → isValid false', () => {
    expect(generateZatcaQRData(null).isValid).toBe(false);
  });

  test('بيانات ناقصة → isValid false', () => {
    expect(generateZatcaQRData({ sellerName: 'test' }).isValid).toBe(false);
  });

  test('base64QR قابل للفك', () => {
    const r = generateZatcaQRData(validData);
    const decoded = Buffer.from(r.base64QR, 'base64').toString('hex');
    expect(decoded).toBe(r.tlvHex);
  });
});

describe('validateVatNumber', () => {
  test('رقم صالح 15 رقم', () => expect(validateVatNumber('310000000000003')).toBe(true));
  test('رقم غير صالح - 14 رقم', () => expect(validateVatNumber('31000000000000')).toBe(false));
  test('رقم بحروف', () => expect(validateVatNumber('31000000000000A')).toBe(false));
  test('null → false', () => expect(validateVatNumber(null)).toBe(false));
  test('فارغ → false', () => expect(validateVatNumber('')).toBe(false));
  test('16 رقم → false', () => expect(validateVatNumber('3100000000000003')).toBe(false));
});

describe('validateSaudiIBAN', () => {
  test('IBAN صالح', () => expect(validateSaudiIBAN('SA0380000000608010167519')).toBe(true));
  test('بدون SA → false', () => expect(validateSaudiIBAN('AE0380000000608010167519')).toBe(false));
  test('قصير → false', () => expect(validateSaudiIBAN('SA038000000060801016751')).toBe(false));
  test('null → false', () => expect(validateSaudiIBAN(null)).toBe(false));
  test('مع مسافات يُقبل', () =>
    expect(validateSaudiIBAN('SA03 8000 0000 6080 1016 7519')).toBe(true));
});

// ========================================
// INSURANCE
// ========================================
describe('calculateInsuranceCoverage', () => {
  test('تغطية 80% بدون تحمل', () => {
    const r = calculateInsuranceCoverage(1000, { coveragePercentage: 80, deductibleAmount: 0 });
    expect(r.isValid).toBe(true);
    expect(r.approvedAmount).toBe(800);
    expect(r.patientShare).toBe(200);
  });

  test('تغطية 100% → كل المبلغ مغطى', () => {
    const r = calculateInsuranceCoverage(500, { coveragePercentage: 100 });
    expect(r.approvedAmount).toBe(500);
    expect(r.patientShare).toBe(0);
  });

  test('مع تحمل 200', () => {
    const r = calculateInsuranceCoverage(1000, { coveragePercentage: 80, deductibleAmount: 200 });
    // بعد التحمل: 800 → 80% = 640
    expect(r.afterDeductible).toBe(800);
    expect(r.approvedAmount).toBe(640);
    expect(r.patientShare).toBe(360);
  });

  test('تجاوز الحد السنوي', () => {
    const r = calculateInsuranceCoverage(1000, {
      coveragePercentage: 80,
      annualLimit: 5000,
      usedAmount: 4800,
    });
    // متبقي من الحد: 200
    expect(r.approvedAmount).toBe(200);
    expect(r.limitExceeded).toBe(true);
  });

  test('ضمن الحد السنوي → لا تجاوز', () => {
    const r = calculateInsuranceCoverage(500, {
      coveragePercentage: 100,
      annualLimit: 5000,
      usedAmount: 1000,
    });
    expect(r.limitExceeded).toBe(false);
    expect(r.approvedAmount).toBe(500);
  });

  test('null → isValid false', () => {
    expect(calculateInsuranceCoverage(null, null).isValid).toBe(false);
  });
});

describe('validateInsuranceClaim', () => {
  const validClaim = {
    beneficiaryId: 'B1',
    insuranceCompanyId: 'INS1',
    memberId: 'M123',
    policyNumber: 'POL001',
    diagnosisCodes: [{ code: 'F84.0', description: 'توحد' }],
    serviceDateFrom: '2025-01-01',
    serviceDateTo: '2025-01-31',
    items: [{ serviceCode: 'PT001', claimedAmount: 500 }],
  };

  test('مطالبة صالحة', () => {
    const r = validateInsuranceClaim(validClaim);
    expect(r.isValid).toBe(true);
    expect(r.errors.length).toBe(0);
  });

  test('null → isValid false', () => {
    const r = validateInsuranceClaim(null);
    expect(r.isValid).toBe(false);
  });

  test('بدون رقم المستفيد', () => {
    const r = validateInsuranceClaim({ ...validClaim, beneficiaryId: null });
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('رقم المستفيد مطلوب');
  });

  test('بدون رموز تشخيص', () => {
    const r = validateInsuranceClaim({ ...validClaim, diagnosisCodes: [] });
    expect(r.isValid).toBe(false);
    expect(r.errors.some(e => e.includes('ICD-10'))).toBe(true);
  });

  test('بدون خدمات', () => {
    const r = validateInsuranceClaim({ ...validClaim, items: [] });
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('لا توجد خدمات في المطالبة');
  });

  test('مبلغ خدمة صفر → خطأ', () => {
    const r = validateInsuranceClaim({
      ...validClaim,
      items: [{ serviceCode: 'PT001', claimedAmount: 0 }],
    });
    expect(r.isValid).toBe(false);
  });
});

describe('calculateClaimTotal', () => {
  test('عناصر متعددة', () => {
    const r = calculateClaimTotal([
      { claimedAmount: 300 },
      { claimedAmount: 200 },
      { claimedAmount: 150 },
    ]);
    expect(r.totalClaimed).toBe(650);
    expect(r.itemCount).toBe(3);
  });

  test('من unitPrice وquantity', () => {
    const r = calculateClaimTotal([{ quantity: 3, unitPrice: 100 }]);
    expect(r.totalClaimed).toBe(300);
  });

  test('قائمة فارغة → 0', () => {
    const r = calculateClaimTotal([]);
    expect(r.totalClaimed).toBe(0);
  });
});

// ========================================
// ACCOUNTING
// ========================================
describe('validateJournalEntry', () => {
  test('قيد متوازن', () => {
    const r = validateJournalEntry([
      { accountCode: '1121', debit: 1150, credit: 0 },
      { accountCode: '4110', debit: 0, credit: 1000 },
      { accountCode: '2140', debit: 0, credit: 150 },
    ]);
    expect(r.isBalanced).toBe(true);
    expect(r.totalDebit).toBe(1150);
    expect(r.totalCredit).toBe(1150);
    expect(r.error).toBeNull();
  });

  test('قيد غير متوازن', () => {
    const r = validateJournalEntry([
      { accountCode: '1121', debit: 1000, credit: 0 },
      { accountCode: '4110', debit: 0, credit: 800 },
    ]);
    expect(r.isBalanced).toBe(false);
    expect(r.error).toContain('غير متوازن');
    expect(r.difference).toBe(200);
  });

  test('سطر واحد → غير صالح', () => {
    const r = validateJournalEntry([{ debit: 100, credit: 0 }]);
    expect(r.isBalanced).toBe(false);
  });

  test('قائمة فارغة → غير صالح', () => {
    const r = validateJournalEntry([]);
    expect(r.isBalanced).toBe(false);
  });

  test('null → غير صالح', () => {
    const r = validateJournalEntry(null);
    expect(r.isBalanced).toBe(false);
  });
});

describe('generateInvoiceJournalLines', () => {
  const invoice = {
    invoiceNumber: 'INV-2025-0000001',
    totalAmount: 1150,
    taxableAmount: 1000,
    vatAmount: 150,
  };
  const accounts = { receivable: '1121', revenue: '4110', vat: '2140' };

  test('يُنشئ 3 سطور (ذمم + إيرادات + ضريبة)', () => {
    const lines = generateInvoiceJournalLines(invoice, accounts);
    expect(lines.length).toBe(3);
  });

  test('السطر الأول مدين بالإجمالي', () => {
    const lines = generateInvoiceJournalLines(invoice, accounts);
    expect(lines[0].accountCode).toBe('1121');
    expect(lines[0].debit).toBe(1150);
    expect(lines[0].credit).toBe(0);
  });

  test('سطر الإيرادات دائن', () => {
    const lines = generateInvoiceJournalLines(invoice, accounts);
    expect(lines[1].accountCode).toBe('4110');
    expect(lines[1].credit).toBe(1000);
  });

  test('سطر الضريبة دائن', () => {
    const lines = generateInvoiceJournalLines(invoice, accounts);
    expect(lines[2].accountCode).toBe('2140');
    expect(lines[2].credit).toBe(150);
  });

  test('فاتورة بدون ضريبة → 2 سطور', () => {
    const noVatInvoice = { ...invoice, vatAmount: 0 };
    const lines = generateInvoiceJournalLines(noVatInvoice, accounts);
    expect(lines.length).toBe(2);
  });

  test('null → قائمة فارغة', () => {
    expect(generateInvoiceJournalLines(null, accounts)).toEqual([]);
    expect(generateInvoiceJournalLines(invoice, null)).toEqual([]);
  });
});

describe('calculateAccountBalance', () => {
  test('أصول: مدين > دائن → رصيد موجب', () => {
    const r = calculateAccountBalance('asset', 1000, 300);
    expect(r.normalBalance).toBe('debit');
    expect(r.balance).toBe(700);
    expect(r.isNormalBalance).toBe(true);
  });

  test('إيرادات: دائن > مدين → رصيد موجب', () => {
    const r = calculateAccountBalance('revenue', 100, 5000);
    expect(r.normalBalance).toBe('credit');
    expect(r.balance).toBe(4900);
    expect(r.isNormalBalance).toBe(true);
  });

  test('مصروفات: مدين كحساب طبيعي', () => {
    const r = calculateAccountBalance('expense', 2000, 0);
    expect(r.normalBalance).toBe('debit');
    expect(r.balance).toBe(2000);
  });

  test('التزامات: دائن كحساب طبيعي', () => {
    const r = calculateAccountBalance('liability', 100, 5000);
    expect(r.normalBalance).toBe('credit');
    expect(r.balance).toBe(4900);
  });
});

// ========================================
// AGING REPORT
// ========================================
describe('calculateAgingReport', () => {
  const invoices = [
    { remainingAmount: 1000, dueDate: '2025-01-01', status: 'issued' }, // current إذا asOf في يناير
    { remainingAmount: 500, dueDate: '2024-12-01', status: 'issued' }, // 31-60 أو أكثر
    { remainingAmount: 300, dueDate: '2024-10-01', status: 'issued' }, // over_120
    { remainingAmount: 200, dueDate: '2025-01-01', status: 'cancelled' }, // مُلغاة - تُتجاهل
  ];

  test('يُتجاهل الملغاة', () => {
    const r = calculateAgingReport(invoices, '2025-01-15');
    expect(r.totalUnpaidInvoices).toBe(3);
  });

  test('إجمالي صحيح', () => {
    const r = calculateAgingReport(invoices, '2025-01-15');
    expect(r.total).toBe(1800);
  });

  test('توزيع الدلاء', () => {
    const r = calculateAgingReport(invoices, '2025-01-15');
    expect(r.buckets).toBeDefined();
    expect(r.buckets['current']).toBeDefined();
    expect(r.buckets['over_120']).toBeDefined();
  });

  test('الفاتورة الأقدم في over_120', () => {
    const r = calculateAgingReport(invoices, '2025-02-15');
    // 2024-10-01 → ~137 يوم → over_120
    expect(r.buckets['over_120'].amount).toBeGreaterThan(0);
  });

  test('null → buckets فارغة', () => {
    const r = calculateAgingReport(null);
    expect(r.total).toBe(0);
  });
});

// ========================================
// SESSION PRICING
// ========================================
describe('calculateSessionPrice', () => {
  test('PT individual 45 دقيقة', () => {
    const r = calculateSessionPrice('pt', 45, 'individual');
    expect(r.isValid).toBe(true);
    expect(r.basePrice).toBe(200);
    expect(r.vatAmount).toBe(30);
    expect(r.totalWithVat).toBe(230);
  });

  test('ABA individual 60 دقيقة', () => {
    const r = calculateSessionPrice('aba', 60, 'individual');
    expect(r.isValid).toBe(true);
    expect(r.basePrice).toBe(300);
    expect(r.totalWithVat).toBe(345);
  });

  test('تسعيرة مخصصة', () => {
    const custom = { individual_45: 350 };
    const r = calculateSessionPrice('pt', 45, 'individual', custom);
    expect(r.basePrice).toBe(350);
  });

  test('تخصص غير موجود → isValid false', () => {
    const r = calculateSessionPrice('unknown_spec', 45, 'individual');
    expect(r.isValid).toBe(false);
  });

  test('مدة غير موجودة → isValid false', () => {
    const r = calculateSessionPrice('pt', 90, 'individual');
    expect(r.isValid).toBe(false);
  });
});

// ========================================
// FINANCIAL STATISTICS
// ========================================
describe('calculateRevenueStatistics', () => {
  const invoices = [
    {
      branchId: 'B1',
      invoiceDate: '2025-01-06',
      totalAmount: 1150,
      vatAmount: 150,
      paidAmount: 1150,
      remainingAmount: 0,
      paymentStatus: 'paid',
      specialization: 'pt',
      paymentMethod: 'cash',
    },
    {
      branchId: 'B1',
      invoiceDate: '2025-01-07',
      totalAmount: 345,
      vatAmount: 45,
      paidAmount: 0,
      remainingAmount: 345,
      paymentStatus: 'unpaid',
      specialization: 'aba',
      paymentMethod: null,
    },
    {
      branchId: 'B1',
      invoiceDate: '2025-01-08',
      totalAmount: 230,
      vatAmount: 30,
      paidAmount: 100,
      remainingAmount: 130,
      paymentStatus: 'partial',
      specialization: 'pt',
      paymentMethod: 'mada',
    },
    {
      branchId: 'B2',
      invoiceDate: '2025-01-06',
      totalAmount: 575,
      vatAmount: 75,
      paidAmount: 575,
      remainingAmount: 0,
      paymentStatus: 'paid',
      specialization: 'ot',
      paymentMethod: 'card',
    },
  ];

  test('إجمالي بدون فلتر', () => {
    const r = calculateRevenueStatistics(invoices);
    expect(r.total).toBe(4);
    expect(r.totalRevenue).toBe(2300);
  });

  test('فلتر الفرع', () => {
    const r = calculateRevenueStatistics(invoices, { branchId: 'B1' });
    expect(r.total).toBe(3);
    expect(r.totalRevenue).toBe(1725);
  });

  test('معدل التحصيل', () => {
    const r = calculateRevenueStatistics(invoices, { branchId: 'B1' });
    // totalPaid=1150+0+100=1250 / totalRevenue=1725 = 72%
    expect(r.collectionRate).toBe(72);
  });

  test('توزيع الحالات', () => {
    const r = calculateRevenueStatistics(invoices, { branchId: 'B1' });
    expect(r.paidInvoices).toBe(1);
    expect(r.unpaidInvoices).toBe(1);
    expect(r.partialInvoices).toBe(1);
  });

  test('توزيع حسب التخصص', () => {
    const r = calculateRevenueStatistics(invoices, { branchId: 'B1' });
    expect(r.bySpecialization.pt).toBeDefined();
    expect(r.bySpecialization.aba).toBeDefined();
  });

  test('إجمالي الضريبة', () => {
    const r = calculateRevenueStatistics(invoices, { branchId: 'B1' });
    expect(r.totalVat).toBe(225);
  });

  test('صافي الإيرادات', () => {
    const r = calculateRevenueStatistics(invoices, { branchId: 'B1' });
    expect(r.netRevenue).toBe(1500);
  });

  test('null → total:0', () => {
    expect(calculateRevenueStatistics(null).total).toBe(0);
  });
});

describe('calculateBranchProfitability', () => {
  test('فرع رابح', () => {
    const r = calculateBranchProfitability({ revenues: 100000, expenses: 70000 });
    expect(r.isValid).toBe(true);
    expect(r.grossProfit).toBe(30000);
    expect(r.profitMargin).toBe(30);
    expect(r.isProfitable).toBe(true);
  });

  test('فرع خاسر', () => {
    const r = calculateBranchProfitability({ revenues: 50000, expenses: 80000 });
    expect(r.grossProfit).toBe(-30000);
    expect(r.isProfitable).toBe(false);
  });

  test('هامش صفر', () => {
    const r = calculateBranchProfitability({ revenues: 0, expenses: 0 });
    expect(r.profitMargin).toBe(0);
  });

  test('null → isValid false', () => {
    expect(calculateBranchProfitability(null).isValid).toBe(false);
  });
});

describe('calculateBudgetVariance', () => {
  test('في حدود الموازنة (< 5%)', () => {
    const r = calculateBudgetVariance(100000, 103000);
    expect(r.variance).toBe(3000);
    expect(r.variancePercentage).toBe(3);
    expect(r.status).toBe('on_track');
  });

  test('انحراف طفيف (5-15%)', () => {
    const r = calculateBudgetVariance(100000, 110000);
    expect(r.status).toBe('slight_deviation');
  });

  test('انحراف كبير (> 15%)', () => {
    const r = calculateBudgetVariance(100000, 120000);
    expect(r.status).toBe('significant_deviation');
  });

  test('ملائم للمصروفات (أقل من الموازنة)', () => {
    const r = calculateBudgetVariance(100000, 90000);
    expect(r.isFavorable).toBe(true);
    expect(r.variance).toBe(-10000);
  });

  test('موازنة صفر → variancePercentage=0', () => {
    const r = calculateBudgetVariance(0, 5000);
    expect(r.variancePercentage).toBe(0);
  });

  test('قيم غير رقمية → isValid false', () => {
    expect(calculateBudgetVariance('a', 'b').isValid).toBe(false);
  });
});

// ========================================
// INTEGRATION
// ========================================
describe('Integration - دورة الفاتورة الكاملة', () => {
  test('إنشاء فاتورة → حساب ضريبة → QR → قيد محاسبي', () => {
    // 1. حساب الفاتورة
    const invoice = calculateInvoiceTotals({
      items: [
        { unitPrice: 200, quantity: 3, vatCategory: 'standard', description: 'جلسات PT' },
        { unitPrice: 300, quantity: 1, vatCategory: 'standard', description: 'جلسة ABA' },
      ],
    });
    expect(invoice.isValid).toBe(true);
    expect(invoice.subtotal).toBe(900);
    expect(invoice.vatAmount).toBe(135);
    expect(invoice.grandTotal).toBe(1035);

    // 2. QR Code ZATCA
    const qr = generateZatcaQRData({
      sellerName: 'مركز الأوائل',
      vatNumber: '310000000000003',
      invoiceDateTime: '2025-01-06T09:00:00Z',
      totalAmount: invoice.grandTotal,
      vatAmount: invoice.vatAmount,
    });
    expect(qr.isValid).toBe(true);

    // 3. القيد المحاسبي
    const lines = generateInvoiceJournalLines(
      {
        totalAmount: invoice.grandTotal,
        taxableAmount: invoice.taxableAmount,
        vatAmount: invoice.vatAmount,
        invoiceNumber: 'INV-2025-0000001',
      },
      { receivable: '1121', revenue: '4110', vat: '2140' }
    );
    const validation = validateJournalEntry(lines);
    expect(validation.isBalanced).toBe(true);
  });

  test('مطالبة تأمينية كاملة: تحقق + حساب + تسوية', () => {
    const claim = {
      beneficiaryId: 'B1',
      insuranceCompanyId: 'INS1',
      memberId: 'M123',
      policyNumber: 'POL001',
      diagnosisCodes: [{ code: 'F84.0' }],
      serviceDateFrom: '2025-01-01',
      serviceDateTo: '2025-01-31',
      items: [
        { serviceCode: 'PT001', claimedAmount: 600 },
        { serviceCode: 'OT001', claimedAmount: 400 },
      ],
    };

    const validation = validateInsuranceClaim(claim);
    expect(validation.isValid).toBe(true);

    const total = calculateClaimTotal(claim.items);
    expect(total.totalClaimed).toBe(1000);

    const coverage = calculateInsuranceCoverage(total.totalClaimed, {
      coveragePercentage: 80,
      deductibleAmount: 100,
    });
    expect(coverage.approvedAmount).toBe(720);
    expect(coverage.patientShare).toBe(280);
  });
});
