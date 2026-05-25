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

async function _doSeed(logger) {
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

async function seedChartOfAccounts({ logger }) {
  // Mongo connect is async; bootstrapFinance runs synchronously at
  // app.js module-load time, so on a cold boot readyState is usually 2
  // (connecting). Don't bail loudly — wait for the `open` event and seed
  // then. This drops the "[financeBootstrap] skip COA seed — Mongo not
  // ready" + "[financeBootstrap] COA seed failed" pair from every boot.
  if (mongoose.connection?.readyState === 1) {
    return _doSeed(logger);
  }
  if (mongoose.connection) {
    mongoose.connection.once('open', () => {
      _doSeed(logger).catch(err => {
        logger.warn?.('[financeBootstrap] deferred COA seed failed', { error: err.message });
      });
    });
  }
  return null;
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

function startBudgetThresholdScheduler({ logger, tickMs = DEFAULT_TICK_MS }) {
  const { sweepBudgetThresholds } = require('../services/finance/budgetThresholdSweeper');
  const Budget = require('../models/Budget');
  const thresholdPercent = Number(process.env.BUDGET_THRESHOLD_PERCENT) || 80;

  async function tick() {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      const { integrationBus } = require('../integration/systemIntegrationBus');
      const res = await sweepBudgetThresholds({
        BudgetModel: Budget,
        integrationBus,
        thresholdPercent,
        logger,
      });
      if (res?.emitted > 0) {
        logger.info?.(
          `[financeBootstrap] budget-threshold sweep: emitted=${res.emitted} scanned=${res.scanned} threshold=${thresholdPercent}%`
        );
      }
    } catch (err) {
      logger.warn?.('[financeBootstrap] budget-threshold sweep failed', { error: err.message });
    }
  }

  const handle = setInterval(tick, tickMs);
  if (handle.unref) handle.unref();
  const initial = setTimeout(tick, 60000);
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
    return { scheduler: null, budgetThresholdScheduler: null };
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

  // W401: budget-threshold sweeper. Env-gated to keep CI / local-dev quiet.
  // Emits finance.budget.threshold_reached for each active budget whose
  // utilization >= BUDGET_THRESHOLD_PERCENT (default 80).
  let budgetThresholdScheduler = null;
  if (process.env.ENABLE_BUDGET_THRESHOLD_SWEEPER === 'true') {
    try {
      budgetThresholdScheduler = startBudgetThresholdScheduler({ logger });
      logger.info?.('[financeBootstrap] budget-threshold sweeper started (24h cadence)');
    } catch (err) {
      logger.warn?.('[financeBootstrap] budget-threshold sweeper not started', {
        error: err.message,
      });
    }
  }

  return { scheduler, budgetThresholdScheduler };
}

module.exports = {
  bootstrapFinance,
  seedChartOfAccounts,
  startChequeExpiryScheduler,
  startBudgetThresholdScheduler,
};
