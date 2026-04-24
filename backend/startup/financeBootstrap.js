/**
 * financeBootstrap.js — Phase 12 Commit 6.
 *
 * App-startup integration for the Phase-12 finance stack. Two jobs:
 *
 *   1. Seed the default Chart of Accounts in the shape the new
 *      services expect. Idempotent — safe to run on every boot.
 *   2. Register a daily scheduler that runs
 *      chequeService.expireStaleCheques() to enforce the Saudi
 *      180-day cheque expiry rule.
 *
 * Both steps are best-effort: if Mongo isn't connected yet, we log a
 * warning and return instead of crashing boot. The rest of the app
 * is not finance-critical at startup time.
 *
 * Usage from backend/app.js (after Mongo connects):
 *
 *   const { bootstrapFinance } = require('./startup/financeBootstrap');
 *   bootstrapFinance({ logger, isTestEnv: process.env.NODE_ENV === 'test' });
 */

'use strict';

const mongoose = require('mongoose');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TICK_MS = DAY_MS; // every 24h

async function seedChartOfAccounts({ logger }) {
  if (mongoose.connection?.readyState !== 1) {
    logger.warn?.('[financeBootstrap] skip COA seed — Mongo not ready');
    return null;
  }
  try {
    const ChartOfAccount = require('../models/finance/ChartOfAccount');
    const { bootstrap } = require('../services/finance/chartOfAccountsBootstrap');
    const result = await bootstrap({ ChartOfAccountModel: ChartOfAccount });
    logger.info?.(
      `[financeBootstrap] COA seeded: ${result.inserted} new, ${result.updated} updated (total ${result.total})`
    );
    return result;
  } catch (err) {
    logger.warn?.('[financeBootstrap] COA seed failed', { error: err.message });
    return null;
  }
}

function startChequeExpiryScheduler({ logger, tickMs = DEFAULT_TICK_MS }) {
  const chequeService = require('../services/finance/chequeService');
  const Cheque = require('../models/Cheque');

  async function tick() {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      const res = await chequeService.expireStaleCheques({ ChequeModel: Cheque });
      if (res.expiredCount > 0) {
        logger.info?.(
          `[financeBootstrap] expireStaleCheques: flipped ${res.expiredCount} cheques to expired (cutoff ${res.cutoff})`
        );
      }
    } catch (err) {
      logger.warn?.('[financeBootstrap] expireStaleCheques tick failed', {
        error: err.message,
      });
    }
  }

  const handle = setInterval(tick, tickMs);
  if (handle.unref) handle.unref();

  // Fire-and-forget initial tick after a short grace period so it
  // runs once per boot without blocking startup.
  const initial = setTimeout(tick, 45000);
  if (initial.unref) initial.unref();

  return {
    stop() {
      clearInterval(handle);
      clearTimeout(initial);
    },
    _tick: tick,
  };
}

function bootstrapFinance({ logger = console, isTestEnv = false } = {}) {
  // Seed regardless of env so even tests hitting a real DB have
  // the COA ready; the operation is idempotent and cheap.
  seedChartOfAccounts({ logger }).catch(err => {
    logger.warn?.('[financeBootstrap] unexpected seed error', { error: err.message });
  });

  if (isTestEnv) {
    return { scheduler: null };
  }

  let scheduler = null;
  try {
    scheduler = startChequeExpiryScheduler({ logger });
    logger.info?.('[financeBootstrap] cheque-expiry scheduler started (24h cadence, 180-day rule)');
  } catch (err) {
    logger.warn?.('[financeBootstrap] cheque-expiry scheduler not started', {
      error: err.message,
    });
  }

  return { scheduler };
}

module.exports = {
  bootstrapFinance,
  seedChartOfAccounts,
  startChequeExpiryScheduler,
};
