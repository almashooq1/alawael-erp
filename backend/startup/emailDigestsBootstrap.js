'use strict';

/**
 * emailDigestsBootstrap.js — W1246 (جدولة رسائل NBA والملخص الأسبوعي)
 *
 * Env-gated crons (DEFAULT OFF — inert on deploy, house cron template):
 *
 *   ENABLE_EMAIL_DIGESTS=true        master switch
 *   EMAIL_DIGEST_BRANCH_IDS=b1,b2    branches to cover (required when on)
 *
 *   • baseline-due  — daily 07:30 Asia/Riyadh → BASELINE_DUE per therapist
 *   • weekly digest — Sunday 07:00 Asia/Riyadh → WEEKLY_SUPERVISOR_DIGEST
 *
 * Per-iteration try/catch; loadOptional node-cron; READ-ONLY except the
 * email sends themselves (mock-safe while prod SMTP creds are absent).
 */

function loadOptional(name) {
  try {
    return require(name);
  } catch (_e) {
    return null;
  }
}

function wireEmailDigests(app, { logger = console } = {}) {
  const enabled = String(process.env.ENABLE_EMAIL_DIGESTS || '').toLowerCase() === 'true';
  if (!enabled) {
    logger.info('[email-digests] disabled (ENABLE_EMAIL_DIGESTS!=true) — skipping');
    return { enabled: false };
  }
  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[email-digests] node-cron unavailable — skipping');
    return { enabled: false };
  }
  const branchIds = String(process.env.EMAIL_DIGEST_BRANCH_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!branchIds.length) {
    logger.warn('[email-digests] EMAIL_DIGEST_BRANCH_IDS empty — nothing to schedule');
    return { enabled: false };
  }

  const digests = require('../services/email/templateDigests.service');

  async function runBaselineDue() {
    for (const branchId of branchIds) {
      try {
        const { emails, skipped } = await digests.buildBaselineDueEmails({ branchId });
        const outcomes = await digests.sendDigests(emails, { logger });
        logger.info(
          `[email-digests] baseline-due ${branchId}: ${emails.length} emails, ` +
            `${outcomes.filter((o) => o.ok).length} ok, skipped=${JSON.stringify(skipped)}`
        );
      } catch (err) {
        logger.error(`[email-digests] baseline-due ${branchId} failed: ${err.message}`);
      }
    }
  }

  async function runWeeklyDigest() {
    for (const branchId of branchIds) {
      try {
        const { emails, skipped } = await digests.buildWeeklySupervisorDigest({ branchId });
        const outcomes = await digests.sendDigests(emails, { logger });
        logger.info(
          `[email-digests] weekly ${branchId}: ${emails.length} emails, ` +
            `${outcomes.filter((o) => o.ok).length} ok, meta=${JSON.stringify(skipped)}`
        );
      } catch (err) {
        logger.error(`[email-digests] weekly ${branchId} failed: ${err.message}`);
      }
    }
  }

  cron.schedule('30 7 * * *', runBaselineDue, { timezone: 'Asia/Riyadh' });
  cron.schedule('0 7 * * 0', runWeeklyDigest, { timezone: 'Asia/Riyadh' });
  logger.info(
    `[email-digests] wired: baseline-due daily 07:30 + weekly Sun 07:00 (Asia/Riyadh) for ${branchIds.length} branch(es)`
  );

  if (app) app._emailDigests = { runBaselineDue, runWeeklyDigest, branchIds };
  return { enabled: true, branchIds, runBaselineDue, runWeeklyDigest };
}

module.exports = { wireEmailDigests };
