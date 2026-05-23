/**
 * speech-analysis.service.js — SLP speech analysis pipeline (W284 Phase 3 #6).
 *
 * Two roles:
 *   1. Adapter abstraction: pluggable analysisProvider (mock / Claude /
 *      Whisper API / self-hosted Whisper). Mock returns synthetic
 *      transcript + metrics so the pipeline works end-to-end without
 *      external services.
 *   2. Consent + audit + persistence: every call requires a valid
 *      `voice_recording` Consent. Audio uploads are recorded with
 *      storage metadata; raw audio NEVER persists in MongoDB.
 *
 * MFA tier 2 (W275 service-layer): audio = PHI, requires step-up at
 * upload time. Read of transcript/metrics is tier 1 (lower sensitivity
 * since the audio is already encrypted at rest).
 *
 * MVP scope: this file ships the consent gate + analysis dispatch +
 * mock provider. Real audio upload (multer to S3) + Python microservice
 * wiring are follow-up work — clearly flagged at the end of this file.
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const ANALYSIS_PROVIDER = (process.env.SPEECH_ANALYSIS_PROVIDER || 'mock').toLowerCase();

// ── Pluggable provider ─────────────────────────────────────────────────
async function mockAnalyze({ audioHash, audioDurationSeconds }) {
  // Deterministic synthetic results keyed on audioHash so tests are stable
  const seed = parseInt(audioHash.slice(0, 8), 16);
  const fundamentalFrequencyHz = 110 + (seed % 200); // typical 110-310 Hz
  const correctPhonemes = 50 + (seed % 50);
  const totalPhonemes = correctPhonemes + 10 + (seed % 20);
  return {
    provider: 'mock',
    transcript: 'هذا نص افتراضي للجلسة. The therapist asked the child to repeat words.',
    transcriptLanguage: 'mixed',
    transcriptConfidence: 0.7 + (seed % 30) / 100,
    acousticMetrics: {
      fundamentalFrequencyHz,
      jitterPercent: 0.5 + (seed % 20) / 100,
      shimmerPercent: 2.0 + (seed % 30) / 100,
      hnrDb: 18 + (seed % 8),
      breathinessIndex: (seed % 30) / 100,
    },
    articulation: {
      totalPhonemes,
      correctPhonemes,
      substitutions: Math.floor((totalPhonemes - correctPhonemes) * 0.5),
      omissions: Math.floor((totalPhonemes - correctPhonemes) * 0.3),
      distortions: Math.floor((totalPhonemes - correctPhonemes) * 0.2),
    },
    fluency: {
      syllablesPerMinute: 100 + (seed % 80),
      stutteringEventCount: seed % 5,
    },
    languageSample: {
      mlu: 3.0 + (seed % 30) / 10,
      typeTokenRatio: 0.5 + (seed % 40) / 100,
      utteranceCount: 20 + (seed % 30),
    },
    audioDurationSeconds,
  };
}

async function liveAnalyze(_payload) {
  throw Object.assign(
    new Error(
      'Live speech analysis provider not configured. Set SPEECH_ANALYSIS_PROVIDER + creds.'
    ),
    { code: 'SPEECH_LIVE_NOT_CONFIGURED' }
  );
}

async function dispatchAnalyze(input) {
  if (ANALYSIS_PROVIDER === 'mock') return mockAnalyze(input);
  return liveAnalyze(input);
}

// ── Service factory ─────────────────────────────────────────────────────
function speechAnalysisServiceFactory({
  RecordingModel = null,
  ConsentModel = null,
  AuditLogger = null,
  enforceMfa = false,
} = {}) {
  const Recording = RecordingModel || (mongoose.models?.SpeechSessionRecording ?? null);
  const Consent = ConsentModel || (mongoose.models?.Consent ?? null);

  async function checkConsent(beneficiaryId, consentRecordId) {
    if (!Consent) {
      const err = new Error('Consent model not available');
      err.code = 'SPEECH_CONSENT_MODEL_UNAVAILABLE';
      throw err;
    }
    const consent = await Consent.findById(consentRecordId);
    if (!consent) {
      const err = new Error('Consent record not found');
      err.code = 'SPEECH_CONSENT_NOT_FOUND';
      throw err;
    }
    if (String(consent.beneficiaryId) !== String(beneficiaryId)) {
      const err = new Error('Consent does not match beneficiary');
      err.code = 'SPEECH_CONSENT_MISMATCH';
      throw err;
    }
    if (consent.type !== 'voice_recording') {
      const err = new Error(`Consent type '${consent.type}' insufficient for voice recording`);
      err.code = 'SPEECH_CONSENT_TYPE_INSUFFICIENT';
      throw err;
    }
    if (consent.revokedAt) {
      const err = new Error('Consent has been revoked');
      err.code = 'SPEECH_CONSENT_REVOKED';
      throw err;
    }
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      const err = new Error('Consent has expired');
      err.code = 'SPEECH_CONSENT_EXPIRED';
      throw err;
    }
    return consent;
  }

  async function audit(action, payload) {
    if (!AuditLogger) return;
    try {
      await AuditLogger.log({
        component: 'speech-analysis',
        action,
        timestamp: new Date(),
        ...payload,
      });
    } catch {
      /* best-effort */
    }
  }

  /**
   * registerUpload — call AFTER the audio file is uploaded to encrypted
   * object storage. Persists metadata + kicks off analysis (async).
   */
  async function registerUpload({
    beneficiaryId,
    sessionId = null,
    therapistId,
    branchId = null,
    consentRecordId,
    storageBucket,
    storageKey,
    encryptionKeyId,
    audioHash,
    audioDurationSeconds,
    audioFormat,
    audioSizeBytes,
    actor,
  }) {
    if (!Recording) {
      const err = new Error('SpeechSessionRecording model not available');
      err.code = 'SPEECH_MODEL_UNAVAILABLE';
      throw err;
    }
    if (
      !beneficiaryId ||
      !therapistId ||
      !consentRecordId ||
      !storageBucket ||
      !storageKey ||
      !audioHash ||
      !encryptionKeyId
    ) {
      const err = new Error(
        'beneficiaryId + therapistId + consentRecordId + storage fields required'
      );
      err.code = 'SPEECH_INVALID_INPUT';
      throw err;
    }
    if (enforceMfa) {
      const tier = actor?.mfaTier || 0;
      if (tier < 2) {
        const err = new Error('Speech recording upload requires MFA tier 2');
        err.code = 'SPEECH_MFA_INSUFFICIENT';
        throw err;
      }
    }

    await checkConsent(beneficiaryId, consentRecordId);

    const recording = await Recording.create({
      beneficiaryId,
      sessionId,
      therapistId,
      branchId,
      consentRecordId,
      storageProvider: 's3',
      storageBucket,
      storageKey,
      encryptionAlgorithm: 'AES-256-GCM',
      encryptionKeyId,
      audioHash,
      audioDurationSeconds,
      audioFormat,
      audioSizeBytes,
      analysisStatus: 'uploaded',
      analysisProvider: ANALYSIS_PROVIDER,
    });

    await audit('upload_registered', {
      recordingId: String(recording._id),
      beneficiaryId,
      consentRecordId,
      actorId: actor?.userId,
      audioHash,
      provider: ANALYSIS_PROVIDER,
    });

    return recording;
  }

  /**
   * runAnalysis — synchronous wrapper for the analysis call. In
   * production, this would be invoked by a background worker; for the
   * MVP it's called directly so tests + admin tooling can trigger it.
   */
  async function runAnalysis(recordingId) {
    if (!Recording) {
      const err = new Error('SpeechSessionRecording model not available');
      err.code = 'SPEECH_MODEL_UNAVAILABLE';
      throw err;
    }
    const rec = await Recording.findById(recordingId);
    if (!rec) {
      const err = new Error('Recording not found');
      err.code = 'SPEECH_RECORDING_NOT_FOUND';
      throw err;
    }
    if (rec.analysisStatus === 'completed') {
      // idempotent — return as-is
      return rec;
    }

    rec.analysisStatus = 'analyzing';
    rec.analysisStartedAt = new Date();
    await rec.save();

    let result;
    try {
      result = await dispatchAnalyze({
        audioHash: rec.audioHash,
        audioDurationSeconds: rec.audioDurationSeconds,
      });
    } catch (err) {
      rec.analysisStatus = 'failed';
      rec.analysisError = err.message;
      await rec.save();
      await audit('analysis_failed', {
        recordingId: String(rec._id),
        errorCode: err.code,
      });
      throw err;
    }

    rec.transcript = result.transcript;
    rec.transcriptLanguage = result.transcriptLanguage;
    rec.transcriptConfidence = result.transcriptConfidence;
    rec.acousticMetrics = result.acousticMetrics;
    rec.articulation = result.articulation;
    rec.fluency = result.fluency;
    rec.languageSample = result.languageSample;
    rec.analysisStatus = 'completed';
    rec.analysisCompletedAt = new Date();
    await rec.save();

    await audit('analysis_completed', {
      recordingId: String(rec._id),
      transcriptConfidence: result.transcriptConfidence,
      articulationAccuracy:
        result.articulation.totalPhonemes > 0
          ? result.articulation.correctPhonemes / result.articulation.totalPhonemes
          : null,
    });

    return rec;
  }

  return {
    registerUpload,
    runAnalysis,
    // Public — useful if a future route adds a "check consent without
    // recording yet" preflight. W278g lesson: don't expose `_underscored`
    // methods if external callers will rely on them.
    checkConsent,
    // Test-only helpers retain the underscore so the boundary stays clear.
    _dispatchAnalyze: dispatchAnalyze,
    _audioHashFor: buf => crypto.createHash('sha256').update(buf).digest('hex'),
  };
}

module.exports = speechAnalysisServiceFactory;
module.exports.ANALYSIS_PROVIDER = ANALYSIS_PROVIDER;

/**
 * WIRE-TO-PRODUCTION CHECKLIST (W284 follow-up):
 *
 *   1. Upload route (NOT in this commit):
 *      POST /api/speech/recordings  multipart/form-data, audio file
 *      → multer-s3 (with KMS encryption) → registerUpload(...)
 *      → enqueue runAnalysis to BullMQ worker
 *      → return recordingId immediately (don't block on analysis)
 *
 *   2. Provider wiring (choose ONE for live):
 *      - openai-whisper-api: simplest; needs OPENAI_API_KEY; Arabic OK
 *      - anthropic-claude (when audio input GA): Arabic best; needs
 *        ANTHROPIC_API_KEY; combines transcription + analysis in one call
 *      - self-hosted-whisper: Python microservice + librosa for acoustic
 *        metrics; on-premise → highest privacy; needs GPU + DevOps
 *
 *   3. Retention sweeper:
 *      Cron daily: find expiresAt < now AND audioPurgedAt = null
 *      → call S3 deleteObject → set audioPurgedAt + analysisStatus='expired'
 *
 *   4. Drift guard:
 *      A future test (W284b) should walk the route stack and verify
 *      every speech route uses requireMfaTier(2) on uploads + scopes
 *      reads by beneficiary branch (W269b cross-branch isolation pattern).
 */
