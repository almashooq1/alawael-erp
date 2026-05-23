/**
 * speech-retention-sweeper.service.js — purge expired speech recordings (W284c).
 *
 * Daily cron finds SpeechSessionRecording rows where:
 *   expiresAt < now AND audioPurgedAt = null
 * Then:
 *   1. Calls the storage purger (S3 deleteObject in production; no-op in mock)
 *   2. Sets analysisStatus = 'expired'
 *   3. Sets audioPurgedAt = now
 *   4. Optionally redacts transcript (configurable; default keeps transcripts
 *      since they're de-identified by retention policy)
 *
 * The audio file IS purged; the metadata + analysis metrics + transcript stay
 * unless you configure redactTranscriptOnPurge:true.
 *
 * Factory pattern; storagePurger + RecordingModel injectable for tests.
 */

'use strict';

const mongoose = require('mongoose');

function speechRetentionSweeperFactory({
  RecordingModel = null,
  storagePurger = null, // async ({ bucket, key }) → void
  auditLogger = null,
  redactTranscriptOnPurge = false,
  batchLimit = 200,
} = {}) {
  const Recording = RecordingModel || (mongoose.models?.SpeechSessionRecording ?? null);

  async function audit(action, payload) {
    if (!auditLogger) return;
    try {
      await auditLogger.log({
        component: 'speech-retention',
        action,
        timestamp: new Date(),
        ...payload,
      });
    } catch {
      /* best-effort */
    }
  }

  /**
   * runOnce — single sweep. Returns { scanned, purged, failed, results[] }.
   *
   * Idempotent: re-running soon after produces { scanned: 0 } since
   * audioPurgedAt is set in the filter exclusion.
   */
  async function runOnce({ asOf = new Date() } = {}) {
    if (!Recording) {
      const err = new Error('SpeechSessionRecording model not available');
      err.code = 'SPEECH_RETENTION_MODEL_UNAVAILABLE';
      throw err;
    }
    const candidates = await Recording.find({
      expiresAt: { $lt: asOf },
      audioPurgedAt: null,
    })
      .limit(batchLimit)
      .lean();

    if (candidates.length === 0) {
      return { scanned: 0, purged: 0, failed: 0, results: [] };
    }

    await audit('sweep_started', { scanned: candidates.length, asOf });

    const results = [];
    let purged = 0;
    let failed = 0;

    for (const rec of candidates) {
      try {
        if (storagePurger && typeof storagePurger === 'function') {
          await storagePurger({ bucket: rec.storageBucket, key: rec.storageKey });
        }
        const update = {
          $set: {
            analysisStatus: 'expired',
            audioPurgedAt: new Date(),
          },
        };
        if (redactTranscriptOnPurge) {
          update.$unset = { transcript: '' };
        }
        await Recording.updateOne({ _id: rec._id }, update);
        purged++;
        results.push({ recordingId: String(rec._id), status: 'purged' });
        await audit('recording_purged', {
          recordingId: String(rec._id),
          beneficiaryId: rec.beneficiaryId,
          storageBucket: rec.storageBucket,
          storageKey: rec.storageKey,
        });
      } catch (err) {
        failed++;
        results.push({
          recordingId: String(rec._id),
          status: 'failed',
          error: err.message,
          code: err.code,
        });
        await audit('recording_purge_failed', {
          recordingId: String(rec._id),
          errorCode: err.code,
          errorMessage: err.message,
        });
      }
    }

    await audit('sweep_completed', { scanned: candidates.length, purged, failed });
    return { scanned: candidates.length, purged, failed, results };
  }

  return { runOnce };
}

module.exports = speechRetentionSweeperFactory;
