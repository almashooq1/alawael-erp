'use strict';

/**
 * gasSnapshotBootstrap.js — W455.
 *
 * Wires the weekly GAS T-score snapshot cron. Each Friday at 03:00
 * Asia/Riyadh, for every active beneficiary (per configured branches),
 * computes their composite T-score via the W264 gas.service and persists
 * a GasScoreSnapshot for trend visualization.
 *
 * Env-gated (opt-in per CLAUDE.md doctrine — all crons default OFF):
 *   ENABLE_GAS_SNAPSHOT_CRON=true             enables the weekly cron
 *   GAS_SNAPSHOT_BRANCH_IDS=b1,b2             comma-separated branch IDs
 *
 * Idempotency: snapshots are time-keyed; running twice in the same week
 * creates two rows. Callers can dedupe on (beneficiaryId, snapshotDate
 * truncated to week, snapshotType='weekly') if needed. Not idempotent
 * at the storage layer by design — snapshots are observations, not
 * deduplicated state.
 *
 * Per Phase A of docs/blueprint/beneficiary-lifecycle-v3.md + the W286
 * env-gated cron pattern + W338 multi-cron bootstrap precedent.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireGasSnapshots(app, deps = {}) {
  const { logger } = deps;
  if (!logger) {
    throw new Error('gasSnapshotBootstrap.wireGasSnapshots: logger required');
  }

  if (process.env.ENABLE_GAS_SNAPSHOT_CRON !== 'true') {
    return; // opt-in: silently skip when disabled
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; W455 GAS snapshot cron not scheduled');
    return;
  }

  const branchIdsRaw = process.env.GAS_SNAPSHOT_BRANCH_IDS || '';
  const branchIds = branchIdsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (branchIds.length === 0) {
    logger.warn(
      '[startup] W455 GAS_SNAPSHOT_BRANCH_IDS empty — cron registered but will be a no-op'
    );
  }

  // Weekly: Friday 03:00 Asia/Riyadh
  cron.schedule(
    '0 3 * * 5',
    async () => {
      try {
        await runGasSnapshotSweep(branchIds, logger);
      } catch (err) {
        logger.error('[gas-snapshot] sweep failed', err);
      }
    },
    { timezone: 'Asia/Riyadh' }
  );

  logger.info(
    `[startup] W455 GAS snapshot cron scheduled (weekly Fri 03:00 Asia/Riyadh, ${branchIds.length} branch(es))`
  );
}

/**
 * Run one snapshot pass. Exported for testability + manual invocation
 * from admin scripts.
 */
async function runGasSnapshotSweep(branchIds, logger) {
  const mongoose = require('mongoose');

  function safeModel(name) {
    try {
      return mongoose.model(name);
    } catch {
      return null;
    }
  }

  const Beneficiary = safeModel('Beneficiary');
  const GasScoreSnapshot = safeModel('GasScoreSnapshot');
  if (!Beneficiary || !GasScoreSnapshot) {
    logger.warn('[gas-snapshot] Beneficiary or GasScoreSnapshot model not registered — skipping');
    return { processed: 0, created: 0, errors: 0 };
  }

  // Lazy-load gas service so the bootstrap doesn't pull mongoose chains
  // until the cron fires.
  let gasService;
  try {
    gasService = require('../services/gas.service');
  } catch (err) {
    logger.warn(`[gas-snapshot] gas.service unavailable: ${err.message}`);
    return { processed: 0, created: 0, errors: 0 };
  }

  let processed = 0;
  let created = 0;
  let errors = 0;

  for (const branchId of branchIds) {
    const beneficiaries = await Beneficiary.find({ branchId, status: 'active' })
      .select('_id')
      .lean();

    for (const b of beneficiaries) {
      processed++;
      try {
        const composite = await gasService.computeBeneficiaryComposite(b._id);
        if (composite == null || composite.tScore == null) continue;

        await GasScoreSnapshot.create({
          beneficiaryId: b._id,
          branchId,
          snapshotDate: new Date(),
          snapshotType: 'weekly',
          tScore: composite.tScore,
          ci95Lower: composite.ci95Lower ?? null,
          ci95Upper: composite.ci95Upper ?? null,
          goalCount: composite.goalCount ?? 0,
          totalWeight: composite.totalWeight ?? 0,
          rhoUsed: composite.rho ?? 0.3,
          triggeredBy: 'cron',
        });
        created++;
      } catch (err) {
        errors++;
        logger.warn(`[gas-snapshot] beneficiary=${b._id} failed: ${err.message}`);
      }
    }
  }

  logger.info(
    `[gas-snapshot] weekly sweep complete: processed=${processed} created=${created} errors=${errors}`
  );
  return { processed, created, errors };
}

module.exports = { wireGasSnapshots, runGasSnapshotSweep };
