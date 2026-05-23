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
    const AuditLogger = loadOptional('../utils/adapterAuditLogger');

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
  } catch (err) {
    logger.warn('[startup] Speech analysis wiring failed (W284b)', { err: err.message });
  }
}

module.exports = { wireSpeech };
