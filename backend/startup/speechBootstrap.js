'use strict';

/**
 * speechBootstrap.js — wire the W284 speech analysis service + routes (W284b).
 *
 * Constructs `speechAnalysisService` with `enforceMfa:true` so the upload-
 * registration step rejects mfaTier < 2 even when called from a worker
 * (W275 service-layer defense, W276 drift-guard auto-detection).
 *
 * Mounts:
 *   /api/speech
 *   /api/v1/speech
 *
 * The actual audio file upload route (multer-s3 + KMS) is intentionally
 * NOT wired here — that requires AWS creds + bucket provisioning.
 * Front-end uploads the file to S3 directly (presigned URL pattern),
 * then POSTs the metadata to /recordings/register.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireSpeech(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) throw new Error('speechBootstrap.wireSpeech: app + logger required');

  try {
    const factory = require('../services/ai/speech-analysis.service');
    const speechRouter = require('../routes/speech.routes');
    const AuditLogger = loadOptional('../services/adapterAuditLogger');

    const speechService = factory({
      AuditLogger,
      enforceMfa: true,
    });

    app._speechAnalysisService = speechService;

    app.use('/api/speech', speechRouter);
    app.use('/api/v1/speech', speechRouter);

    const provider = factory.ANALYSIS_PROVIDER;
    logger.info(
      `[startup] Speech analysis wired (W284b): /api/speech + /api/v1/speech, provider=${provider}, enforceMfa=true`
    );

    // ── W284c: Speech retention sweeper cron ──────────────────────────
    // Daily at 03:00 Asia/Riyadh — purges audio files for recordings
    // past their expiresAt. Disabled by default (ENABLE_SPEECH_RETENTION_CRON=true).
    try {
      const sweeperFactory = require('../services/ai/speech-retention-sweeper.service');
      // storagePurger: prefer real S3-backed purger if @aws-sdk/client-s3 is
      // installed AND AWS_REGION is set. Falls back to log-only with a LOUD
      // warning so the PDPL-retention gap is visible at boot. The log-only
      // path is dev/CI-only; pilot ops should install the SDK before Week 2.
      const { createS3Purger } = require('../services/ai/speech-s3-purger.service');
      const realPurger = createS3Purger({ logger });
      const storagePurger =
        realPurger ||
        (async ({ bucket, key }) => {
          logger.info(
            `[speech-retention] would purge s3://${bucket}/${key} (no-op placeholder — PDPL retention NOT enforced)`
          );
        });
      if (!realPurger) {
        logger.warn(
          '[startup] Speech retention: real S3 purger unavailable (install @aws-sdk/client-s3 + set AWS_REGION). ' +
            'Falls back to log-only purger — audio files will NOT be deleted after expiresAt. PDPL retention non-compliant.'
        );
      } else {
        logger.info(
          '[startup] Speech retention: real S3 purger wired (@aws-sdk/client-s3 + AWS_REGION present) — PDPL retention enforced'
        );
      }
      const sweeper = sweeperFactory({
        storagePurger,
        auditLogger: AuditLogger,
        redactTranscriptOnPurge: false,
      });
      app._speechRetentionSweeper = sweeper;

      const cronEnabled =
        String(process.env.ENABLE_SPEECH_RETENTION_CRON || '').toLowerCase() === 'true';
      if (cronEnabled) {
        const cron = loadOptional('node-cron');
        if (cron) {
          // W316 — opt in to central scheduler registry for live last-run telemetry.
          const schedulerRegistry = require('../intelligence/scheduler-registry');
          schedulerRegistry.register('speech-retention-sweeper', {
            meta: { schedule: '0 3 * * *', tz: 'Asia/Riyadh' },
          });
          const task = cron.schedule(
            '0 3 * * *',
            async () => {
              const started = Date.now();
              logger.info('[speech-retention:cron] starting daily sweep');
              try {
                const result = await sweeper.runOnce();
                schedulerRegistry.recordRun('speech-retention-sweeper', {
                  ok: true,
                  durationMs: Date.now() - started,
                });
                logger.info(
                  `[speech-retention:cron] scanned=${result.scanned} purged=${result.purged} failed=${result.failed}`
                );
              } catch (err) {
                schedulerRegistry.recordRun('speech-retention-sweeper', {
                  ok: false,
                  error: err,
                  durationMs: Date.now() - started,
                });
                logger.error('[speech-retention:cron] sweep failed', { err: err.message });
              }
            },
            { timezone: 'Asia/Riyadh' }
          );
          app._speechRetentionCronTask = task;
          logger.info(
            '[startup] Speech retention sweeper cron scheduled (W284c): daily @ 03:00 Asia/Riyadh'
          );
        } else {
          logger.warn('[startup] Speech retention: cron requested but node-cron not installed.');
        }
      } else {
        logger.info(
          '[startup] Speech retention sweeper wired (W284c). Cron DISABLED (set ENABLE_SPEECH_RETENTION_CRON=true).'
        );
      }
    } catch (sweeperErr) {
      logger.warn('[startup] Speech retention sweeper wiring failed (W284c)', {
        err: sweeperErr.message,
      });
    }
  } catch (err) {
    logger.warn('[startup] Speech analysis wiring failed (W284b)', { err: err.message });
  }
}

module.exports = { wireSpeech };
