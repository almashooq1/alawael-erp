'use strict';

/**
 * moduleGapSweepersBootstrap.js — Wave 695.
 *
 * Read-only "overdue / due-for-review" sweepers for the W680–W693 module-gap
 * arc. Each surfaces a time-based breach the module itself can't push on its
 * own (no UI is open at 06:00). Mirrors the W364 clinicalSweepersBootstrap
 * pattern: each sweeper is independently env-gated (ENABLE_*_SWEEPER=true),
 * Asia/Riyadh timezone, per-iteration try/catch, node-cron loaded optionally.
 *
 * W364 INVARIANT preserved: these sweepers are READ-ONLY (log/observe only) —
 * zero state mutation (no persistence writes). A drift guard (W695 test)
 * asserts no mutation creeps in. Wiring an alert/notification channel is later;
 * for now they emit structured `logger.warn` lines a log-drain can alert on.
 *
 * Sweepers (all default OFF):
 *   ENABLE_PANDO_FOLLOWUP_SWEEPER       — P&O orders past followUpDueDate
 *   ENABLE_SENSORY_REVIEW_SWEEPER       — sensory-diet programs past reviewDate
 *   ENABLE_SPONSORSHIP_EXPIRY_SWEEPER   — active sponsorships past endDate
 *   ENABLE_VFSS_PENDING_SWEEPER         — instrumental swallow studies awaiting
 *                                         results > N days after order
 */

function loadOptional(name) {
  try {
    return require(name);
  } catch {
    return null;
  }
}

function safeModel(mongoose, name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

const TZ = { timezone: 'Asia/Riyadh' };
const DAY_MS = 24 * 60 * 60 * 1000;

function wireModuleGapSweepers(app, deps = {}) {
  const logger = deps.logger || console;
  const mongoose = deps.mongoose || require('mongoose');
  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.info?.('[startup] W695 module-gap sweepers skipped (node-cron unavailable)');
    return { scheduled: 0 };
  }

  let scheduled = 0;

  // ── P&O overdue follow-ups (W680) ──────────────────────────────────────
  if (process.env.ENABLE_PANDO_FOLLOWUP_SWEEPER === 'true') {
    cron.schedule(
      '0 6 * * *',
      async () => {
        try {
          const Model = safeModel(mongoose, 'ProstheticOrthoticOrder');
          if (!Model) return;
          const overdue = await Model.find({
            stage: { $nin: ['completed', 'cancelled'] },
            followUpDueDate: { $ne: null, $lt: new Date() },
          })
            .select('beneficiaryId branchId deviceCategory followUpDueDate')
            .limit(500)
            .lean();
          logger.info?.(`[W695 pando-followup] ${overdue.length} P&O order(s) past follow-up`);
          for (const o of overdue.slice(0, 25)) {
            logger.warn?.(
              `[W695 pando-followup] order=${o._id} beneficiary=${o.beneficiaryId} category=${o.deviceCategory} due=${o.followUpDueDate}`
            );
          }
        } catch (err) {
          logger.error?.('[W695 pando-followup] sweep failed', err);
        }
      },
      TZ
    );
    scheduled++;
    logger.info?.('[startup] W695 P&O follow-up sweeper scheduled (daily 06:00 Asia/Riyadh)');
  }

  // ── Sensory-diet review-due (W691) ─────────────────────────────────────
  if (process.env.ENABLE_SENSORY_REVIEW_SWEEPER === 'true') {
    cron.schedule(
      '10 6 * * *',
      async () => {
        try {
          const Model = safeModel(mongoose, 'SensoryDietProgram');
          if (!Model) return;
          const due = await Model.find({
            status: 'active',
            reviewDate: { $ne: null, $lt: new Date() },
          })
            .select('beneficiaryId branchId reviewDate')
            .limit(500)
            .lean();
          logger.info?.(`[W695 sensory-review] ${due.length} sensory-diet program(s) review-due`);
          for (const d of due.slice(0, 25)) {
            logger.warn?.(
              `[W695 sensory-review] program=${d._id} beneficiary=${d.beneficiaryId} reviewDate=${d.reviewDate}`
            );
          }
        } catch (err) {
          logger.error?.('[W695 sensory-review] sweep failed', err);
        }
      },
      TZ
    );
    scheduled++;
    logger.info?.('[startup] W695 sensory-diet review sweeper scheduled (daily 06:10 Asia/Riyadh)');
  }

  // ── Sponsorship expiry (W682) ──────────────────────────────────────────
  if (process.env.ENABLE_SPONSORSHIP_EXPIRY_SWEEPER === 'true') {
    cron.schedule(
      '20 6 * * *',
      async () => {
        try {
          const Model = safeModel(mongoose, 'Sponsorship');
          if (!Model) return;
          const expired = await Model.find({
            status: 'active',
            endDate: { $ne: null, $lt: new Date() },
          })
            .select('donorId beneficiaryId branchId endDate')
            .limit(500)
            .lean();
          logger.info?.(
            `[W695 sponsorship-expiry] ${expired.length} active sponsorship(s) past endDate`
          );
          for (const s of expired.slice(0, 25)) {
            logger.warn?.(
              `[W695 sponsorship-expiry] sponsorship=${s._id} donor=${s.donorId} beneficiary=${s.beneficiaryId} endDate=${s.endDate}`
            );
          }
        } catch (err) {
          logger.error?.('[W695 sponsorship-expiry] sweep failed', err);
        }
      },
      TZ
    );
    scheduled++;
    logger.info?.('[startup] W695 sponsorship-expiry sweeper scheduled (daily 06:20 Asia/Riyadh)');
  }

  // ── VFSS pending results aging (W683) ──────────────────────────────────
  if (process.env.ENABLE_VFSS_PENDING_SWEEPER === 'true') {
    cron.schedule(
      '30 6 * * *',
      async () => {
        try {
          const Model = safeModel(mongoose, 'InstrumentalSwallowStudy');
          if (!Model) return;
          const ageDays = parseInt(process.env.VFSS_PENDING_AGE_DAYS, 10) || 14;
          const cutoff = new Date(Date.now() - ageDays * DAY_MS);
          const aging = await Model.find({
            status: { $in: ['ordered', 'scheduled'] },
            orderedDate: { $lt: cutoff },
          })
            .select('beneficiaryId branchId studyType orderedDate')
            .limit(500)
            .lean();
          logger.info?.(
            `[W695 vfss-pending] ${aging.length} swallow study(ies) awaiting results > ${ageDays}d`
          );
          for (const a of aging.slice(0, 25)) {
            logger.warn?.(
              `[W695 vfss-pending] study=${a._id} beneficiary=${a.beneficiaryId} type=${a.studyType} ordered=${a.orderedDate}`
            );
          }
        } catch (err) {
          logger.error?.('[W695 vfss-pending] sweep failed', err);
        }
      },
      TZ
    );
    scheduled++;
    logger.info?.('[startup] W695 VFSS-pending sweeper scheduled (daily 06:30 Asia/Riyadh)');
  }

  logger.info?.(`[startup] W695 module-gap sweepers wired (${scheduled} active, all opt-in)`);
  return { scheduled };
}

module.exports = { wireModuleGapSweepers };
