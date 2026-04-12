/**
 * Finance & Billing Sub-Registry — سجل مسارات المالية والفوترة
 * ══════════════════════════════════════════════════════════════════════════
 * 16 modules: Finance (7 tiers), Payments, e-Invoicing, Budget Management,
 * Accounting Operations, Saudi Tax, Finance Operations, Finance Module,
 * Payment Gateway, Digital Wallet, Smart Insurance
 *
 * Extracted from _registry.js for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register all finance & billing routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerFinanceRoutes(
  app,
  { safeRequire, dualMount, safeMount, logger }
) {
  // ── Finance 7 Tiers (المالية — 7 مستويات) ──────────────────────────────
  const financeRoutes = safeRequire('../routes/finance.routes.unified');
  const financeAdvancedRoutes = safeRequire('../routes/finance.routes.advanced');
  const financeExtendedRoutes = safeRequire('../routes/finance.routes.extended');
  const financeProRoutes = safeRequire('../routes/finance.routes.pro');
  const financeEnterpriseRoutes = safeRequire('../routes/finance.routes.enterprise');
  const financeUltimateRoutes = safeRequire('../routes/finance.routes.ultimate');
  const financeEliteRoutes = safeRequire('../routes/finance.routes.elite');

  // ── Other Finance Modules ───────────────────────────────────────────────
  const paymentsRouter = safeRequire('../routes/payments.real.routes');
  const saudiTaxRoutes = safeRequire('../routes/saudiTax.routes');
  const financeOperationsRoutes = safeRequire('../routes/financeOperations.routes');
  const financeModuleRoutes = safeRequire('../routes/finance-module.routes');

  // ── Mount: Finance 7 Tiers ──────────────────────────────────────────────
  dualMount(app, 'finance', financeRoutes);
  dualMount(app, 'finance/advanced', financeAdvancedRoutes);
  dualMount(app, 'finance/extended', financeExtendedRoutes);
  dualMount(app, 'finance/pro', financeProRoutes);
  dualMount(app, 'finance/enterprise', financeEnterpriseRoutes);
  dualMount(app, 'finance/ultimate', financeUltimateRoutes);
  dualMount(app, 'finance/elite', financeEliteRoutes);
  logger.info(
    'Finance 7-tier routes mounted (unified → advanced → extended → pro → enterprise → ultimate → elite)'
  );

  // ── Mount: Payments ─────────────────────────────────────────────────────
  dualMount(app, 'payments', paymentsRouter);

  // ── Mount: e-Invoicing & Budget (الفوترة الإلكترونية والميزانية) ────────
  safeMount(app, ['/api/e-invoicing', '/api/v1/e-invoicing'], '../routes/eInvoicing.routes');
  safeMount(
    app,
    ['/api/budget-management', '/api/v1/budget-management'],
    '../routes/budgetManagement.routes'
  );

  // ── Mount: Accounting & Tax (المحاسبة والضرائب) ────────────────────────
  // ⚠️ REMOVED: accounting-operations was a phantom (accountingOperations.routes doesn't exist)
  // Real file: accounting-operations.routes.js (34L) — mounted in _registry.js Phase 36
  dualMount(app, 'saudi-tax', saudiTaxRoutes);
  dualMount(app, 'finance-operations', financeOperationsRoutes);
  logger.info('Saudi Tax + Finance Operations routes mounted');

  // ── Mount: Finance Module (وحدة المالية) ───────────────────────────────
  dualMount(app, 'finance-module', financeModuleRoutes);

  // ── Mount: Payment Gateway, Digital Wallet, Smart Insurance ─────────────
  safeMount(app, ['/api/payment-gateway', '/api/v1/payment-gateway'], './payment-gateway.routes');
  safeMount(app, ['/api/digital-wallet', '/api/v1/digital-wallet'], './digital-wallet.routes');
  safeMount(app, ['/api/smart-insurance', '/api/v1/smart-insurance'], './smart-insurance.routes');
  logger.info('Payment Gateway + Digital Wallet + Smart Insurance routes mounted');

  logger.info('[Finance] All 16 finance modules mounted successfully');
};
