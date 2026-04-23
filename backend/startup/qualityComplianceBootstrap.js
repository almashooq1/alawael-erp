'use strict';

/**
 * qualityComplianceBootstrap.js — Phase 13 Commit 11 (4.0.60).
 *
 * Wires the Phase 13 QMS + Compliance stack at application
 * startup:
 *
 *   1. Rebuilds the lazy singletons for the four Phase-13 services
 *      (ManagementReview, EvidenceVault, ComplianceCalendar,
 *      ControlLibrary) so the calendar gets the vault + management-
 *      review adapters bound.
 *
 *   2. Wires the HealthScoreAggregator default with all sources
 *      available at boot time.
 *
 *   3. Starts the two sweepers (evidence retention + calendar
 *      alert) and registers graceful-shutdown hooks.
 *
 *   4. Optionally seeds the Control Library for a provided
 *      `seedScope` (a `{ tenantId, branchId }` tuple — usually the
 *      HQ organisation only) so new deploys come up with the 58
 *      controls present. Idempotent by service contract.
 *
 * Style matches `redFlagBootstrap.js`:
 *   • pure wiring, no auth / route mounting
 *   • returns `null` if the Mongo connection isn't ready
 *   • dispatcher is optional (defaults to a no-op)
 *
 * Usage:
 *
 *   const q = bootstrapQualityCompliance({
 *     logger,
 *     dispatcher: webhookDispatcher,  // optional
 *     seedScope: null,                // { branchId: hqId } to seed HQ
 *     startSweepers: !isTestEnv,
 *   });
 *   if (q) {
 *     registerShutdownHook('QualityCompliance', q.shutdown);
 *   }
 */

const mongoose = require('mongoose');

const EvidenceItem = require('../models/quality/EvidenceItem.model');
const ManagementReview = require('../models/quality/ManagementReview.model');
const ComplianceCalendarEvent = require('../models/quality/ComplianceCalendarEvent.model');
const QualityControl = require('../models/quality/QualityControl.model');

const { createManagementReviewService } = require('../services/quality/managementReview.service');
const { createEvidenceVaultService } = require('../services/quality/evidenceVault.service');
const {
  createComplianceCalendarService,
} = require('../services/quality/complianceCalendar.service');
const { createControlLibraryService } = require('../services/quality/controlLibrary.service');
const {
  createHealthScoreAggregator,
} = require('../services/quality/healthScoreAggregator.service');
const {
  createEvidenceRetentionSweeper,
} = require('../services/quality/evidenceRetentionSweeper.service');
const {
  createComplianceCalendarAlertSweeper,
} = require('../services/quality/complianceCalendarAlertSweeper.service');

/**
 * Entry point. Returns:
 *   {
 *     managementReview, evidenceVault, complianceCalendar,
 *     controlLibrary, healthScore,
 *     evidenceSweeper, calendarSweeper,
 *     shutdown: async () => void
 *   }
 * or `null` if Mongo isn't ready.
 */
function bootstrapQualityCompliance({
  logger = console,
  dispatcher = null,
  extraSources = {},
  seedScope = null,
  startSweepers = true,
  autoCheckRunners = {},
} = {}) {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('[QMS] bootstrap skipped — mongoose not connected');
    return null;
  }

  // ── 1. Core services ────────────────────────────────────────────
  const managementReview = createManagementReviewService({
    model: ManagementReview,
    dispatcher,
    logger,
  });
  const evidenceVault = createEvidenceVaultService({
    model: EvidenceItem,
    dispatcher,
    logger,
  });
  const controlLibrary = createControlLibraryService({
    model: QualityControl,
    dispatcher,
    logger,
    autoCheckRunners,
  });

  // Calendar gets the vault + management-review adapters so its
  // unified view includes evidence-expiry + scheduled reviews
  // without the operator having to create stored events for them.
  const complianceCalendar = createComplianceCalendarService({
    model: ComplianceCalendarEvent,
    dispatcher,
    logger,
    adapters: {
      evidence_vault: evidenceVault,
      management_review: managementReview,
      ...(extraSources.calendarAdapters || {}),
    },
  });

  // Re-seat the lazy singletons so route handlers (which use
  // `getDefault()`) see the fully-wired instances.
  require('../services/quality/managementReview.service')._replaceDefault?.(managementReview);
  require('../services/quality/evidenceVault.service')._replaceDefault?.(evidenceVault);
  require('../services/quality/complianceCalendar.service')._replaceDefault?.(complianceCalendar);
  require('../services/quality/controlLibrary.service')._replaceDefault?.(controlLibrary);

  // ── 2. Health-score aggregator ──────────────────────────────────
  const healthScore = createHealthScoreAggregator({
    sources: {
      controlLibrary,
      managementReview,
      evidenceVault,
      complianceCalendar,
      // Cross-module sources are best-effort — if a module doesn't
      // expose the expected adapter shape, the pillar degrades to
      // null and the score renormalises. Callers can pass
      // `extraSources` to override.
      incidents: extraSources.incidents || null,
      complaints: extraSources.complaints || null,
      capa: extraSources.capa || null,
      satisfaction: extraSources.satisfaction || null,
      training: extraSources.training || null,
      documents: extraSources.documents || null,
    },
    logger,
  });
  require('../services/quality/healthScoreAggregator.service')._replaceDefault?.(healthScore);

  // ── 3. Sweepers ─────────────────────────────────────────────────
  const evidenceSweeper = createEvidenceRetentionSweeper({
    evidenceModel: EvidenceItem,
    dispatcher,
    logger,
  });
  const calendarSweeper = createComplianceCalendarAlertSweeper({
    calendarService: complianceCalendar,
    eventModel: ComplianceCalendarEvent,
    dispatcher,
    logger,
  });

  if (startSweepers) {
    try {
      evidenceSweeper.start();
    } catch (err) {
      logger.warn(`[QMS] evidence sweeper failed to start: ${err.message}`);
    }
    try {
      calendarSweeper.start();
    } catch (err) {
      logger.warn(`[QMS] calendar sweeper failed to start: ${err.message}`);
    }
  }

  // ── 4. Seeding ──────────────────────────────────────────────────
  if (seedScope) {
    controlLibrary
      .seed(seedScope)
      .then(r =>
        logger.info(
          `[QMS] control library seed → created=${r.created}, updated=${r.updated}, total=${r.total}`
        )
      )
      .catch(err => logger.warn(`[QMS] seed failed: ${err.message}`));
  }

  logger.info('[QMS] Phase 13 bootstrap complete — services wired, sweepers running');

  async function shutdown() {
    try {
      evidenceSweeper.stop();
    } catch {
      /* ignore */
    }
    try {
      calendarSweeper.stop();
    } catch {
      /* ignore */
    }
  }

  return {
    managementReview,
    evidenceVault,
    complianceCalendar,
    controlLibrary,
    healthScore,
    evidenceSweeper,
    calendarSweeper,
    shutdown,
  };
}

module.exports = { bootstrapQualityCompliance };
