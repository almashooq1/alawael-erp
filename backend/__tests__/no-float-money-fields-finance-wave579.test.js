'use strict';

/**
 * W579 — float-money drift guard, FINANCE/PAYROLL domain (audit #5 Phase 1).
 *
 * Money must migrate to integer halalas (see docs/architecture/
 * MONEY_TYPE_MIGRATION_PLAN.md + intelligence/money.lib.js). This guard locks
 * the direction for the high-value finance/payroll/statutory models: it scans a
 * CURATED set of finance model files for money-named `type: Number` fields and
 * baselines the current set. Two assertions (W325c ratchet pattern):
 *   (a) any NEW money-Number field in these files fails CI — new code must use
 *       integer halalas via money.lib, not a float.
 *   (b) any baseline entry that no longer exists must be removed from the
 *       baseline — forces the 158 to ratchet DOWN to 0 as each model migrates.
 *
 * Scope is deliberately the finance domain only (where a money name reliably
 * means money). A whole-repo guard is infeasible by name alone — `totalAmount`
 * is money but `totalStudents`/`totalHours` are counts. Expand the file list +
 * re-baseline as later phases migrate other domains.
 *
 * Pure static analysis (reads source as text; no mongoose, no DB).
 */

const fs = require('fs');
const path = require('path');

const MODELS = path.join(__dirname, '..', 'models');

// Curated finance/billing/payroll/statutory files where a Number field is
// reliably money. Keep in sync with the baseline below.
const FINANCE_FILES = [
  'finance/ChartOfAccount.js',
  'finance/ExpenseApprovalChain.js',
  'finance/InsuranceClaim.js',
  'finance/Invoice.js',
  'finance/JournalEntry.js',
  'finance/Payment.js',
  'Invoice.js',
  'Payment.js',
  'PaymentTransaction.js',
  'PaymentRefund.js',
  'PaymentVoucher.js',
  'CreditNote.js',
  'EInvoice.js',
  'AccountingExpense.js',
  'AccountingInvoice.js',
  'AccountingPayment.js',
  'Budget.js',
  'CashFlow.js',
  'CostCenter.js',
  'BankAccount.js',
  'BankReconciliation.js',
  'Cheque.js',
  'PettyCash.js',
  'Expense.js',
  'FinancialTransaction.js',
  'RecurringTransaction.js',
  'VATReturn.js',
  'WithholdingTax.js',
  'TaxFiling.js',
  'TaxCalendar.js',
  'payroll.model.js',
  'gosi.models.js',
  'mudad.models.js',
  'nitaqat.models.js',
  'taqat.models.js',
  'gratuity.model.js',
  'compensation.model.js',
];

const MONEY =
  /(amount|price|cost|salary|wage|fee|premium|subtotal|vat|tax|payable|receivable|deposit|copay|fare|revenue|expense|deduction|allowance|reimbursement|gratuity|refund|balance|payment|contribution|share|due|paid|gross|\bnet|budget|spent|disbursed|funding|incentive|penalt|principal|outstanding|approved|claimed|requested|collected|target|settlement|eos|dues|inflow|outflow)/i;
const COUNT =
  /(employee|month|year|hour|day|row|count|application|hired|interview|jobseeker|participant|session|student|enrolled|attempt|trip|order|response|recipient|delivery|question|item|module|standard|frame|cycle|point|stock|distance|passenger|floor|room|stop|prediction|trial|acknowledg|absence|width|height|size|ratio|rate|percent|score|level|age|number)/i;
const FIELD = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{[^{}]*\btype:\s*Number\b[^{}]*\}/g;

// Money-ish names that are actually counts/statistics (human-curated).
const NOT_MONEY = new Set(['paidOnTime', 'paidLate', 'unpaid', 'partiallyPaid']);

// Baseline of float-money fields in the finance domain as of W579 (2026-05-29).
// Ratchet DOWN only: remove entries as each field migrates to integer halalas.
const BASELINE = new Set([
  'AccountingExpense.js::amount',
  'AccountingInvoice.js::amount',
  'AccountingInvoice.js::paidAmount',
  'AccountingInvoice.js::remainingAmount',
  'AccountingInvoice.js::subtotal',
  'AccountingInvoice.js::totalAmount',
  'AccountingInvoice.js::unitPrice',
  'AccountingInvoice.js::vatAmount',
  'AccountingPayment.js::amount',
  'BankAccount.js::currentBalance',
  'BankAccount.js::openingBalance',
  'BankReconciliation.js::adjustedBankBalance',
  'BankReconciliation.js::adjustedBookBalance',
  'BankReconciliation.js::balance',
  'BankReconciliation.js::bankStatementBalance',
  'BankReconciliation.js::bookBalance',
  'Budget.js::amount',
  'Budget.js::spent',
  'Budget.js::totalBudgeted',
  'Budget.js::totalSpent',
  'CashFlow.js::amount',
  'CashFlow.js::changeAmount',
  'CashFlow.js::endBalance',
  'CashFlow.js::netCashFlow',
  'CashFlow.js::totalInflows',
  'CashFlow.js::totalOutflows',
  'Cheque.js::amount',
  'CostCenter.js::actualAmount',
  'CostCenter.js::actualRevenue',
  'CostCenter.js::allocatedBudget',
  'CostCenter.js::budgetAmount',
  'CostCenter.js::budgetThreshold',
  'CostCenter.js::expenseLimit',
  'CostCenter.js::fixedCosts',
  'CostCenter.js::remainingBudget',
  'CostCenter.js::spentBudget',
  'CostCenter.js::targetRevenue',
  'CostCenter.js::totalBudget',
  'CostCenter.js::totalRevenue',
  'CostCenter.js::variableCosts',
  'CreditNote.js::amount',
  'CreditNote.js::remainingAmount',
  'CreditNote.js::subtotal',
  'CreditNote.js::taxAmount',
  'CreditNote.js::totalAmount',
  'CreditNote.js::unitPrice',
  'EInvoice.js::subtotal',
  'EInvoice.js::taxAmount',
  'EInvoice.js::totalAmount',
  'EInvoice.js::totalVAT',
  'EInvoice.js::unitPrice',
  'Expense.js::amount',
  'Expense.js::taxAmount',
  'FinancialTransaction.js::amount',
  'Invoice.js::patientShare',
  'Invoice.js::subTotal',
  'Invoice.js::taxAmount',
  'Invoice.js::totalAmount',
  'Payment.js::amount',
  'PaymentRefund.js::amount',
  'PaymentTransaction.js::amount',
  'PaymentTransaction.js::feeAmount',
  'PaymentTransaction.js::netAmount',
  'PaymentTransaction.js::refundedAmount',
  'PaymentTransaction.js::vatAmount',
  'PaymentVoucher.js::amount',
  'PaymentVoucher.js::netAmount',
  'PaymentVoucher.js::taxAmount',
  'PettyCash.js::amount',
  'PettyCash.js::balanceAfter',
  'PettyCash.js::currentBalance',
  'PettyCash.js::lastReplenishmentAmount',
  'RecurringTransaction.js::amount',
  'TaxCalendar.js::amount',
  'TaxCalendar.js::estimatedAmount',
  'TaxFiling.js::amount',
  'TaxFiling.js::assessedAmount',
  'TaxFiling.js::differenceAmount',
  'TaxFiling.js::exemptAmount',
  'TaxFiling.js::inputTax',
  'TaxFiling.js::interestAmount',
  'TaxFiling.js::netTaxPayable',
  'TaxFiling.js::outputTax',
  'TaxFiling.js::paidAmount',
  'TaxFiling.js::preparedAmount',
  'TaxFiling.js::submittedAmount',
  'TaxFiling.js::taxableAmount',
  'TaxFiling.js::totalDue',
  'VATReturn.js::adjustedNetVAT',
  'VATReturn.js::amount',
  'VATReturn.js::netVAT',
  'VATReturn.js::totalInputVAT',
  'VATReturn.js::totalOutputVAT',
  'VATReturn.js::vat',
  'WithholdingTax.js::grossAmount',
  'WithholdingTax.js::netAmount',
  'WithholdingTax.js::withholdingAmount',
  'compensation.model.js::amount',
  'finance/ChartOfAccount.js::current_balance',
  'finance/ChartOfAccount.js::opening_balance',
  'finance/ExpenseApprovalChain.js::amount',
  'finance/ExpenseApprovalChain.js::maxAmount',
  'finance/InsuranceClaim.js::approved_amount',
  'finance/InsuranceClaim.js::claimed_amount',
  'finance/InsuranceClaim.js::patient_share',
  'finance/InsuranceClaim.js::total_approved',
  'finance/InsuranceClaim.js::total_claimed',
  'finance/InsuranceClaim.js::unit_price',
  'finance/Invoice.js::balance_due',
  'finance/Invoice.js::paid_amount',
  'finance/Invoice.js::patient_share_amount',
  'finance/Invoice.js::subtotal',
  'finance/Invoice.js::taxable_amount',
  'finance/Invoice.js::total_amount',
  'finance/Invoice.js::unit_price',
  'finance/Invoice.js::vat_amount',
  'finance/Payment.js::amount',
  'finance/Payment.js::refund_amount',
  'gosi.models.js::balanceDue',
  'gosi.models.js::basicSalary',
  'gosi.models.js::employerContribution',
  'gosi.models.js::finalAmount',
  'gosi.models.js::housingAllowance',
  'gosi.models.js::lastSalary',
  'gosi.models.js::otherAllowances',
  'gosi.models.js::totalContribution',
  'gosi.models.js::totalEmployerShare',
  'gosi.models.js::transportAllowance',
  'gratuity.model.js::amount',
  'gratuity.model.js::baseGratuity',
  'gratuity.model.js::grossSettlement',
  'gratuity.model.js::netSettlement',
  'gratuity.model.js::totalDeductions',
  'mudad.models.js::basicSalary',
  'mudad.models.js::deductions',
  'mudad.models.js::housingAllowance',
  'mudad.models.js::netSalary',
  'mudad.models.js::otherAllowances',
  'mudad.models.js::totalAmount',
  'mudad.models.js::totalSalary',
  'mudad.models.js::transportAllowance',
  'nitaqat.models.js::basicSalary',
  'nitaqat.models.js::housingAllowance',
  'nitaqat.models.js::otherAllowances',
  'nitaqat.models.js::paidAmount',
  'nitaqat.models.js::totalAmount',
  'nitaqat.models.js::totalSalary',
  'nitaqat.models.js::transportAllowance',
  'payroll.model.js::amount',
  'payroll.model.js::baseSalary',
  'payroll.model.js::incomeTax',
  'payroll.model.js::netPayable',
  'payroll.model.js::totalAllowances',
  'payroll.model.js::totalDeductions',
  'payroll.model.js::totalGross',
  'payroll.model.js::totalIncentives',
  'payroll.model.js::totalPenalties',
  'taqat.models.js::fundingAmount',
]);

function scan() {
  const found = new Set();
  for (const rel of FINANCE_FILES) {
    const p = path.join(MODELS, rel);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    let m;
    while ((m = FIELD.exec(src))) {
      const f = m[1];
      if (MONEY.test(f) && !COUNT.test(f) && !NOT_MONEY.has(f)) {
        found.add(`${rel}::${f}`);
      }
    }
  }
  return found;
}

describe('no-float-money-fields (finance domain) — W579 ratchet', () => {
  const found = scan();

  it('every curated finance file still exists', () => {
    const missing = FINANCE_FILES.filter(rel => !fs.existsSync(path.join(MODELS, rel)));
    expect(missing).toEqual([]);
  });

  it('(a) no NEW float-money field outside the baseline (use integer halalas via money.lib)', () => {
    const added = [...found].filter(x => !BASELINE.has(x)).sort();
    expect(added).toEqual([]);
  });

  it('(b) no STALE baseline entry — remove it when the field migrates to halalas', () => {
    const stale = [...BASELINE].filter(x => !found.has(x)).sort();
    expect(stale).toEqual([]);
  });

  it('baseline is the documented size and only ratchets down', () => {
    expect(BASELINE.size).toBeLessThanOrEqual(158);
  });
});
