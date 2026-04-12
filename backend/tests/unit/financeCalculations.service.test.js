/**
 * Unit Tests — financeCalculations.service.js
 * Pure business logic — NO mocks needed
 */
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
} = require('../../services/finance/financeCalculations.service');

// ═══════════════ VAT ═══════════════

describe('calculateVAT', () => {
  it('returns zeros for non-number', () => {
    expect(calculateVAT('abc').vatAmount).toBe(0);
    expect(calculateVAT(-10).vatAmount).toBe(0);
  });

  it('calculates 15% standard VAT', () => {
    const r = calculateVAT(1000);
    expect(r.taxableAmount).toBe(1000);
    expect(r.vatAmount).toBe(150);
    expect(r.totalWithVat).toBe(1150);
    expect(r.vatRate).toBe(15);
  });

  it('returns 0 for exempt', () => {
    const r = calculateVAT(1000, 'exempt');
    expect(r.vatAmount).toBe(0);
    expect(r.totalWithVat).toBe(1000);
  });

  it('returns 0 for zero_rated', () => {
    expect(calculateVAT(1000, 'zero_rated').vatAmount).toBe(0);
  });

  it('extracts VAT from price-inclusive amount', () => {
    const r = calculateVAT(1150, 'standard', true);
    expect(r.taxableAmount).toBe(1000);
    expect(r.vatAmount).toBe(150);
    expect(r.totalWithVat).toBe(1150);
  });
});

describe('calculateInvoiceVAT', () => {
  it('returns zeros for empty', () => {
    const r = calculateInvoiceVAT([]);
    expect(r.subtotal).toBe(0);
    expect(r.grandTotal).toBe(0);
  });

  it('processes items with quantity and discount', () => {
    const items = [
      { unitPrice: 200, quantity: 2, discount: 10, discountType: 'percentage' },
      { unitPrice: 100, quantity: 1 },
    ];
    const r = calculateInvoiceVAT(items);
    expect(r.items).toHaveLength(2);
    expect(r.subtotal).toBeGreaterThan(0);
    expect(r.grandTotal).toBe(r.subtotal + r.totalVat);
  });
});

describe('calculateDiscount', () => {
  it('returns 0 for no discount', () => {
    expect(calculateDiscount(100, 0)).toBe(0);
    expect(calculateDiscount(100, null)).toBe(0);
  });

  it('applies fixed discount capped at amount', () => {
    expect(calculateDiscount(100, 30, 'fixed')).toBe(30);
    expect(calculateDiscount(100, 200, 'fixed')).toBe(100);
  });

  it('applies percentage discount', () => {
    expect(calculateDiscount(200, 10, 'percentage')).toBe(20);
  });
});

// ═══════════════ Invoice ═══════════════

describe('calculateInvoiceTotals', () => {
  it('returns invalid for null', () => {
    expect(calculateInvoiceTotals(null).isValid).toBe(false);
  });

  it('calculates grand total with items', () => {
    const invoice = {
      items: [{ unitPrice: 500, quantity: 2 }],
    };
    const r = calculateInvoiceTotals(invoice);
    expect(r.isValid).toBe(true);
    expect(r.subtotal).toBe(1000);
    expect(r.grandTotal).toBeCloseTo(1150, 0);
  });

  it('applies invoice-level discount', () => {
    const invoice = {
      items: [{ unitPrice: 1000, quantity: 1 }],
      invoiceDiscount: 100,
      invoiceDiscountType: 'fixed',
    };
    const r = calculateInvoiceTotals(invoice);
    expect(r.invoiceDiscount).toBe(100);
    expect(r.taxableAmount).toBe(900);
  });

  it('computes remainingAmount after partial payment', () => {
    const invoice = {
      items: [{ unitPrice: 1000, quantity: 1 }],
      paidAmount: 500,
    };
    const r = calculateInvoiceTotals(invoice);
    expect(r.remainingAmount).toBe(r.grandTotal - 500);
  });
});

describe('calculatePaymentStatus', () => {
  it('returns unpaid for 0 paid', () => {
    expect(calculatePaymentStatus(1000, 0)).toBe('unpaid');
  });

  it('returns paid when fully covered', () => {
    expect(calculatePaymentStatus(1000, 1000)).toBe('paid');
    expect(calculatePaymentStatus(1000, 1500)).toBe('paid');
  });

  it('returns partial for in-between', () => {
    expect(calculatePaymentStatus(1000, 500)).toBe('partial');
  });

  it('handles non-number gracefully', () => {
    expect(calculatePaymentStatus('a', 'b')).toBe('unpaid');
  });
});

describe('generateInvoiceNumber', () => {
  it('creates formatted number', () => {
    expect(generateInvoiceNumber('INV', 2025, 42)).toBe('INV-2025-0000042');
  });
});

describe('calculateDueDate', () => {
  it('returns null for missing date', () => {
    expect(calculateDueDate(null)).toBeNull();
  });

  it('adds 30 days by default', () => {
    const r = calculateDueDate('2025-01-01');
    expect(r).toBe('2025-01-31');
  });

  it('respects custom netDays', () => {
    expect(calculateDueDate('2025-01-01', 10)).toBe('2025-01-11');
  });
});

describe('checkInvoiceOverdue', () => {
  it('not overdue when due in future', () => {
    const r = checkInvoiceOverdue('2099-01-01');
    expect(r.isOverdue).toBe(false);
  });

  it('detects overdue days', () => {
    const r = checkInvoiceOverdue('2020-01-01', '2020-01-15');
    expect(r.isOverdue).toBe(true);
    expect(r.daysOverdue).toBe(14);
  });

  it('handles null dueDate', () => {
    expect(checkInvoiceOverdue(null).isOverdue).toBe(false);
  });
});

// ═══════════════ ZATCA QR ═══════════════

describe('generateZatcaQRData', () => {
  it('returns invalid for null', () => {
    expect(generateZatcaQRData(null).isValid).toBe(false);
  });

  it('returns invalid for missing required fields', () => {
    const r = generateZatcaQRData({ sellerName: 'X' });
    expect(r.isValid).toBe(false);
  });

  it('generates base64 QR for valid data', () => {
    const r = generateZatcaQRData({
      sellerName: 'مركز الأوائل',
      vatNumber: '300000000000003',
      invoiceDateTime: '2025-01-01T12:00:00Z',
      totalAmount: 1150,
      vatAmount: 150,
    });
    expect(r.isValid).toBe(true);
    expect(r.base64QR.length).toBeGreaterThan(0);
    expect(r.fields).toHaveLength(5);
  });
});

describe('validateVatNumber', () => {
  it('false for null/short', () => {
    expect(validateVatNumber(null)).toBe(false);
    expect(validateVatNumber('123')).toBe(false);
  });

  it('true for 15-digit number', () => {
    expect(validateVatNumber('300000000000003')).toBe(true);
  });
});

describe('validateSaudiIBAN', () => {
  it('false for null/wrong prefix', () => {
    expect(validateSaudiIBAN(null)).toBe(false);
    expect(validateSaudiIBAN('DE1234')).toBe(false);
  });

  it('true for valid SA + 22 digits', () => {
    expect(validateSaudiIBAN('SA1234567890123456789012')).toBe(true);
  });
});

// ═══════════════ Insurance ═══════════════

describe('calculateInsuranceCoverage', () => {
  it('returns invalid for null', () => {
    expect(calculateInsuranceCoverage(null, null).isValid).toBe(false);
  });

  it('applies deductible, coverage, and annual limit', () => {
    const r = calculateInsuranceCoverage(1000, {
      coveragePercentage: 80,
      deductibleAmount: 100,
      annualLimit: 5000,
      usedAmount: 0,
    });
    expect(r.isValid).toBe(true);
    // after deductible: 900, covered: 720
    expect(r.afterDeductible).toBe(900);
    expect(r.coveredAmount).toBe(720);
    expect(r.approvedAmount).toBe(720);
    expect(r.patientShare).toBe(280);
  });

  it('detects annual limit exceeded', () => {
    const r = calculateInsuranceCoverage(1000, {
      coveragePercentage: 100,
      deductibleAmount: 0,
      annualLimit: 500,
      usedAmount: 400,
    });
    expect(r.limitExceeded).toBe(true);
    expect(r.approvedAmount).toBe(100);
  });
});

describe('validateInsuranceClaim', () => {
  it('returns errors for null', () => {
    expect(validateInsuranceClaim(null).isValid).toBe(false);
  });

  it('validates all required fields', () => {
    const r = validateInsuranceClaim({});
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(7);
  });

  it('accepts valid claim', () => {
    const r = validateInsuranceClaim({
      beneficiaryId: 'b1',
      insuranceCompanyId: 'ins1',
      memberId: 'M1',
      policyNumber: 'POL1',
      diagnosisCodes: ['F84.0'],
      items: [{ serviceCode: 'SVC1', claimedAmount: 500 }],
      serviceDateFrom: '2025-01-01',
      serviceDateTo: '2025-01-31',
    });
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});

describe('calculateClaimTotal', () => {
  it('returns 0 for empty', () => {
    expect(calculateClaimTotal([]).totalClaimed).toBe(0);
  });

  it('sums claimedAmounts', () => {
    const items = [{ claimedAmount: 300 }, { claimedAmount: 500 }];
    const r = calculateClaimTotal(items);
    expect(r.totalClaimed).toBe(800);
    expect(r.itemCount).toBe(2);
  });
});

// ═══════════════ Accounting ═══════════════

describe('validateJournalEntry', () => {
  it('invalid for empty lines', () => {
    expect(validateJournalEntry([]).isBalanced).toBe(false);
  });

  it('invalid for single line', () => {
    expect(validateJournalEntry([{ debit: 100 }]).isBalanced).toBe(false);
  });

  it('balanced when debits = credits', () => {
    const lines = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 1000 },
    ];
    const r = validateJournalEntry(lines);
    expect(r.isBalanced).toBe(true);
    expect(r.totalDebit).toBe(1000);
    expect(r.totalCredit).toBe(1000);
  });

  it('unbalanced with difference', () => {
    const lines = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 900 },
    ];
    const r = validateJournalEntry(lines);
    expect(r.isBalanced).toBe(false);
    expect(r.difference).toBe(100);
  });
});

describe('generateInvoiceJournalLines', () => {
  it('returns empty for null', () => {
    expect(generateInvoiceJournalLines(null, null)).toEqual([]);
  });

  it('generates debit/credit lines for invoice', () => {
    const lines = generateInvoiceJournalLines(
      { totalAmount: 1150, taxableAmount: 1000, vatAmount: 150, invoiceNumber: 'INV-001' },
      { receivable: '1200', revenue: '4100', vat: '2140' }
    );
    expect(lines).toHaveLength(3);
    expect(lines[0].debit).toBe(1150);
    expect(lines[1].credit).toBe(1000);
    expect(lines[2].credit).toBe(150);
  });

  it('omits VAT line when no VAT', () => {
    const lines = generateInvoiceJournalLines(
      { totalAmount: 1000, taxableAmount: 1000, vatAmount: 0 },
      { receivable: '1200', revenue: '4100' }
    );
    expect(lines).toHaveLength(2);
  });
});

describe('calculateAccountBalance', () => {
  it('asset has debit normal balance', () => {
    const r = calculateAccountBalance('asset', 5000, 2000);
    expect(r.normalBalance).toBe('debit');
    expect(r.balance).toBe(3000);
    expect(r.isNormalBalance).toBe(true);
  });

  it('liability has credit normal balance', () => {
    const r = calculateAccountBalance('liability', 1000, 4000);
    expect(r.normalBalance).toBe('credit');
    expect(r.balance).toBe(3000);
  });

  it('revenue has credit normal balance', () => {
    const r = calculateAccountBalance('revenue', 0, 5000);
    expect(r.balance).toBe(5000);
  });

  it('expense has debit normal balance', () => {
    const r = calculateAccountBalance('expense', 3000, 0);
    expect(r.balance).toBe(3000);
  });
});

// ═══════════════ Aging Report ═══════════════

describe('calculateAgingReport', () => {
  it('handles empty/null', () => {
    expect(calculateAgingReport(null).total).toBe(0);
    expect(calculateAgingReport([]).total).toBe(0);
  });

  it('buckets invoices by age', () => {
    const invoices = [
      { dueDate: '2025-06-01', remainingAmount: 500, status: 'issued' },
      { dueDate: '2025-04-01', remainingAmount: 300, status: 'issued' },
      { dueDate: '2025-01-01', remainingAmount: 200, status: 'issued' },
    ];
    const r = calculateAgingReport(invoices, '2025-06-15');
    expect(r.total).toBe(1000);
    expect(r.totalUnpaidInvoices).toBe(3);
    expect(r.buckets.current.count).toBeGreaterThanOrEqual(1);
  });

  it('ignores cancelled invoices', () => {
    const invoices = [{ dueDate: '2025-01-01', remainingAmount: 500, status: 'cancelled' }];
    const r = calculateAgingReport(invoices);
    expect(r.total).toBe(0);
  });
});

// ═══════════════ Session Pricing ═══════════════

describe('calculateSessionPrice', () => {
  it('returns invalid for unknown specialization', () => {
    expect(calculateSessionPrice('unknown', 45).isValid).toBe(false);
  });

  it('returns price for pt individual_45', () => {
    const r = calculateSessionPrice('pt', 45, 'individual');
    expect(r.isValid).toBe(true);
    expect(r.basePrice).toBe(200);
    expect(r.vatAmount).toBe(30);
    expect(r.totalWithVat).toBe(230);
  });

  it('returns invalid for unsupported duration', () => {
    expect(calculateSessionPrice('pt', 120, 'individual').isValid).toBe(false);
  });

  it('uses custom pricing when provided', () => {
    const custom = { individual_30: 150 };
    const r = calculateSessionPrice('custom', 30, 'individual', custom);
    expect(r.isValid).toBe(true);
    expect(r.basePrice).toBe(150);
  });
});

// ═══════════════ Statistics ═══════════════

describe('calculateRevenueStatistics', () => {
  it('returns empty for no invoices', () => {
    expect(calculateRevenueStatistics([]).total).toBe(0);
  });

  it('computes totals and breakdowns', () => {
    const invoices = [
      {
        totalAmount: 1000,
        vatAmount: 150,
        paidAmount: 1000,
        remainingAmount: 0,
        paymentStatus: 'paid',
        specialization: 'pt',
        paymentMethod: 'cash',
        invoiceDate: '2025-06-01',
      },
      {
        totalAmount: 500,
        vatAmount: 75,
        paidAmount: 0,
        remainingAmount: 500,
        paymentStatus: 'unpaid',
        specialization: 'ot',
        invoiceDate: '2025-06-01',
      },
    ];
    const r = calculateRevenueStatistics(invoices);
    expect(r.totalRevenue).toBe(1500);
    expect(r.totalVat).toBe(225);
    expect(r.paidInvoices).toBe(1);
    expect(r.unpaidInvoices).toBe(1);
    expect(r.collectionRate).toBeGreaterThan(0);
    expect(r.bySpecialization.pt).toBe(1000);
    expect(r.netRevenue).toBe(1275);
  });

  it('filters by branchId', () => {
    const invoices = [
      { totalAmount: 1000, branchId: 'b1' },
      { totalAmount: 500, branchId: 'b2' },
    ];
    const r = calculateRevenueStatistics(invoices, { branchId: 'b1' });
    expect(r.total).toBe(1);
    expect(r.totalRevenue).toBe(1000);
  });
});

describe('calculateBranchProfitability', () => {
  it('returns invalid for null', () => {
    expect(calculateBranchProfitability(null).isValid).toBe(false);
  });

  it('computes profit margin correctly', () => {
    const r = calculateBranchProfitability({ revenues: 100000, expenses: 60000 });
    expect(r.grossProfit).toBe(40000);
    expect(r.profitMargin).toBe(40);
    expect(r.isProfitable).toBe(true);
  });

  it('detects loss', () => {
    const r = calculateBranchProfitability({ revenues: 50000, expenses: 70000 });
    expect(r.isProfitable).toBe(false);
    expect(r.grossProfit).toBe(-20000);
  });
});

describe('calculateBudgetVariance', () => {
  it('returns invalid for non-numbers', () => {
    expect(calculateBudgetVariance('a', 'b').isValid).toBe(false);
  });

  it('on track when variance <= 5%', () => {
    const r = calculateBudgetVariance(100000, 103000);
    expect(r.status).toBe('on_track');
    expect(r.variancePercentage).toBe(3);
  });

  it('slight deviation for 5-15%', () => {
    const r = calculateBudgetVariance(100000, 110000);
    expect(r.status).toBe('slight_deviation');
  });

  it('significant deviation for > 15%', () => {
    const r = calculateBudgetVariance(100000, 120000);
    expect(r.status).toBe('significant_deviation');
  });

  it('favorable when actual < budget', () => {
    const r = calculateBudgetVariance(100000, 90000);
    expect(r.isFavorable).toBe(true);
  });
});

// ═══════════════ Constants ═══════════════

describe('FINANCE_CONSTANTS', () => {
  it('has core properties', () => {
    expect(FINANCE_CONSTANTS.VAT_RATE).toBe(0.15);
    expect(FINANCE_CONSTANTS.VAT_RATE_PERCENT).toBe(15);
    expect(FINANCE_CONSTANTS.AGING_BUCKETS).toHaveLength(5);
    expect(FINANCE_CONSTANTS.DEFAULT_SESSION_PRICES.pt).toBeDefined();
    expect(FINANCE_CONSTANTS.INVOICE_STATUS.PAID).toBe('paid');
  });
});
