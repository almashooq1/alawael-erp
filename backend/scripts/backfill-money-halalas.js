'use strict';

/**
 * Generalized money→halalas backfill (audit #5, Money-Type Migration — Phase 2).
 *
 * Populates the integer-`*_halalas` siblings on EXISTING rows across all 35
 * finance/payroll/statutory models expanded in Phase 1. New writes already
 * dual-write via each model's pre('save') hook; this only covers pre-EXPAND rows.
 *
 * Idempotent, chunked, DRY-RUN by default. Computes the same values the hooks do
 * (via money.lib.toHalalas) and applies them with updateOne $set — it does NOT
 * call .save(), so it won't re-run model hooks / side effects (invoice numbers,
 * timestamps, etc.). Supports flat fields, dot-paths, and per-element arrays.
 *
 * NOT run by the agent. Usage:
 *   node scripts/backfill-money-halalas.js                 # DRY RUN, all models
 *   node scripts/backfill-money-halalas.js --model=FinanceInvoice
 *   node scripts/backfill-money-halalas.js --apply --batch=1000
 *
 * Env: MONGODB_URI (required in real use).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { toHalalas } = require('../intelligence/money.lib');

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--model=')) || '').split('=')[1] || null;
const BATCH = Number((process.argv.find(a => a.startsWith('--batch=')) || '').split('=')[1]) || 500;
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_erp';

// ── Registry: model registration name → money field paths ────────────────────
// `flat`/`dot` are paths whose `<leaf>_halalas` sibling is set next to the leaf.
// `arrays` are { path, fields } — for each element of the array at `path`, set
// each field's `_halalas` sibling. `require` is the model module to load.
const REGISTRY = [
  {
    model: 'FinanceInvoice',
    require: '../models/finance/Invoice',
    flat: [
      'subtotal',
      'discount_total',
      'taxable_amount',
      'vat_amount',
      'total_amount',
      'paid_amount',
      'balance_due',
      'insurance_coverage_amount',
      'patient_share_amount',
    ],
  },
  {
    model: 'FinancePayment',
    require: '../models/finance/Payment',
    flat: ['amount', 'refund_amount'],
  },
  {
    model: 'CreditNote',
    require: '../models/CreditNote',
    flat: ['subtotal', 'taxAmount', 'totalAmount', 'remainingAmount'],
  },
  {
    model: 'EInvoice',
    require: '../models/EInvoice',
    flat: ['subtotal', 'totalVAT', 'totalDiscount', 'totalAmount'],
  },
  {
    model: 'FinanceJournalEntry',
    require: '../models/finance/JournalEntry',
    flat: ['total_debit', 'total_credit'],
  },
  {
    model: 'ChartOfAccount',
    require: '../models/finance/ChartOfAccount',
    flat: ['current_balance', 'opening_balance'],
  },
  {
    model: 'FinanceInsuranceClaim',
    require: '../models/finance/InsuranceClaim',
    flat: ['total_claimed', 'total_approved', 'total_rejected', 'patient_share'],
  },
  {
    model: 'PaymentTransaction',
    require: '../models/PaymentTransaction',
    flat: ['amount', 'feeAmount', 'netAmount', 'vatAmount', 'refundedAmount'],
  },
  { model: 'PaymentRefund', require: '../models/PaymentRefund', flat: ['amount'] },
  {
    model: 'PaymentVoucher',
    require: '../models/PaymentVoucher',
    flat: ['amount', 'taxAmount', 'netAmount'],
  },
  {
    model: 'AccountingInvoice',
    require: '../models/AccountingInvoice',
    flat: ['subtotal', 'vatAmount', 'totalAmount', 'paidAmount', 'remainingAmount'],
  },
  { model: 'AccountingPayment', require: '../models/AccountingPayment', flat: ['amount'] },
  { model: 'AccountingExpense', require: '../models/AccountingExpense', flat: ['amount'] },
  {
    model: 'BankAccount',
    require: '../models/BankAccount',
    flat: ['openingBalance', 'currentBalance'],
  },
  {
    model: 'BankReconciliation',
    require: '../models/BankReconciliation',
    flat: ['bankStatementBalance', 'bookBalance', 'adjustedBankBalance', 'adjustedBookBalance'],
  },
  { model: 'Budget', require: '../models/Budget', flat: ['totalBudgeted', 'totalSpent'] },
  { model: 'Cheque', require: '../models/Cheque', flat: ['amount'] },
  {
    model: 'PettyCash',
    require: '../models/PettyCash',
    pick: 'PettyCash',
    flat: ['currentBalance', 'lastReplenishmentAmount'],
  },
  {
    model: 'PettyCashTransaction',
    require: '../models/PettyCash',
    pick: 'PettyCashTransaction',
    flat: ['amount', 'balanceAfter'],
  },
  { model: 'Expense', require: '../models/Expense', flat: ['amount', 'taxAmount'] },
  { model: 'RecurringTransaction', require: '../models/RecurringTransaction', flat: ['amount'] },
  {
    model: 'VATReturn',
    require: '../models/VATReturn',
    flat: ['totalOutputVAT', 'totalInputVAT', 'netVAT', 'adjustedNetVAT'],
    dot: [
      'taxableSales.standardRated.amount',
      'taxableSales.standardRated.vat',
      'taxableSales.zeroRated.amount',
      'taxableSales.zeroRated.vat',
      'taxablePurchases.standardRated.amount',
      'taxablePurchases.standardRated.vat',
      'taxablePurchases.imports.amount',
      'taxablePurchases.imports.vat',
    ],
  },
  {
    model: 'WithholdingTax',
    require: '../models/WithholdingTax',
    flat: ['grossAmount', 'withholdingAmount', 'netAmount'],
  },
  { model: 'TaxCalendar', require: '../models/TaxCalendar', flat: ['amount', 'estimatedAmount'] },
  {
    model: 'TaxFiling',
    require: '../models/TaxFiling',
    pick: 'TaxFiling',
    flat: [
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
    ],
  },
  {
    model: 'TaxPenalty',
    require: '../models/TaxFiling',
    pick: 'TaxPenalty',
    flat: ['amount', 'interestAmount', 'totalDue', 'paidAmount'],
  },
  {
    model: 'CostCenter',
    require: '../models/CostCenter',
    dot: [
      'budget.totalBudget',
      'budget.allocatedBudget',
      'budget.spentBudget',
      'budget.remainingBudget',
      'costBreakdown.fixedCosts',
      'costBreakdown.variableCosts',
      'revenue.totalRevenue',
      'revenue.targetRevenue',
      'revenue.actualRevenue',
    ],
    arrays: [{ path: 'monthlyBudgets', fields: ['budgetAmount', 'actualAmount'] }],
  },
  {
    model: 'CashFlow',
    require: '../models/CashFlow',
    dot: [
      'cashPosition.changeAmount',
      'calculations.totalInflows',
      'calculations.totalOutflows',
      'calculations.netCashFlow',
      'calculations.endBalance',
    ],
    arrays: [
      { path: 'inflows', fields: ['amount'] },
      { path: 'outflows', fields: ['amount'] },
    ],
  },
  {
    model: 'FinancialTransaction',
    require: '../models/FinancialTransaction',
    dot: ['debitAccount.amount', 'creditAccount.amount'],
  },
  {
    model: 'ExpenseApprovalChain',
    require: '../models/finance/ExpenseApprovalChain',
    flat: ['amount'],
    arrays: [
      { path: 'chain', fields: ['maxAmount'] },
      { path: 'history', fields: ['amount'] },
    ],
  },
  {
    model: 'Payroll',
    require: '../models/payroll.model',
    flat: ['baseSalary'],
    dot: [
      'calculations.totalAllowances',
      'calculations.totalIncentives',
      'calculations.totalPenalties',
      'calculations.totalGross',
      'calculations.totalDeductions',
      'calculations.totalNet',
      'calculations.netPayable',
      'taxes.incomeTax',
    ],
    arrays: [
      { path: 'allowances', fields: ['amount'] },
      { path: 'deductions', fields: ['amount'] },
    ],
  },
  {
    model: 'MudadSalaryRecord',
    require: '../models/mudad.models',
    pick: 'MudadSalaryRecord',
    flat: [
      'basicSalary',
      'housingAllowance',
      'transportAllowance',
      'otherAllowances',
      'totalSalary',
      'deductions',
      'netSalary',
    ],
  },
  {
    model: 'MudadBatch',
    require: '../models/mudad.models',
    pick: 'MudadBatch',
    flat: ['totalAmount'],
  },
  {
    model: 'WpsRecord',
    require: '../models/nitaqat.models',
    pick: 'WpsRecord',
    flat: ['totalAmount', 'paidAmount'],
  },
  {
    model: 'NitaqatEmploymentContract',
    require: '../models/nitaqat.models',
    pick: 'EmploymentContract',
    flat: [
      'basicSalary',
      'housingAllowance',
      'transportAllowance',
      'otherAllowances',
      'totalSalary',
    ],
  },
  {
    model: 'GOSISubscription',
    require: '../models/gosi.models',
    pick: 'GOSISubscription',
    flat: [
      'basicSalary',
      'housingAllowance',
      'subscriberWage',
      'employeeContribution',
      'employerContribution',
      'totalContribution',
      'balanceDue',
    ],
  },
  {
    model: 'GOSIContribution',
    require: '../models/gosi.models',
    pick: 'GOSIContribution',
    flat: ['subscriberWage', 'employeeContribution', 'employerContribution', 'totalContribution'],
  },
  {
    model: 'GOSIPayment',
    require: '../models/gosi.models',
    pick: 'GOSIPayment',
    flat: ['totalEmployeeShare', 'totalEmployerShare', 'grandTotal'],
  },
  {
    model: 'EndOfServiceCalculation',
    require: '../models/gosi.models',
    pick: 'EndOfServiceCalculation',
    flat: [
      'lastSalary',
      'basicSalary',
      'housingAllowance',
      'transportAllowance',
      'otherAllowances',
      'firstFiveYearsAmount',
      'remainingYearsAmount',
      'fractionYearAmount',
      'fullEntitlement',
      'finalAmount',
    ],
  },
  {
    model: 'TaqatTrainingProgram',
    require: '../models/taqat.models',
    pick: 'TaqatTrainingProgram',
    flat: ['fundingAmount', 'stipend'],
  },
  {
    model: 'CompensationStructure',
    require: '../models/compensation.model',
    pick: 'CompensationStructure',
    arrays: [
      { path: 'baseSalary.ranges', fields: ['amount'] },
      { path: 'fixedAllowances', fields: ['amount'] },
      { path: 'variableAllowances', fields: ['amount'] },
    ],
  },
  {
    model: 'IndividualIncentive',
    require: '../models/compensation.model',
    pick: 'IndividualIncentive',
    flat: ['amount'],
  },
  {
    model: 'PerformancePenalty',
    require: '../models/compensation.model',
    pick: 'PerformancePenalty',
    flat: ['amount'],
  },
  {
    model: 'Gratuity',
    require: '../models/gratuity.model',
    dot: [
      'summary.baseGratuity',
      'summary.totalAdditions',
      'summary.totalDeductions',
      'summary.grossSettlement',
      'summary.netSettlement',
      'calculation.baseGratuity.amount',
    ],
    arrays: [
      { path: 'calculation.baseGratuity.details.yearsBreakdown', fields: ['amount'] },
      { path: 'calculation.additions.items', fields: ['amount'] },
      { path: 'calculation.deductions.items', fields: ['amount'] },
    ],
  },
];

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function h(v) {
  return v === undefined || v === null ? 0 : toHalalas(v);
}

// Build the $set of halalas keys for one (lean) document per a registry entry.
function buildSet(doc, entry) {
  const set = {};
  for (const f of entry.flat || []) set[`${f}_halalas`] = h(doc[f]);
  for (const p of entry.dot || []) {
    const parts = p.split('.');
    const leaf = parts.pop();
    const parentVal = getPath(doc, parts.join('.'));
    if (parentVal !== undefined && parentVal !== null) {
      set[`${parts.join('.')}.${leaf}_halalas`] = h(parentVal[leaf]);
    }
  }
  for (const arr of entry.arrays || []) {
    const list = getPath(doc, arr.path);
    if (Array.isArray(list)) {
      list.forEach((el, i) => {
        if (el == null) return;
        for (const f of arr.fields) set[`${arr.path}.${i}.${f}_halalas`] = h(el[f]);
      });
    }
  }
  // Drop keys already correct (idempotent — only update real diffs).
  for (const k of Object.keys(set)) {
    if (getPath(doc, k) === set[k]) delete set[k];
  }
  return set;
}

async function processEntry(entry) {
  const mod = require(entry.require);
  const Model = entry.pick ? mod[entry.pick] : mod.default || mod;
  if (!Model || typeof Model.find !== 'function') {
    console.error(
      `  ! ${entry.model}: model not resolvable (${entry.require}${entry.pick ? '#' + entry.pick : ''})`
    );
    return { model: entry.model, processed: 0, updated: 0, error: 'unresolved' };
  }
  const total = await Model.estimatedDocumentCount();
  let processed = 0;
  let updated = 0;
  let ops = [];
  const cursor = Model.find({}).lean().cursor();
  for (let doc = await cursor.next(); doc; doc = await cursor.next()) {
    processed += 1;
    const set = buildSet(doc, entry);
    if (Object.keys(set).length) {
      updated += 1;
      if (!APPLY && updated <= 2) console.log(`    e.g. ${entry.model} ${doc._id}:`, set);
      if (APPLY) {
        ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
        if (ops.length >= BATCH) {
          await Model.bulkWrite(ops, { ordered: false });
          ops = [];
        }
      }
    }
  }
  if (APPLY && ops.length) await Model.bulkWrite(ops, { ordered: false });
  console.log(
    `  ${entry.model}: processed=${processed}/${total} ${APPLY ? 'updated' : 'would-update'}=${updated}`
  );
  return { model: entry.model, processed, updated };
}

async function main() {
  await mongoose.connect(URI);
  const entries = ONLY ? REGISTRY.filter(e => e.model === ONLY) : REGISTRY;
  if (!entries.length) {
    console.error(
      `No registry entry for --model=${ONLY}. Known: ${REGISTRY.map(e => e.model).join(', ')}`
    );
    process.exit(1);
  }
  console.log(
    `[backfill-money-halalas] ${APPLY ? 'APPLY' : 'DRY RUN'} — ${entries.length} model(s), batch=${BATCH}`
  );
  const results = [];
  for (const e of entries) results.push(await processEntry(e));
  const totUpd = results.reduce((s, r) => s + (r.updated || 0), 0);
  console.log(
    `[backfill-money-halalas] done — ${APPLY ? 'updated' : 'would-update'} ${totUpd} doc(s) across ${entries.length} model(s)`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('[backfill-money-halalas] FATAL:', err.message);
  process.exit(1);
});
