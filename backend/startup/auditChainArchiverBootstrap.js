'use strict';
/**
 * auditChainArchiverBootstrap.js — Wave 303
 *
 * Env-gated daily cron at 03:30 Asia/Riyadh that runs the
 * AuditChainArchiver against the PlanReviewAck collection.
 *
 *   ENABLE_AUDIT_CHAIN_ARCHIVE=true            // off by default
 *   AUDIT_CHAIN_ARCHIVE_DAYS=1825              // default 5y
 *   AUDIT_CHAIN_ARCHIVE_DELETE=false           // log-only by default
 *
 * Storage adapter is currently the log-only stub (W284c pattern) —
 * replace with `s3Client.send(new PutObjectCommand(...))` or the
 * Azure Blob SDK once cold storage is provisioned.
 */

function loadOptional(mod) {
  try {
    // eslint-disable-next-line global-require -- conditional dep
    return require(mod);
  } catch {
    return null;
  }
}

function wireAuditChainArchiver(app, { logger } = { logger: console }) {
  if (process.env.ENABLE_AUDIT_CHAIN_ARCHIVE !== 'true') {
    logger.info?.('[AuditChainArchiver] disabled (ENABLE_AUDIT_CHAIN_ARCHIVE!=true)');
    return null;
  }

  let PlanReviewAckModel;
  try {
    // eslint-disable-next-line global-require -- model loaded after mongoose init
    PlanReviewAckModel = require('../models/PlanReviewAck');
  } catch (err) {
    logger.warn?.(`[AuditChainArchiver] PlanReviewAck model missing: ${err.message}`);
    return null;
  }

  const {
    AuditChainArchiverService,
    defaultLogAdapter,
  } = require('../services/audit-chain-archiver.service');

  const days = Number(process.env.AUDIT_CHAIN_ARCHIVE_DAYS) || 1825;
  const deleteAfter = process.env.AUDIT_CHAIN_ARCHIVE_DELETE === 'true';

  const service = new AuditChainArchiverService({
    PlanReviewAckModel,
    adapter: defaultLogAdapter(logger),
    archiveAfterDays: days,
    deleteAfterArchive: deleteAfter,
    logger,
  });

  app._auditChainArchiverService = service;

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn?.('[AuditChainArchiver] node-cron missing — cron not scheduled (service still available for manual runOnce)');
    return service;
  }

  cron.schedule(
    '30 3 * * *',
    async () => {
      try {
        const r = await service.runOnce();
        logger.info?.(
          `[AuditChainArchiver] cron run: archived=${r.archivedChains} skipped=${r.skippedChains} deleted=${r.deletedRows}`
        );
      } catch (err) {
        logger.error?.(`[AuditChainArchiver] cron failure: ${err.message}`);
      }
    },
    { timezone: 'Asia/Riyadh' }
  );

  logger.info?.(
    `[AuditChainArchiver] cron scheduled daily 03:30 Asia/Riyadh days=${days} delete=${deleteAfter}`
  );
  return service;
}

module.exports = { wireAuditChainArchiver };
