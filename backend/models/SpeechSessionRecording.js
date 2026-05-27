/**
 * SpeechSessionRecording.js — SLP audio recording metadata (W284 Phase 3 #6).
 *
 * The AUDIO FILE itself is stored in encrypted object storage (S3 + KMS
 * or equivalent) — this collection holds the metadata + transcript +
 * acoustic metrics. NEVER store the raw audio in MongoDB.
 *
 * Consent gate: every recording requires a Consent of type
 * 'voice_recording' (W280 added that to CONSENT_TYPES). The service
 * layer (`speech-analysis.service.js`) enforces this BEFORE upload.
 *
 * TTL: episode_end + 90d. After episode closes, a cron sweeper marks
 * recordings expired; encrypted storage purges them. Transcripts may
 * be retained per healthcare retention (de-identified by then).
 */

'use strict';

const mongoose = require('mongoose');

const ANALYSIS_STATUSES = Object.freeze([
  'uploaded', // raw audio stored, analysis not started
  'transcribing', // STT in progress
  'analyzing', // acoustic / language analysis in progress
  'completed', // all metrics available
  'failed',
  'expired', // post-retention, audio purged
]);

const ANALYSIS_PROVIDERS = Object.freeze([
  'mock', // local stub for dev/CI
  'anthropic-claude', // Claude with audio input (when GA)
  'openai-whisper-api', // managed Whisper API
  'self-hosted-whisper', // Python microservice with Whisper
]);

const recordingSchema = new mongoose.Schema(
  {
    // Subject
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Consent + audit
    consentRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consent', required: true },

    // Storage (NEVER store the audio itself here)
    storageProvider: { type: String, required: true, default: 's3' },
    storageBucket: { type: String, required: true },
    storageKey: { type: String, required: true }, // path under bucket
    encryptionAlgorithm: { type: String, default: 'AES-256-GCM' },
    encryptionKeyId: { type: String, required: true }, // KMS key alias
    audioHash: { type: String, required: true }, // sha256 for integrity
    audioDurationSeconds: { type: Number, min: 0 },
    audioFormat: { type: String, enum: ['wav', 'mp3', 'm4a', 'webm', 'ogg'] },
    audioSizeBytes: { type: Number, min: 0 },

    // Analysis pipeline
    analysisStatus: { type: String, enum: ANALYSIS_STATUSES, default: 'uploaded', index: true },
    analysisProvider: { type: String, enum: ANALYSIS_PROVIDERS, default: 'mock' },
    analysisStartedAt: { type: Date },
    analysisCompletedAt: { type: Date },
    analysisError: { type: String, trim: true },

    // Transcript
    transcript: { type: String, trim: true }, // may be retained post-TTL
    transcriptLanguage: { type: String, enum: ['ar', 'en', 'mixed'], default: 'ar' },
    transcriptConfidence: { type: Number, min: 0, max: 1 },

    // Acoustic metrics (Phase 2 — Python microservice)
    acousticMetrics: {
      fundamentalFrequencyHz: { type: Number, min: 0 },
      jitterPercent: { type: Number, min: 0 },
      shimmerPercent: { type: Number, min: 0 },
      hnrDb: { type: Number }, // harmonics-to-noise ratio
      breathinessIndex: { type: Number, min: 0, max: 1 },
    },

    // Articulation (counts only; detailed segmentation lives in ArticulationProfile model — future commit)
    articulation: {
      totalPhonemes: { type: Number, min: 0 },
      correctPhonemes: { type: Number, min: 0 },
      substitutions: { type: Number, min: 0 },
      omissions: { type: Number, min: 0 },
      distortions: { type: Number, min: 0 },
    },

    // Fluency
    fluency: {
      syllablesPerMinute: { type: Number, min: 0 },
      stutteringEventCount: { type: Number, min: 0 },
    },

    // Language sample
    languageSample: {
      mlu: { type: Number, min: 0 }, // mean length of utterance
      typeTokenRatio: { type: Number, min: 0, max: 1 }, // vocab diversity
      utteranceCount: { type: Number, min: 0 },
    },

    // Retention
    expiresAt: { type: Date, index: true }, // episode_end + 90d, set by service
    audioPurgedAt: { type: Date }, // when the audio file was actually deleted
  },
  { timestamps: true, collection: 'speech_session_recordings' }
);

// Compound: "active recordings for beneficiary X"
recordingSchema.index({ beneficiaryId: 1, analysisStatus: 1, createdAt: -1 });
// Compound: "expired recordings to purge"
recordingSchema.index({ expiresAt: 1, audioPurgedAt: 1 });

module.exports =
  mongoose.models.SpeechSessionRecording ||
  mongoose.model('SpeechSessionRecording', recordingSchema);
module.exports.ANALYSIS_STATUSES = ANALYSIS_STATUSES;
module.exports.ANALYSIS_PROVIDERS = ANALYSIS_PROVIDERS;
