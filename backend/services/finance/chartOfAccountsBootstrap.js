/**
 * chartOfAccountsBootstrap.js — Phase 12 Commit 6.
 *
 * Idempotent bootstrap for the default Saudi-standard chart of
 * accounts used by the Phase-12 finance services.
 *
 * Why this exists:
 *   An older seeder at backend/seeds/chart-of-accounts.seed.js writes
 *   to the same collection but in a DIFFERENT schema shape (`type`,
 *   `normalBalance`, `name: {ar, en}`). The new services built in
 *   Phase 12 read through the Mongoose model
 *   [backend/models/finance/ChartOfAccount.js](backend/models/finance/ChartOfAccount.js)
 *   which expects `account_type`, `normal_balance`, `name_ar`,
 *   `name_en`, `account_subtype`. The old seed's documents are
 *   therefore invisible to buildTrialBalance/buildProfitAndLoss/etc.
 *
 * This bootstrap writes documents in the service-compatible shape,
 * keyed on `code`, so:
 *   - Fresh installs get a working COA.
 *   - Installs with old-shape docs get their field names upgraded in
 *     place (new fields set; old fields left untouched and harmless).
 *
 * Account codes intentionally match what other finance services
 * reference:
 *   1100 cash, 1110 bank, 1140 cheques-in-collection,
 *   1200 AR control, 2100 AP control, 2300 Output VAT,
 *   4100 rehab-services revenue, 5100 salaries expense, etc.
 */

'use strict';

/**
 * The default chart. Keep this list tightly aligned with codes
 * referenced in:
 *   - services/finance/FinanceService.js       (invoice + payroll entries)
 *   - services/finance/chequeService.js        (cheque journal lines)
 *   - services/finance/subsidiaryLedgerService.js (AR/AP control codes)
 */
const DEFAULT_ACCOUNTS = [
  // ── 1xxx Assets ──────────────────────────────────────────────────
  {
    code: '1000',
    name_ar: 'الأصول',
    name_en: 'Assets',
    account_type: 'asset',
    account_subtype: 'parent',
    normal_balance: 'debit',
    parent_code: null,
    level: 1,
    is_control_account: true,
  },
  {
    code: '1100',
    name_ar: 'النقدية في الصندوق',
    name_en: 'Cash on Hand',
    account_type: 'asset',
    account_subtype: 'cash',
    normal_balance: 'debit',
    parent_code: '1000',
    level: 2,
  },
  {
    code: '1110',
    name_ar: 'النقدية في البنك',
    name_en: 'Cash at Bank',
    account_type: 'asset',
    account_subtype: 'bank',
    normal_balance: 'debit',
    parent_code: '1000',
    level: 2,
  },
  {
    code: '1140',
    name_ar: 'شيكات برسم التحصيل',
    name_en: 'Cheques in Collection',
    account_type: 'asset',
    account_subtype: 'current_asset',
    normal_balance: 'debit',
    parent_code: '1000',
    level: 2,
  },
  {
    code: '1200',
    name_ar: 'الذمم المدينة — مستفيدون',
    name_en: 'Accounts Receivable — Beneficiaries',
    account_type: 'asset',
    account_subtype: 'current_asset',
    normal_balance: 'debit',
    parent_code: '1000',
    level: 2,
    is_control_account: true,
  },
  {
    code: '1210',
    name_ar: 'ذمم مدينة — تأمين صحي',
    name_en: 'AR — Health Insurance',
    account_type: 'asset',
    account_subtype: 'current_asset',
    normal_balance: 'debit',
    parent_code: '1200',
    level: 3,
  },
  {
    code: '1220',
    name_ar: 'ذمم مدينة — جهات حكومية',
    name_en: 'AR — Government Entities',
    account_type: 'asset',
    account_subtype: 'current_asset',
    normal_balance: 'debit',
    parent_code: '1200',
    level: 3,
  },
  {
    code: '1300',
    name_ar: 'سُلف وعهد',
    name_en: 'Advances & Custody',
    account_type: 'asset',
    account_subtype: 'current_asset',
    normal_balance: 'debit',
    parent_code: '1000',
    level: 2,
  },
  {
    code: '1400',
    name_ar: 'الأصول الثابتة',
    name_en: 'Fixed Assets',
    account_type: 'asset',
    account_subtype: 'fixed_asset',
    normal_balance: 'debit',
    parent_code: '1000',
    level: 2,
  },
  {
    code: '1490',
    name_ar: 'مجمع الإهلاك',
    name_en: 'Accumulated Depreciation',
    account_type: 'asset',
    account_subtype: 'fixed_asset_contra',
    normal_balance: 'credit',
    parent_code: '1400',
    level: 3,
  },

  // ── 2xxx Liabilities ─────────────────────────────────────────────
  {
    code: '2000',
    name_ar: 'الخصوم',
    name_en: 'Liabilities',
    account_type: 'liability',
    account_subtype: 'parent',
    normal_balance: 'credit',
    parent_code: null,
    level: 1,
    is_control_account: true,
  },
  {
    code: '2100',
    name_ar: 'الذمم الدائنة — موردون',
    name_en: 'Accounts Payable — Vendors',
    account_type: 'liability',
    account_subtype: 'current_liability',
    normal_balance: 'credit',
    parent_code: '2000',
    level: 2,
    is_control_account: true,
  },
  {
    code: '2300',
    name_ar: 'ضريبة القيمة المضافة المستحقة',
    name_en: 'Output VAT Payable',
    account_type: 'liability',
    account_subtype: 'current_liability',
    normal_balance: 'credit',
    parent_code: '2000',
    level: 2,
  },
  {
    code: '2310',
    name_ar: 'ضريبة القيمة المضافة القابلة للاسترداد',
    name_en: 'Input VAT Receivable',
    account_type: 'liability',
    account_subtype: 'current_liability',
    normal_balance: 'debit',
    parent_code: '2000',
    level: 2,
  },
  {
    code: '2400',
    name_ar: 'GOSI — حصة الموظف المستقطعة',
    name_en: 'GOSI Withheld (Employee)',
    account_type: 'liability',
    account_subtype: 'current_liability',
    normal_balance: 'credit',
    parent_code: '2000',
    level: 2,
  },
  {
    code: '2401',
    name_ar: 'ساند — مستقطع من الموظف',
    name_en: 'SANED Withheld',
    account_type: 'liability',
    account_subtype: 'current_liability',
    normal_balance: 'credit',
    parent_code: '2000',
    level: 2,
  },
  {
    code: '2402',
    name_ar: 'خصومات أخرى',
    name_en: 'Other Deductions Payable',
    account_type: 'liability',
    account_subtype: 'current_liability',
    normal_balance: 'credit',
    parent_code: '2000',
    level: 2,
  },
  {
    code: '2500',
    name_ar: 'مكافأة نهاية الخدمة المستحقة',
    name_en: 'End-of-Service Benefits Accrual',
    account_type: 'liability',
    account_subtype: 'long_term_liability',
    normal_balance: 'credit',
    parent_code: '2000',
    level: 2,
  },

  // ── 3xxx Equity ──────────────────────────────────────────────────
  {
    code: '3000',
    name_ar: 'حقوق الملكية',
    name_en: 'Equity',
    account_type: 'equity',
    account_subtype: 'parent',
    normal_balance: 'credit',
    parent_code: null,
    level: 1,
    is_control_account: true,
  },
  {
    code: '3100',
    name_ar: 'رأس المال',
    name_en: 'Capital',
    account_type: 'equity',
    account_subtype: 'capital',
    normal_balance: 'credit',
    parent_code: '3000',
    level: 2,
  },
  {
    code: '3200',
    name_ar: 'الأرباح المبقاة',
    name_en: 'Retained Earnings',
    account_type: 'equity',
    account_subtype: 'retained_earnings',
    normal_balance: 'credit',
    parent_code: '3000',
    level: 2,
  },

  // ── 4xxx Revenue ─────────────────────────────────────────────────
  {
    code: '4000',
    name_ar: 'الإيرادات',
    name_en: 'Revenue',
    account_type: 'revenue',
    account_subtype: 'parent',
    normal_balance: 'credit',
    parent_code: null,
    level: 1,
    is_control_account: true,
  },
  {
    code: '4100',
    name_ar: 'إيرادات خدمات التأهيل',
    name_en: 'Rehabilitation Services Revenue',
    account_type: 'revenue',
    account_subtype: 'service_revenue',
    normal_balance: 'credit',
    parent_code: '4000',
    level: 2,
  },
  {
    code: '4110',
    name_ar: 'إيرادات جلسات فردية',
    name_en: 'Individual Sessions Revenue',
    account_type: 'revenue',
    account_subtype: 'service_revenue',
    normal_balance: 'credit',
    parent_code: '4100',
    level: 3,
  },
  {
    code: '4120',
    name_ar: 'إيرادات التقييم والتشخيص',
    name_en: 'Assessment & Diagnosis Revenue',
    account_type: 'revenue',
    account_subtype: 'service_revenue',
    normal_balance: 'credit',
    parent_code: '4100',
    level: 3,
  },
  {
    code: '4200',
    name_ar: 'إيرادات تأمين صحي',
    name_en: 'Health Insurance Revenue',
    account_type: 'revenue',
    account_subtype: 'service_revenue',
    normal_balance: 'credit',
    parent_code: '4000',
    level: 2,
  },
  {
    code: '4300',
    name_ar: 'إيرادات تبرعات ومنح',
    name_en: 'Donations & Grants Revenue',
    account_type: 'revenue',
    account_subtype: 'other_revenue',
    normal_balance: 'credit',
    parent_code: '4000',
    level: 2,
  },

  // ── 5xxx Expenses ────────────────────────────────────────────────
  {
    code: '5000',
    name_ar: 'المصروفات',
    name_en: 'Expenses',
    account_type: 'expense',
    account_subtype: 'parent',
    normal_balance: 'debit',
    parent_code: null,
    level: 1,
    is_control_account: true,
  },
  {
    code: '5100',
    name_ar: 'مصروف الرواتب والأجور',
    name_en: 'Salaries & Wages Expense',
    account_type: 'expense',
    account_subtype: 'salaries',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5150',
    name_ar: 'حصة صاحب العمل GOSI',
    name_en: 'GOSI Employer Contribution',
    account_type: 'expense',
    account_subtype: 'salaries',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5200',
    name_ar: 'إيجار',
    name_en: 'Rent Expense',
    account_type: 'expense',
    account_subtype: 'rent',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5220',
    name_ar: 'مرافق (كهرباء، ماء، إنترنت)',
    name_en: 'Utilities',
    account_type: 'expense',
    account_subtype: 'utilities',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5240',
    name_ar: 'مستلزمات طبية',
    name_en: 'Medical Supplies Expense',
    account_type: 'expense',
    account_subtype: 'supplies',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5250',
    name_ar: 'مستلزمات مكتبية',
    name_en: 'Office Supplies Expense',
    account_type: 'expense',
    account_subtype: 'supplies',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5300',
    name_ar: 'مصروفات إدارية',
    name_en: 'Administrative Expenses',
    account_type: 'expense',
    account_subtype: 'professional',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5340',
    name_ar: 'تسويق وإعلان',
    name_en: 'Marketing & Advertising',
    account_type: 'expense',
    account_subtype: 'marketing',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5500',
    name_ar: 'إهلاك الأصول الثابتة',
    name_en: 'Depreciation Expense',
    account_type: 'expense',
    account_subtype: 'depreciation',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5620',
    name_ar: 'رسوم بنكية',
    name_en: 'Bank Charges',
    account_type: 'expense',
    account_subtype: 'financial',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
  {
    code: '5900',
    name_ar: 'مصروفات أخرى',
    name_en: 'Other Expenses',
    account_type: 'expense',
    account_subtype: 'other',
    normal_balance: 'debit',
    parent_code: '5000',
    level: 2,
  },
];

function defaults(acct) {
  return {
    code: acct.code,
    name_ar: acct.name_ar,
    name_en: acct.name_en,
    account_type: acct.account_type,
    account_subtype: acct.account_subtype || null,
    parent_code: acct.parent_code === undefined ? null : acct.parent_code,
    level: acct.level || 1,
    normal_balance: acct.normal_balance,
    is_active: true,
    is_control_account: !!acct.is_control_account,
  };
}

/**
 * Run the bootstrap against a Mongoose ChartOfAccount model.
 * Idempotent: each account is upserted by `code`.
 *
 * Returns { inserted, updated, total }.
 */
async function bootstrap({ ChartOfAccountModel, accounts = DEFAULT_ACCOUNTS }) {
  if (!ChartOfAccountModel) throw new Error('ChartOfAccountModel is required');
  let inserted = 0;
  let updated = 0;

  for (const acct of accounts) {
    const payload = defaults(acct);
    const existing = await ChartOfAccountModel.findOne({ code: acct.code }).lean();
    if (existing) {
      await ChartOfAccountModel.updateOne({ code: acct.code }, { $set: payload });
      updated += 1;
    } else {
      if (typeof ChartOfAccountModel.create === 'function') {
        await ChartOfAccountModel.create(payload);
      } else {
        const doc = new ChartOfAccountModel(payload);
        await doc.save();
      }
      inserted += 1;
    }
  }

  return { inserted, updated, total: inserted + updated };
}

/**
 * Return the list of codes this bootstrap manages — useful for health
 * checks and tests that want to verify the COA is in a known state.
 */
function listCodes() {
  return DEFAULT_ACCOUNTS.map(a => a.code);
}

module.exports = { bootstrap, listCodes, DEFAULT_ACCOUNTS };
