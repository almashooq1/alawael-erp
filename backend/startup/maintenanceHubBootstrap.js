'use strict';

/**
 * maintenanceHubBootstrap.js — W808.
 *
 * Env-gated cron for bulk preventive WO creation on PPM-due facility assets.
 * Uses maintenanceHub.service.spawnDueMaintenanceWorkOrders (idempotent).
 *
 *   ENABLE_PPM_WO_SWEEPER=true
 *   PPM_WO_SWEEPER_BRANCH_IDS=b1,b2   (optional — empty = all branches in query)
 *   PPM_WO_SWEEPER_LIMIT=25           (optional, default 25, max 50)
 *
 * Schedule: daily 05:30 Asia/Riyadh (before clinical 08:00 sweepers).
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireMaintenanceHubSweepers(app, deps = {}) {
  const { logger } = deps;
  if (!logger) {
    throw new Error('maintenanceHubBootstrap: logger required');
  }

  if (process.env.ENABLE_PPM_WO_SWEEPER !== 'true') {
    return;
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; PPM WO sweeper not scheduled');
    return;
  }

  const mongoose = require('mongoose');
  const TZ = { timezone: 'Asia/Riyadh' };
  const { createMaintenanceHubService } = require('../services/operations/maintenanceHub.service');
  const {
    createWorkOrderStateMachine,
  } = require('../services/operations/workOrderStateMachine.service');

  cron.schedule(
    '30 5 * * *',
    async () => {
      if (mongoose.connection.readyState !== 1) {
        logger.warn('[PPM-WO-Sweeper] skipped — mongoose not connected');
        return;
      }
      try {
        const WorkOrderModel = require('../models/MaintenanceWorkOrder');
        const FacilityAsset = require('../models/FacilityAsset');
        let sm = null;
        try {
          sm = require('./operationsBootstrap')._getWorkOrderStateMachine?.();
        } catch {
          sm = null;
        }
        if (!sm) {
          sm = createWorkOrderStateMachine({ workOrderModel: WorkOrderModel });
        }

        const branchIds = String(process.env.PPM_WO_SWEEPER_BRANCH_IDS || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        const limit = Math.min(Math.max(Number(process.env.PPM_WO_SWEEPER_LIMIT) || 25, 1), 50);

        const hub = createMaintenanceHubService({
          workOrderModel: WorkOrderModel,
          facilityAssetModel: FacilityAsset,
          workOrderStateMachine: sm,
        });

        if (branchIds.length === 0) {
          const result = await hub.spawnDueMaintenanceWorkOrders({ limit });
          logger.info(
            `[PPM-WO-Sweeper] all-branches created=${result.created.length} skipped=${result.skipped.length} errors=${result.errors.length}`
          );
          return;
        }

        let totalCreated = 0;
        let totalSkipped = 0;
        let totalErrors = 0;
        for (const branchId of branchIds) {
          const result = await hub.spawnDueMaintenanceWorkOrders({
            branchFilter: { branchId },
            limit,
          });
          totalCreated += result.created.length;
          totalSkipped += result.skipped.length;
          totalErrors += result.errors.length;
        }
        logger.info(
          `[PPM-WO-Sweeper] branches=${branchIds.length} created=${totalCreated} skipped=${totalSkipped} errors=${totalErrors}`
        );
      } catch (err) {
        logger.error(`[PPM-WO-Sweeper] run failed: ${err.message}`);
      }
    },
    TZ
  );

  logger.info(
    '[startup] W808 PPM WO sweeper scheduled (05:30 Asia/Riyadh, ENABLE_PPM_WO_SWEEPER=true)'
  );
}

module.exports = { wireMaintenanceHubSweepers };
