/**
 * Saudi Government Integrations Sub-Registry — سجل التكاملات الحكومية السعودية
 * ══════════════════════════════════════════════════════════════════════════
 * 14 modules: Mudad, Taqat, Disability Authority, CBAHI, Treatment Auth,
 * Family Satisfaction, Noor, Muqeem (2), GOSI Full, ZATCA Phase 2,
 * NPHIES (HL7 FHIR R4), Nitaqat 2.0, PDPL/SDAIA
 *
 * NOTE: qiwa, gosi, government remain in _registry.js core section.
 * NOTE: moi-passport, civil-defense remain in _registry.js inline sections.
 *
 * Extracted from _registry.js for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register all Saudi government integration routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, logger }
 */
module.exports = function registerGovernmentRoutes(app, { safeRequire, dualMount, logger }) {
  // ── Imports ──────────────────────────────────────────────────────────────
  const mudadRoutes = safeRequire('../routes/mudad.routes');
  const taqatRoutes = safeRequire('../routes/taqat.routes');
  const disabilityAuthorityRoutes = safeRequire('../routes/disabilityAuthority.routes');
  const treatmentAuthorizationRoutes = safeRequire('../routes/treatmentAuthorization.routes');
  const familySatisfactionRoutes = safeRequire('../routes/familySatisfaction.routes');
  const noorRoutes = safeRequire('../routes/noor.routes');
  const muqeemRoutes = safeRequire('../routes/muqeem.routes');
  const muqeemFullRoutes = safeRequire('../routes/muqeem-full.routes');
  const gosiFullRoutes = safeRequire('../routes/gosi-full.routes');
  const zatcaPhase2Routes = safeRequire('../routes/zatca-phase2.routes');
  const nphiesRoutes = safeRequire('../routes/nphies.routes');
  // Enhanced Audit — uses a special export pattern (.router from middleware)
  // The proxy may not have .router, so we handle both cases
  let enhancedAuditRouter;
  try {
    const auditModule = require('../middleware/enhancedAudit.middleware');
    enhancedAuditRouter = auditModule.router || auditModule;
    // If it's still not a function/router, create an empty one
    if (typeof enhancedAuditRouter !== 'function' && !enhancedAuditRouter.use) {
      enhancedAuditRouter = require('express').Router();
    }
  } catch (_) {
    enhancedAuditRouter = require('express').Router();
  }
  const nitaqatRoutes = safeRequire('../routes/nitaqat.routes');
  const pdplRoutes = safeRequire('../routes/pdpl.routes');

  // ── Phase A: Core Saudi Integrations (المرحلة أ: التكاملات الأساسية) ───
  dualMount(app, 'mudad', mudadRoutes);
  dualMount(app, 'taqat', taqatRoutes);
  logger.info('Saudi government integrations mounted (Mudad wage protection + Taqat employment)');

  dualMount(app, 'disability-authority', disabilityAuthorityRoutes);
  logger.info(
    'Disability Authority & CBAHI routes mounted (reports, standards, compliance assessments)'
  );

  dualMount(app, 'treatment-authorization', treatmentAuthorizationRoutes);
  logger.info(
    'Treatment Authorization routes mounted (insurance pre-auth, appeals, session tracking)'
  );

  dualMount(app, 'family-satisfaction', familySatisfactionRoutes);
  logger.info('Family Satisfaction Survey routes mounted (templates, responses, NPS, analytics)');

  dualMount(app, 'noor', noorRoutes);
  logger.info('Noor routes mounted (students, IEPs, progress-reports, sync, dashboard)');

  // ── Phase B: Extended Saudi Integrations (المرحلة ب: التكاملات الموسعة) ─
  dualMount(app, 'muqeem', muqeemRoutes);
  logger.info(
    '✅ Muqeem routes mounted (7 endpoints: residence-info, workers, expiring, renew, exit-reentry-visa, final-exit-visa, change-occupation)'
  );

  dualMount(app, 'muqeem-full', muqeemFullRoutes);
  logger.info(
    '✅ Muqeem Full routes mounted (20+ endpoints: iqama-issue/renew/query, exit-reentry-visa, final-exit-visa, cancel, extend, transfers, alerts, dashboard, reports)'
  );

  dualMount(app, 'gosi-full', gosiFullRoutes);
  logger.info(
    '✅ GOSI Full routes mounted (14+ endpoints: calculate, monthly, register, wage, payroll-link, payment-record, EOS-calculate/estimate/confirm/paid, period-report, dashboard, rates)'
  );

  dualMount(app, 'zatca-phase2', zatcaPhase2Routes);
  logger.info(
    '✅ ZATCA Phase 2 routes mounted (7 endpoints: process, build-xml, qr, report, clear, compliance-check, status)'
  );

  dualMount(app, 'nphies', nphiesRoutes);
  logger.info(
    '✅ NPHIES routes mounted (6 endpoints: eligibility-check, claim-submit, prior-auth, claim-status, cancel-claim, status)'
  );

  dualMount(app, 'audit-logs', enhancedAuditRouter);
  logger.info(
    '✅ Enhanced Audit Logs routes mounted (3 endpoints: list with filters, stats, user-audit)'
  );

  logger.info('🇸🇦 Saudi Integrations Complete: Muqeem + ZATCA Phase 2 + NPHIES + Enhanced Audit');

  dualMount(app, 'nitaqat', nitaqatRoutes);
  logger.info(
    '[OK] prompt_18 Nitaqat routes mounted: 25+ endpoints — Nitaqat 2.0 + WPS/Mudad + Qiwa Contracts'
  );

  dualMount(app, 'pdpl', pdplRoutes);
  logger.info('[OK] prompt_19 PDPL routes mounted: 22+ endpoints — SDAIA compliance');

  logger.info(
    '[SA] Government Registry: 14 modules mounted (Mudad, Taqat, Disability Authority, Treatment Auth, Family Satisfaction, Noor, Muqeem×2, GOSI Full, ZATCA Phase 2, NPHIES, Audit Logs, Nitaqat, PDPL)'
  );
};
