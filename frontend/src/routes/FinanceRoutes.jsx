/**
 * Finance & Accounting Routes
 * مسارات المالية والمحاسبة
 */
import { lazyWithRetry } from '../utils/lazyLoader';

// Lazy-loaded Finance pages
const PaymentDashboard = lazyWithRetry(() => import('../pages/finance/PaymentDashboard'));
const AccountingDashboard = lazyWithRetry(() => import('../pages/finance/AccountingDashboard'));
const ChartOfAccounts = lazyWithRetry(() => import('../pages/finance/ChartOfAccounts'));
const JournalEntries = lazyWithRetry(() => import('../pages/finance/JournalEntries'));
const InvoiceManagement = lazyWithRetry(() => import('../pages/finance/InvoiceManagement'));
const ExpenseManagement = lazyWithRetry(() => import('../pages/finance/ExpenseManagement'));
const FinancialReports = lazyWithRetry(() => import('../pages/finance/FinancialReports'));
const CostCenters = lazyWithRetry(() => import('../pages/finance/CostCenters'));
const FixedAssets = lazyWithRetry(() => import('../pages/finance/FixedAssets'));
const VATZakatManagement = lazyWithRetry(() => import('../pages/finance/VATZakatManagement'));
const GeneralLedger = lazyWithRetry(() => import('../pages/finance/GeneralLedger'));
const CashFlowManagement = lazyWithRetry(() => import('../pages/finance/CashFlowManagement'));
const BudgetManagement = lazyWithRetry(() => import('../pages/finance/BudgetManagement'));
const EInvoicing = lazyWithRetry(() => import('../pages/finance/EInvoicing'));
const DonationsDashboard = lazyWithRetry(() => import('../pages/finance/DonationsDashboard'));

// Advanced Finance Pages - الصفحات المتقدمة
const TrialBalance = lazyWithRetry(() => import('../pages/finance/TrialBalance'));
const BankReconciliation = lazyWithRetry(() => import('../pages/finance/BankReconciliation'));
const RecurringTransactions = lazyWithRetry(() => import('../pages/finance/RecurringTransactions'));
const CreditDebitNotes = lazyWithRetry(() => import('../pages/finance/CreditDebitNotes'));
const DepreciationSchedule = lazyWithRetry(() => import('../pages/finance/DepreciationSchedule'));
const FiscalPeriods = lazyWithRetry(() => import('../pages/finance/FiscalPeriods'));
const FinancialRatios = lazyWithRetry(() => import('../pages/finance/FinancialRatios'));
const AgedReports = lazyWithRetry(() => import('../pages/finance/AgedReports'));
const BudgetVariance = lazyWithRetry(() => import('../pages/finance/BudgetVariance'));
const WithholdingTaxPage = lazyWithRetry(() => import('../pages/finance/WithholdingTaxPage'));
const MultiCurrency = lazyWithRetry(() => import('../pages/finance/MultiCurrency'));
const AuditTrail = lazyWithRetry(() => import('../pages/finance/AuditTrail'));
const ExecutiveSummary = lazyWithRetry(() => import('../pages/finance/ExecutiveSummary'));

// Extended Finance Pages - الصفحات الإضافية
const ChequeManagement = lazyWithRetry(() => import('../pages/finance/ChequeManagement'));
const PaymentVouchers = lazyWithRetry(() => import('../pages/finance/PaymentVouchers'));
const CustomerStatements = lazyWithRetry(() => import('../pages/finance/CustomerStatements'));
const TaxCalendar = lazyWithRetry(() => import('../pages/finance/TaxCalendar'));
const FinancialSettings = lazyWithRetry(() => import('../pages/finance/FinancialSettings'));

// Pro Finance Pages - الصفحات الاحترافية
const ProfitLoss = lazyWithRetry(() => import('../pages/finance/ProfitLoss'));
const BalanceSheet = lazyWithRetry(() => import('../pages/finance/BalanceSheet'));
const BankAccounts = lazyWithRetry(() => import('../pages/finance/BankAccounts'));
const PettyCashManagement = lazyWithRetry(() => import('../pages/finance/PettyCashManagement'));
const EmployeeLoans = lazyWithRetry(() => import('../pages/finance/EmployeeLoans'));
const VendorPayments = lazyWithRetry(() => import('../pages/finance/VendorPayments'));

// Enterprise Finance Pages - المميزات المؤسسية
const PeriodClosing = lazyWithRetry(() => import('../pages/finance/PeriodClosing'));
const AccountReconciliation = lazyWithRetry(() => import('../pages/finance/AccountReconciliation'));
const DunningManagement = lazyWithRetry(() => import('../pages/finance/DunningManagement'));
const BankGuarantees = lazyWithRetry(() => import('../pages/finance/BankGuarantees'));
const TreasuryForecasting = lazyWithRetry(() => import('../pages/finance/TreasuryForecasting'));
const TaxFilingTracker = lazyWithRetry(() => import('../pages/finance/TaxFilingTracker'));
const FinancialApprovals = lazyWithRetry(() => import('../pages/finance/FinancialApprovals'));
const CompanyLoans = lazyWithRetry(() => import('../pages/finance/CompanyLoans'));

// Ultimate Finance - الميزات المتقدمة النهائية
const FinancialConsolidation = lazyWithRetry(() => import('../pages/finance/FinancialConsolidation'));
const RevenueRecognition = lazyWithRetry(() => import('../pages/finance/RevenueRecognition'));
const LeaseAccounting = lazyWithRetry(() => import('../pages/finance/LeaseAccounting'));
const InvestmentPortfolio = lazyWithRetry(() => import('../pages/finance/InvestmentPortfolio'));
const CreditManagement = lazyWithRetry(() => import('../pages/finance/CreditManagement'));
const FinancialPlanning = lazyWithRetry(() => import('../pages/finance/FinancialPlanning'));
const ComplianceControls = lazyWithRetry(() => import('../pages/finance/ComplianceControls'));
const IntercompanySettlement = lazyWithRetry(() => import('../pages/finance/IntercompanySettlement'));

// Elite Finance - الميزات الاستراتيجية المتقدمة
const RiskManagement = lazyWithRetry(() => import('../pages/finance/RiskManagement'));
const FinancialDashboardBuilder = lazyWithRetry(() => import('../pages/finance/FinancialDashboardBuilder'));
const TreasuryManagement = lazyWithRetry(() => import('../pages/finance/TreasuryManagement'));
const DebtManagement = lazyWithRetry(() => import('../pages/finance/DebtManagement'));
const CostAllocation = lazyWithRetry(() => import('../pages/finance/CostAllocation'));
const FinancialWorkflow = lazyWithRetry(() => import('../pages/finance/FinancialWorkflow'));
const TaxPlanning = lazyWithRetry(() => import('../pages/finance/TaxPlanning'));
const FinancialAuditManager = lazyWithRetry(() => import('../pages/finance/FinancialAuditManager'));

// New Gap-Fix Pages - الضرائب السعودية والعمليات المالية
const SaudiTaxPage = lazyWithRetry(() => import('../pages/finance/SaudiTaxPage'));
const FinanceOperationsPage = lazyWithRetry(() => import('../pages/finance/FinanceOperationsPage'));

export default function FinanceRoutes() {
  return (
    <>
      <Route path="finance" element={<PaymentDashboard />} />
      {/* Accounting System */}
      <Route path="accounting" element={<AccountingDashboard />} />
      <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
      <Route path="accounting/journal-entries" element={<JournalEntries />} />
      <Route path="accounting/invoices" element={<InvoiceManagement />} />
      <Route path="accounting/expenses" element={<ExpenseManagement />} />
      <Route path="accounting/budgets" element={<BudgetManagement />} />
      <Route path="accounting/reports" element={<FinancialReports />} />
      <Route path="accounting/cost-centers" element={<CostCenters />} />
      <Route path="accounting/fixed-assets" element={<FixedAssets />} />
      <Route path="accounting/vat-zakat" element={<VATZakatManagement />} />
      <Route path="accounting/general-ledger" element={<GeneralLedger />} />
      <Route path="accounting/cash-flow" element={<CashFlowManagement />} />

      {/* Advanced Finance - المحاسبة المتقدمة */}
      <Route path="accounting/trial-balance" element={<TrialBalance />} />
      <Route path="accounting/bank-reconciliation" element={<BankReconciliation />} />
      <Route path="accounting/recurring-transactions" element={<RecurringTransactions />} />
      <Route path="accounting/credit-debit-notes" element={<CreditDebitNotes />} />
      <Route path="accounting/depreciation" element={<DepreciationSchedule />} />
      <Route path="accounting/fiscal-periods" element={<FiscalPeriods />} />
      <Route path="accounting/financial-ratios" element={<FinancialRatios />} />
      <Route path="accounting/aged-reports" element={<AgedReports />} />
      <Route path="accounting/budget-variance" element={<BudgetVariance />} />
      <Route path="accounting/withholding-tax" element={<WithholdingTaxPage />} />
      <Route path="accounting/multi-currency" element={<MultiCurrency />} />
      <Route path="accounting/audit-trail" element={<AuditTrail />} />
      <Route path="accounting/executive-summary" element={<ExecutiveSummary />} />

      {/* Extended Finance - المميزات الإضافية */}
      <Route path="accounting/cheques" element={<ChequeManagement />} />
      <Route path="accounting/payment-vouchers" element={<PaymentVouchers />} />
      <Route path="accounting/customer-statements" element={<CustomerStatements />} />
      <Route path="accounting/tax-calendar" element={<TaxCalendar />} />
      <Route path="accounting/settings" element={<FinancialSettings />} />

      {/* Pro Finance - المميزات الاحترافية */}
      <Route path="accounting/profit-loss" element={<ProfitLoss />} />
      <Route path="accounting/balance-sheet" element={<BalanceSheet />} />
      <Route path="accounting/bank-accounts" element={<BankAccounts />} />
      <Route path="accounting/petty-cash" element={<PettyCashManagement />} />
      <Route path="accounting/employee-loans" element={<EmployeeLoans />} />
      <Route path="accounting/vendor-payments" element={<VendorPayments />} />

      {/* Enterprise Finance - المميزات المؤسسية */}
      <Route path="finance/period-closing" element={<PeriodClosing />} />
      <Route path="finance/account-reconciliation" element={<AccountReconciliation />} />
      <Route path="finance/dunning" element={<DunningManagement />} />
      <Route path="finance/bank-guarantees" element={<BankGuarantees />} />
      <Route path="finance/treasury" element={<TreasuryForecasting />} />
      <Route path="finance/tax-filing" element={<TaxFilingTracker />} />
      <Route path="finance/financial-approvals" element={<FinancialApprovals />} />
      <Route path="finance/company-loans" element={<CompanyLoans />} />

      {/* Ultimate Finance - الميزات المتقدمة النهائية */}
      <Route path="finance/consolidation" element={<FinancialConsolidation />} />
      <Route path="finance/revenue-recognition" element={<RevenueRecognition />} />
      <Route path="finance/leases" element={<LeaseAccounting />} />
      <Route path="finance/investments" element={<InvestmentPortfolio />} />
      <Route path="finance/credit-management" element={<CreditManagement />} />
      <Route path="finance/financial-planning" element={<FinancialPlanning />} />
      <Route path="finance/compliance" element={<ComplianceControls />} />
      <Route path="finance/intercompany" element={<IntercompanySettlement />} />

      {/* Elite Finance - الميزات الاستراتيجية المتقدمة */}
      <Route path="finance/risk-management" element={<RiskManagement />} />
      <Route path="finance/dashboards" element={<FinancialDashboardBuilder />} />
      <Route path="finance/treasury-management" element={<TreasuryManagement />} />
      <Route path="finance/debt-management" element={<DebtManagement />} />
      <Route path="finance/cost-allocation" element={<CostAllocation />} />
      <Route path="finance/workflow" element={<FinancialWorkflow />} />
      <Route path="finance/tax-planning" element={<TaxPlanning />} />
      <Route path="finance/audit-manager" element={<FinancialAuditManager />} />

      {/* Legacy routes */}
      <Route path="balances" element={<AccountingDashboard />} />
      <Route path="expenses" element={<ExpenseManagement />} />
      <Route path="expenses/new" element={<ExpenseManagement />} />
      {/* E-Invoicing */}
      <Route path="e-invoicing" element={<EInvoicing />} />
      {/* Budget */}
      <Route path="budget-management" element={<BudgetManagement />} />
      {/* Donations */}
      <Route path="donations" element={<DonationsDashboard />} />

      {/* Saudi Tax & ZATCA — الضرائب السعودية */}
      <Route path="saudi-tax" element={<SaudiTaxPage />} />
      <Route path="accounting/saudi-tax" element={<SaudiTaxPage />} />

      {/* Finance Operations — العمليات المالية */}
      <Route path="finance-operations" element={<FinanceOperationsPage />} />
      <Route path="accounting/operations" element={<FinanceOperationsPage />} />
    </>
  );
}
