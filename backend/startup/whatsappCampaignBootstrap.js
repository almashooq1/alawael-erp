/**
 * WhatsApp Campaign Scheduler bootstrap (W1501)
 * ═══════════════════════════════════════════════════════════════════════════
 * Env-gated, default-OFF sweeper that launches scheduled WhatsApp campaigns
 * whose `scheduledAt` has passed. Completes the W1495 campaign feature — until
 * now a `status:'scheduled'` campaign only fired via the manual /run (or
 * /campaigns/run-due) endpoint.
 *
 * Mirrors the proven absenceDetectionBootstrap pattern: setInterval (no extra
 * dep), per-tick try/catch, `.unref()` so it never holds the process open, and
 * a DB-readiness guard. The send itself stays safe: runDueCampaigns →
 * runCampaign claims status='running' (idempotent against a double tick) and
 * every recipient still passes the consent filter + rate-limit.
 *
 * Activate with ENABLE_WHATSAPP_CAMPAIGN_SCHEDULER=true.
 *
 * @module startup/whatsappCampaignBootstrap
 */

'use strict';

const mongoose = require('mongoose');

const DEFAULT_TICK_MS = 60 * 60 * 1000; // hourly: pick up campaigns due since last tick
const INITIAL_DELAY_MS = 120000; // let the app finish booting first

function startWhatsappCampaignScheduler({ logger, tickMs = DEFAULT_TICK_MS } = {}) {
  async function tick() {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      const whatsappCampaign = require('../services/whatsapp/whatsappCampaign.service');
      const res = await whatsappCampaign.runDueCampaigns({ logger });
      if (res && (res.processed > 0 || res.failed > 0)) {
        logger?.info?.(
          `[whatsappCampaignBootstrap] due-run: due=${res.due} processed=${res.processed} failed=${res.failed}`
        );
      }
    } catch (err) {
      logger?.warn?.('[whatsappCampaignBootstrap] sweep failed', { error: err.message });
    }
  }

  const handle = setInterval(tick, tickMs);
  if (handle.unref) handle.unref();
  const initial = setTimeout(tick, INITIAL_DELAY_MS);
  if (initial.unref) initial.unref();

  return {
    stop() {
      clearInterval(handle);
      clearTimeout(initial);
    },
    _tick: tick,
  };
}

function bootstrapWhatsappCampaign({ logger = console, isTestEnv = false } = {}) {
  if (isTestEnv) return { scheduler: null };
  if (process.env.ENABLE_WHATSAPP_CAMPAIGN_SCHEDULER !== 'true') {
    return { scheduler: null };
  }
  let scheduler = null;
  try {
    scheduler = startWhatsappCampaignScheduler({ logger });
    logger.info?.('[whatsappCampaignBootstrap] campaign scheduler started (hourly cadence)');
  } catch (err) {
    logger.warn?.('[whatsappCampaignBootstrap] scheduler not started', { error: err.message });
  }
  return { scheduler };
}

module.exports = { bootstrapWhatsappCampaign, startWhatsappCampaignScheduler };
