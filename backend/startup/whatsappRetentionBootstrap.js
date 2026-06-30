'use strict';

/**
 * WhatsApp retention sweeper bootstrap (W1424n) — env-gated, OFF by default.
 *
 *   ENABLE_WHATSAPP_RETENTION_SWEEPER=true   # opt in (default: off → no-op)
 *   WHATSAPP_RETENTION_DAYS=<n>              # REQUIRED when enabled (no default)
 *
 * Mirrors the codebase's env-gated sweeper pattern (loadOptional node-cron,
 * Asia/Riyadh, per-iteration try/catch). Deliberately requires an explicit
 * WHATSAPP_RETENTION_DAYS so retention is never applied by accident.
 */

function loadOptional(mod) {
  try {
    return require(mod);
  } catch {
    return null;
  }
}

function bootstrapWhatsappRetention({ logger = console } = {}) {
  if (String(process.env.ENABLE_WHATSAPP_RETENTION_SWEEPER).toLowerCase() !== 'true') {
    return false; // OFF by default — no-op
  }
  const days = Number(process.env.WHATSAPP_RETENTION_DAYS);
  if (!Number.isFinite(days) || days < 1) {
    logger.warn?.(
      '[WhatsApp Retention] enabled but WHATSAPP_RETENTION_DAYS is missing/invalid — sweeper NOT scheduled'
    );
    return false;
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn?.('[WhatsApp Retention] node-cron unavailable — sweeper NOT scheduled');
    return false;
  }

  const { sweepExpired } = require('../services/whatsapp/whatsappRetentionSweeper');
  // Daily at 03:30 Asia/Riyadh.
  cron.schedule(
    '30 3 * * *',
    async () => {
      try {
        await sweepExpired({ days, logger });
      } catch (err) {
        logger.error?.(`[WhatsApp Retention] sweep failed: ${err.message}`);
      }
    },
    { timezone: 'Asia/Riyadh' }
  );

  logger.info?.(
    `[WhatsApp Retention] sweeper scheduled — retain ${days}d, daily 03:30 Asia/Riyadh`
  );
  return true;
}

module.exports = { bootstrapWhatsappRetention };
