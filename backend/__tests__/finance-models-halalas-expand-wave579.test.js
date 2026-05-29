'use strict';

/**
 * W579 — halalas EXPAND for FinancePayment / CreditNote / EInvoice (audit #5
 * Phase 1). Mirrors the FinanceInvoice expand to the sibling finance/billing
 * models. Pure (no DB / no mongoose) — verifies the dual-write helper output
 * for each model's field set, plus static assertions that each model declares
 * the `*_halalas` siblings and wires `deriveHalalas(this, [...])` into a
 * pre('save') hook (matching each model's existing hook style).
 */

const fs = require('fs');
const path = require('path');
const { deriveHalalas, toHalalas } = require('../intelligence/money.lib');

const MODELS = path.join(__dirname, '..', 'models');

const SPECS = [
  { file: 'finance/Payment.js', fields: ['amount', 'refund_amount'] },
  { file: 'CreditNote.js', fields: ['subtotal', 'taxAmount', 'totalAmount', 'remainingAmount'] },
  { file: 'EInvoice.js', fields: ['subtotal', 'totalVAT', 'totalDiscount', 'totalAmount'] },
  { file: 'finance/JournalEntry.js', fields: ['total_debit', 'total_credit'] },
  { file: 'finance/ChartOfAccount.js', fields: ['current_balance', 'opening_balance'] },
  {
    file: 'finance/InsuranceClaim.js',
    fields: ['total_claimed', 'total_approved', 'total_rejected', 'patient_share'],
  },
  {
    file: 'PaymentTransaction.js',
    fields: ['amount', 'feeAmount', 'netAmount', 'vatAmount', 'refundedAmount'],
  },
  { file: 'PaymentRefund.js', fields: ['amount'] },
  { file: 'PaymentVoucher.js', fields: ['amount', 'taxAmount', 'netAmount'] },
  {
    file: 'AccountingInvoice.js',
    fields: ['subtotal', 'vatAmount', 'totalAmount', 'paidAmount', 'remainingAmount'],
  },
  { file: 'AccountingPayment.js', fields: ['amount'] },
  { file: 'AccountingExpense.js', fields: ['amount'] },
  { file: 'BankAccount.js', fields: ['openingBalance', 'currentBalance'] },
  {
    file: 'BankReconciliation.js',
    fields: ['bankStatementBalance', 'bookBalance', 'adjustedBankBalance', 'adjustedBookBalance'],
  },
  { file: 'Budget.js', fields: ['totalBudgeted', 'totalSpent'] },
  { file: 'Cheque.js', fields: ['amount'] },
  {
    file: 'PettyCash.js',
    fields: ['amount', 'balanceAfter', 'currentBalance', 'lastReplenishmentAmount'],
  },
  { file: 'Expense.js', fields: ['amount', 'taxAmount'] },
  { file: 'RecurringTransaction.js', fields: ['amount'] },
  { file: 'WithholdingTax.js', fields: ['grossAmount', 'withholdingAmount', 'netAmount'] },
  { file: 'TaxCalendar.js', fields: ['amount', 'estimatedAmount'] },
  {
    file: 'TaxFiling.js',
    fields: [
      'preparedAmount',
      'submittedAmount',
      'assessedAmount',
      'differenceAmount',
      'taxableAmount',
      'exemptAmount',
      'zeroRatedAmount',
      'inputTax',
      'outputTax',
      'netTaxPayable',
      'amount',
      'interestAmount',
      'totalDue',
      'paidAmount',
    ],
  },
  {
    file: 'CostCenter.js',
    fields: [
      'totalBudget',
      'allocatedBudget',
      'spentBudget',
      'remainingBudget',
      'fixedCosts',
      'variableCosts',
      'totalRevenue',
      'targetRevenue',
      'actualRevenue',
    ],
  },
  {
    file: 'CashFlow.js',
    fields: ['changeAmount', 'totalInflows', 'totalOutflows', 'netCashFlow', 'endBalance'],
  },
  { file: 'FinancialTransaction.js', fields: ['amount'] },
  {
    file: 'VATReturn.js',
    fields: ['totalOutputVAT', 'totalInputVAT', 'netVAT', 'adjustedNetVAT'],
  },
  {
    file: 'payroll.model.js',
    fields: [
      'baseSalary',
      'totalAllowances',
      'totalIncentives',
      'totalPenalties',
      'totalGross',
      'totalDeductions',
      'totalNet',
      'netPayable',
      'incomeTax',
    ],
  },
  {
    file: 'mudad.models.js',
    fields: [
      'basicSalary',
      'housingAllowance',
      'transportAllowance',
      'otherAllowances',
      'totalSalary',
      'deductions',
      'netSalary',
      'totalAmount',
    ],
  },
  {
    file: 'nitaqat.models.js',
    fields: [
      'totalAmount',
      'paidAmount',
      'basicSalary',
      'housingAllowance',
      'transportAllowance',
      'otherAllowances',
      'totalSalary',
    ],
  },
  {
    file: 'gosi.models.js',
    fields: [
      'basicSalary',
      'housingAllowance',
      'subscriberWage',
      'employeeContribution',
      'employerContribution',
      'totalContribution',
      'balanceDue',
      'totalEmployeeShare',
      'totalEmployerShare',
      'grandTotal',
      'lastSalary',
      'transportAllowance',
      'otherAllowances',
      'firstFiveYearsAmount',
      'remainingYearsAmount',
      'fractionYearAmount',
      'fullEntitlement',
      'finalAmount',
    ],
  },
  { file: 'taqat.models.js', fields: ['fundingAmount', 'stipend'] },
];

describe('finance-models halalas expand — W579', () => {
  describe('derivation per model', () => {
    it.each(SPECS)('$file: derives integer-halalas siblings exactly', ({ fields }) => {
      const doc = {};
      fields.forEach((f, i) => {
        doc[f] = [19.99, 100.5, 0.07 + 0.0, 12345.67][i % 4];
      });
      deriveHalalas(doc, fields);
      for (const f of fields) {
        expect(doc[`${f}_halalas`]).toBe(toHalalas(doc[f]));
        expect(Number.isInteger(doc[`${f}_halalas`])).toBe(true);
      }
    });

    it('handles the VAT/float-trap (19.99) exactly', () => {
      const doc = { totalAmount: 19.99 };
      deriveHalalas(doc, ['totalAmount']);
      expect(doc.totalAmount_halalas).toBe(1999);
    });
  });

  describe('model wiring (static)', () => {
    it.each(SPECS)(
      '$file declares siblings + calls deriveHalalas in a save hook',
      ({ file, fields }) => {
        const src = fs.readFileSync(path.join(MODELS, file), 'utf8');
        for (const f of fields) {
          expect(src).toMatch(new RegExp(`${f}_halalas\\s*:\\s*\\{[^}]*type:\\s*Number`));
        }
        expect(src).toMatch(/pre\(\s*['"]save['"]/);
        expect(src).toMatch(/deriveHalalas\(this,/);
        expect(src).toMatch(/money\.lib/);
      }
    );
  });
});
