'use strict';

/**
 * mudadWpsBootstrap.js — wire the W282 orchestrator + scheduler (W282b).
 *
 * Responsibilities:
 *   1. Construct `mudadWpsOrchestrator` with `enforceMfa:true` (W275
 *      service-layer pattern, auto-detected by W276 drift guard).
 *   2. Wire collaborators: payrollLoader (queries PayrollRun model),
 *      uploader (calls mudadAdapter — pre-existing), statusPoller,
 *      hrNotifier, auditLogger.
 *   3. Schedule monthly cron — day 25 at 02:30 local (Asia/Riyadh) —
 *      to execute the upload across all configured branches.
 *
 * Late binding: routes/operations call `req.app._mudadWpsOrchestrator`
 * at request time, so existing HTTP triggers (admin manual-trigger UI
 * if any) work without further changes.
 *
 * Cron is gated by ENABLE_MUDAD_CRON env var — disabled by default in
 * dev/CI so tests don't trigger real uploads. Set ENABLE_MUDAD_CRON=true
 * + MUDAD_BRANCH_IDS=branch1,branch2 in production.
 */

const path = require('path');

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireMudadWps(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) throw new Error('mudadWpsBootstrap.wireMudadWps: app + logger required');

  try {
    const orchestratorFactory = require('../services/mudad-wps-orchestrator.service');
    const mudadService = require('../services/mudad.service'); // pre-existing

    // ── PAYROLL LOADER (best-effort wiring) ───────────────────────────
    // Reads finalized payroll for (branchId, period.year, period.month).
    // Returns array of { employee, netSalary, iban, employeeNationalId }.
    const PayrollRun =
      loadOptional('../models/PayrollRun') || loadOptional('../models/PayrollPeriod');
    const Payroll = loadOptional('../models/Payroll');

    async function payrollLoader(branchId, period) {
      if (!PayrollRun && !Payroll) {
        logger.warn('[mudad-wps] payrollLoader: no Payroll model found — returning empty array');
        return [];
      }
      const periodStart = new Date(period.year, period.month - 1, 1);
      const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59);
      try {
        const Model = PayrollRun || Payroll;
        const records = await Model.find({
          branchId,
          $or: [
            { periodStart: { $gte: periodStart, $lte: periodEnd } },
            { period: { $gte: periodStart, $lte: periodEnd } },
            { payPeriod: { $gte: periodStart, $lte: periodEnd } },
          ],
          status: { $in: ['finalized', 'approved', 'completed'] },
        }).lean();
        return records.map(r => ({
          employee: r.employee,
          employeeNationalId: r.employeeNationalId || r.nationalId,
          iban: r.iban || r.bankAccount,
          netSalary: r.netSalary || r.netPay,
        }));
      } catch (err) {
        logger.warn('[mudad-wps] payrollLoader query failed', { err: err.message, branchId });
        return [];
      }
    }

    // ── UPLOADER (calls existing mudadAdapter if available) ────────────
    const mudadAdapter = loadOptional('../services/mudadAdapter');
    async function uploader(batchId, fileContent, opts = {}) {
      if (mudadAdapter && typeof mudadAdapter.uploadBatch === 'function') {
        return mudadAdapter.uploadBatch({ batchId, fileContent, ...opts });
      }
      // Fallback: just return a synthetic submissionId for dev/mock mode
      return {
        submissionId: `mock-sub-${batchId}-${Date.now()}`,
        acceptedAt: new Date(),
        mode: 'mock-fallback',
      };
    }

    // ── STATUS POLLER (optional) ──────────────────────────────────────
    async function statusPoller(submissionId) {
      if (mudadAdapter && typeof mudadAdapter.checkStatus === 'function') {
        return mudadAdapter.checkStatus({ submissionId });
      }
      // No status info available
      return { status: 'pending', perEmployeeStatuses: [] };
    }

    // ── HR NOTIFIER ───────────────────────────────────────────────────
    async function hrNotifier({ batchId, submissionId, failures, period, branchId }) {
      const message =
        `WPS upload ${batchId} for ${period.year}-${period.month} on branch ${branchId} ` +
        `has ${failures.length} per-employee failures.`;
      logger.warn('[mudad-wps] HR notify', {
        batchId,
        submissionId,
        failureCount: failures.length,
        branchId,
      });
      // If alertEvaluator/notificationService is wired, escalate:
      try {
        const notify = app._notificationService || loadOptional('../services/notificationService');
        if (notify && typeof notify.notify === 'function') {
          await notify.notify({
            channel: 'hr',
            severity: 'warning',
            title: 'WPS partial failure',
            message,
            metadata: { batchId, submissionId, failureCount: failures.length, branchId, period },
          });
        }
      } catch {
        // notification best-effort
      }
    }

    // ── AUDIT LOGGER ──────────────────────────────────────────────────
    const AuditLogger = loadOptional('../services/adapterAuditLogger');

    // ── CONSTRUCT ORCHESTRATOR ────────────────────────────────────────
    const orchestrator = orchestratorFactory({
      mudadService,
      payrollLoader,
      uploader,
      statusPoller,
      hrNotifier,
      auditLogger: AuditLogger,
      enforceMfa: true,
    });
    app._mudadWpsOrchestrator = orchestrator;

    // ── SCHEDULE MONTHLY CRON ────────────────────────────────────────
    const cronEnabled = String(process.env.ENABLE_MUDAD_CRON || '').toLowerCase() === 'true';
    if (!cronEnabled) {
      logger.info(
        '[startup] Mudad WPS orchestrator wired (W282b). Cron DISABLED (ENABLE_MUDAD_CRON !== true).'
      );
      return;
    }

    const cron = loadOptional('node-cron');
    if (!cron) {
      logger.warn(
        '[startup] Mudad WPS: ENABLE_MUDAD_CRON=true but node-cron not installed; cron skipped.'
      );
      return;
    }

    const branchIds = String(process.env.MUDAD_BRANCH_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (branchIds.length === 0) {
      logger.warn(
        '[startup] Mudad WPS: ENABLE_MUDAD_CRON=true but MUDAD_BRANCH_IDS empty; nothing to schedule.'
      );
      return;
    }

    // Day 25 of each month at 02:30 Asia/Riyadh
    const task = cron.schedule(
      '30 2 25 * *',
      async () => {
        const now = new Date();
        const period = { year: now.getFullYear(), month: now.getMonth() + 1 };
        const actor = { userId: 'system-cron', mfaTier: 2, system: true };
        logger.info(
          `[mudad-wps:cron] starting monthly upload for ${branchIds.length} branches, period=${period.year}-${period.month}`
        );
        for (const branchId of branchIds) {
          try {
            const result = await orchestrator.executeMonthlyWPSUpload({ branchId, period, actor });
            logger.info(
              `[mudad-wps:cron] branch=${branchId} status=${result.status} batchId=${result.batchId}`
            );
          } catch (err) {
            logger.error(`[mudad-wps:cron] branch=${branchId} failed`, {
              err: err.message,
              code: err.code,
            });
          }
        }
      },
      { timezone: 'Asia/Riyadh' }
    );
    app._mudadWpsCronTask = task;
    logger.info(
      `[startup] Mudad WPS cron scheduled (W282b): day 25 @ 02:30 Asia/Riyadh, ${branchIds.length} branches`
    );
  } catch (err) {
    logger.warn('[startup] Mudad WPS wiring failed (W282b)', { err: err.message });
  }
}

module.exports = { wireMudadWps };
