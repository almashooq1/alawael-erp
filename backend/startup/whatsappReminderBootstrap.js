/**
 * WhatsApp Appointment Reminder bootstrap (W1525)
 * ═══════════════════════════════════════════════════════════════════════════
 * Env-gated, default-OFF sweeper that delivers due WhatsApp appointment
 * reminders — the missing delivery for the dormant AppointmentReminder queue.
 *
 * Mirrors the proven whatsappCampaignBootstrap pattern: setInterval (no extra
 * dep), per-tick try/catch, `.unref()` so it never holds the process open, and
 * a DB-readiness guard. The send stays safe: dispatchDueReminders atomically
 * claims each row (attempt increment → no double-send across ticks) and every
 * recipient still passes the consent filter.
 *
 * Activate with ENABLE_WHATSAPP_APPOINTMENT_REMINDERS=true.
 *
 * @module startup/whatsappReminderBootstrap
 */

'use strict';

const mongoose = require('mongoose');

const DEFAULT_TICK_MS = 15 * 60 * 1000; // every 15 min: keep reminders close to their lead time
const INITIAL_DELAY_MS = 120000; // let the app finish booting first

function startWhatsappReminderScheduler({ logger, tickMs = DEFAULT_TICK_MS } = {}) {
  async function tick() {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      const reminderSvc = require('../services/whatsapp/whatsappAppointmentReminder.service');
      const res = await reminderSvc.dispatchDueReminders({ deps: { logger } });
      if (res && (res.sent > 0 || res.failed > 0)) {
        logger?.info?.(
          `[whatsappReminderBootstrap] dispatch: due=${res.due} sent=${res.sent} failed=${res.failed} skipped=${res.skipped}`
        );
      }
    } catch (err) {
      logger?.warn?.('[whatsappReminderBootstrap] sweep failed', { error: err.message });
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

function bootstrapWhatsappReminder({ logger = console, isTestEnv = false } = {}) {
  if (isTestEnv) return { scheduler: null };
  if (process.env.ENABLE_WHATSAPP_APPOINTMENT_REMINDERS !== 'true') {
    return { scheduler: null };
  }
  let scheduler = null;
  try {
    scheduler = startWhatsappReminderScheduler({ logger });
    logger.info?.('[whatsappReminderBootstrap] reminder sweeper started (15-min cadence)');
  } catch (err) {
    logger.warn?.('[whatsappReminderBootstrap] scheduler not started', { error: err.message });
  }
  return { scheduler };
}

module.exports = { bootstrapWhatsappReminder, startWhatsappReminderScheduler };
