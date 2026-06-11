'use strict';

/**
 * payEquitySweeperBootstrap.js — Wave 1194.
 *
 * Turns the on-demand W1193 pay-equity analysis into PROACTIVE monitoring: a
 * monthly cron persists a branch-scoped PayEquitySnapshot per branch (so /trends
 * accumulates a real series) and logs a structured WARNING when a branch breaches
 * the equity-score floor or a reportable demographic gap exceeds the ceiling.
 *
 * Mirrors the W364 clinicalSweepersBootstrap contract: single shared node-cron,
 * Asia/Riyadh timezone, env-gated (OFF by default), per-iteration try/catch.
 *
 *   ENABLE_PAY_EQUITY_SWEEPER=true     — schedule it (1st of month, 06:00 Riyadh)
 *   PAY_EQUITY_BRANCH_IDS=b1,b2        — branches to snapshot (else ALL active Branch docs)
 *   PAY_EQUITY_SCORE_FLOOR=70          — warn when equityScore < floor
 *   PAY_EQUITY_GAP_CEILING=15          — warn when a reportable median gap % > ceiling
 *
 * It MUTATES (creates snapshot docs) — the only write the sweep performs — but it
 * never alters Employee/salary data. Full alert-channel wiring (an alerts/rules/*
 * rule over the snapshot series) is a documented follow-up; the structured warn +
 * the persisted /trends series are the monitoring surface today.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

async function resolveBranchIds(logger) {
  const fromEnv = (process.env.PAY_EQUITY_BRANCH_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  // fall back to every active branch
  const mongoose = require('mongoose');
  let Branch;
  try {
    Branch = mongoose.model('Branch');
  } catch {
    logger.warn('[pay-equity] Branch model unavailable + PAY_EQUITY_BRANCH_IDS unset; nothing to sweep');
    return [];
  }
  const filter = { $or: [{ status: 'active' }, { isActive: true }, { status: { $exists: false } }] };
  const rows = await Branch.find(filter).select('_id').limit(500).lean();
  return rows.map(r => String(r._id));
}

function breachesOf(doc, floor, ceiling) {
  const out = [];
  if (typeof doc.equityScore === 'number' && doc.equityScore < floor) {
    out.push(`equityScore=${doc.equityScore} < floor ${floor}`);
  }
  for (const [dim, g] of [
    ['gender', doc.genderGap],
    ['nationality', doc.nationalityGap],
  ]) {
    if (g && g.reportable && typeof g.medianGapPct === 'number' && g.medianGapPct > ceiling) {
      out.push(`${dim} medianGap=${g.medianGapPct}% > ceiling ${ceiling}% (disadvantaged: ${g.direction})`);
    }
  }
  return out;
}

function wirePayEquitySweeper(app, deps = {}) {
  const { logger } = deps;
  if (!logger) {
    throw new Error('payEquitySweeperBootstrap.wirePayEquitySweeper: logger required');
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; pay-equity sweeper not scheduled');
    return;
  }
  const TZ = { timezone: 'Asia/Riyadh' };
  const svc = loadOptional('../services/hr/payEquityService');
  if (!svc) {
    logger.warn('[startup] payEquityService unavailable; pay-equity sweeper not scheduled');
    return;
  }

  let scheduledCount = 0;

  if (process.env.ENABLE_PAY_EQUITY_SWEEPER === 'true') {
    const floor = Number(process.env.PAY_EQUITY_SCORE_FLOOR) || 70;
    const ceiling = Number(process.env.PAY_EQUITY_GAP_CEILING) || 15;
    // 1st of every month, 06:00 Asia/Riyadh
    cron.schedule(
      '0 6 1 * *',
      async () => {
        try {
          const branchIds = await resolveBranchIds(logger);
          if (!branchIds.length) return;
          let snapped = 0;
          let breached = 0;
          for (const branchId of branchIds) {
            try {
              const doc = await svc.snapshot({ branchId });
              snapped++;
              const breaches = breachesOf(doc, floor, ceiling);
              if (breaches.length) {
                breached++;
                logger.warn(
                  `[pay-equity] BREACH branch=${branchId} headcount=${doc.headcount} score=${doc.equityScore} :: ${breaches.join('; ')}`
                );
              }
            } catch (perBranchErr) {
              logger.error(`[pay-equity] snapshot failed branch=${branchId}`, perBranchErr);
            }
          }
          logger.info(`[pay-equity] monthly sweep: ${snapped} snapshot(s), ${breached} breach(es)`);
        } catch (err) {
          logger.error('[pay-equity] sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info('[startup] W1194 pay-equity monitoring sweeper scheduled (monthly, 1st @ 06:00 Asia/Riyadh)');
  }

  if (scheduledCount === 0) {
    logger.info('[startup] pay-equity sweeper disabled (ENABLE_PAY_EQUITY_SWEEPER!=true)');
  }
}

module.exports = { wirePayEquitySweeper, breachesOf, resolveBranchIds };
