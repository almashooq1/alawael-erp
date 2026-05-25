/**
 * speech.routes.js — Speech analysis HTTP surface (W284b).
 *
 * Per W284 design: this commit ships the registry endpoint (after the
 * audio is uploaded to S3 by the front-end, register the metadata) +
 * analysis trigger + read endpoints. The actual S3 multipart upload
 * (multer-s3 with KMS encryption) is intentionally NOT in this commit —
 * that requires AWS credentials + bucket provisioning that aren't agent-
 * autonomous. The route below accepts the post-upload metadata as JSON.
 *
 * MFA tiers:
 *   POST /recordings/register     tier 2 (PHI write, consent-gated)
 *   POST /recordings/:id/analyze  tier 1 (kicks off analysis on already-uploaded recording)
 *   GET  /recordings/:id          tier 1 (reads transcript + metrics)
 *   GET  /recordings              tier 1 (list for beneficiary; branch-scoped)
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

function getService(req) {
  return req.app._speechAnalysisService;
}

router.use(authenticate);
router.use(attachMfaActor);

// ── Health probe ───────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  const svc = getService(req);
  if (!svc) return res.status(503).json({ success: false, code: 'SPEECH_NOT_WIRED' });
  const provider = require('../services/ai/speech-analysis.service').ANALYSIS_PROVIDER;
  return res.json({ success: true, provider });
});

// ── REGISTER UPLOAD — call after audio is in S3 ────────────────────────
router.post('/recordings/register', requireMfaTier(2), async (req, res) => {
  try {
    const svc = getService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'SPEECH_NOT_WIRED' });
    const actor = {
      userId: req.user?._id || req.user?.id,
      mfaTier: req.actor?.mfaLevel || 0,
    };
    const recording = await svc.registerUpload({
      beneficiaryId: req.body.beneficiaryId,
      sessionId: req.body.sessionId || null,
      therapistId: req.user?._id || req.user?.id,
      branchId: req.user?.branchId || null,
      consentRecordId: req.body.consentRecordId,
      storageBucket: req.body.storageBucket,
      storageKey: req.body.storageKey,
      encryptionKeyId: req.body.encryptionKeyId,
      audioHash: req.body.audioHash,
      audioDurationSeconds: req.body.audioDurationSeconds,
      audioFormat: req.body.audioFormat,
      audioSizeBytes: req.body.audioSizeBytes,
      actor,
    });
    return res.status(201).json({ success: true, recording });
  } catch (err) {
    const status =
      err.code === 'SPEECH_INVALID_INPUT'
        ? 400
        : err.code === 'SPEECH_MFA_INSUFFICIENT'
          ? 403
          : err.code === 'SPEECH_CONSENT_NOT_FOUND'
            ? 404
            : err.code?.startsWith('SPEECH_CONSENT')
              ? 403
              : err.code === 'SPEECH_MODEL_UNAVAILABLE'
                ? 503
                : 500;
    logger.warn('[speech] register error', { code: err.code });
    return res
      .status(status)
      .json({ success: false, code: err.code || 'REGISTER_FAILED', error: safeError(err) });
  }
});

// ── TRIGGER ANALYSIS ───────────────────────────────────────────────────
router.post('/recordings/:id/analyze', requireMfaTier(1), async (req, res) => {
  try {
    const svc = getService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'SPEECH_NOT_WIRED' });
    const result = await svc.runAnalysis(req.params.id);
    return res.json({ success: true, recording: result });
  } catch (err) {
    const status =
      err.code === 'SPEECH_RECORDING_NOT_FOUND'
        ? 404
        : err.code === 'SPEECH_LIVE_NOT_CONFIGURED'
          ? 503
          : err.code === 'SPEECH_MODEL_UNAVAILABLE'
            ? 503
            : 500;
    return res
      .status(status)
      .json({ success: false, code: err.code || 'ANALYZE_FAILED', error: safeError(err) });
  }
});

// ── READ ONE ───────────────────────────────────────────────────────────
router.get('/recordings/:id', requireMfaTier(1), async (req, res) => {
  try {
    const Recording = require('../models/SpeechSessionRecording');
    const rec = await Recording.findById(req.params.id).lean();
    if (!rec) return res.status(404).json({ success: false, code: 'SPEECH_RECORDING_NOT_FOUND' });
    // W413: branch isolation — pre-W413 distinguished cross-branch via a
    // dedicated 403 code; unifying with the not-found 404 closes the
    // existence-probe side channel. See parent-portal W411/W412 doctrine.
    const userBranch = req.user?.branchId;
    if (userBranch && rec.branchId && String(rec.branchId) !== String(userBranch)) {
      return res.status(404).json({ success: false, code: 'SPEECH_RECORDING_NOT_FOUND' });
    }
    return res.json({ success: true, recording: rec });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── LIST BY BENEFICIARY ────────────────────────────────────────────────
router.get('/recordings', requireMfaTier(1), async (req, res) => {
  try {
    const Recording = require('../models/SpeechSessionRecording');
    const beneficiaryId = req.query.beneficiaryId;
    if (!beneficiaryId) {
      return res.status(400).json({ success: false, code: 'SPEECH_BENEFICIARY_REQUIRED' });
    }
    const query = { beneficiaryId };
    // Branch isolation
    if (req.user?.branchId) query.branchId = req.user.branchId;
    const items = await Recording.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(req.query.limit, 10) || 50, 200))
      .select('-acousticMetrics -articulation -fluency -languageSample') // light list
      .lean();
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
