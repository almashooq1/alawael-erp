/**
 * speech-analysis-wave284.test.js — SLP speech analysis pipeline (W284).
 *
 * Verifies:
 *   (A) model exports + enums
 *   (B) consent gate (5 reject paths)
 *   (C) MFA tier 2 gate
 *   (D) registerUpload persists with correct shape
 *   (E) runAnalysis transitions states + populates metrics (mock provider)
 *   (F) audit emitted on each phase
 *   (G) idempotent runAnalysis if already completed
 */

'use strict';

jest.unmock('mongoose');

const factory = require('../services/ai/speech-analysis.service');

describe('W284 — Speech analysis pipeline', () => {
  // ── A. Model + enums ─────────────────────────────────────────────────
  describe('SpeechSessionRecording model', () => {
    it('exports enums', () => {
      const M = require('../models/SpeechSessionRecording');
      expect(M.ANALYSIS_STATUSES).toContain('uploaded');
      expect(M.ANALYSIS_STATUSES).toContain('completed');
      expect(M.ANALYSIS_STATUSES).toContain('expired');
      expect(M.ANALYSIS_PROVIDERS).toContain('mock');
      expect(M.ANALYSIS_PROVIDERS).toContain('openai-whisper-api');
    });
  });

  // ── B + C + D + E + F + G. Service ───────────────────────────────────
  describe('service: consent gate + MFA + analysis pipeline', () => {
    let svc;
    let recordingStore;
    let consentStore;
    let auditEvents;
    let MockRecording;
    let MockConsent;
    let MockAudit;
    let nextId;

    beforeEach(() => {
      recordingStore = new Map();
      consentStore = new Map();
      auditEvents = [];
      nextId = 1;

      MockRecording = {
        async create(payload) {
          const doc = {
            _id: `rec-${nextId++}`,
            ...payload,
            async save() {
              recordingStore.set(this._id, this);
              return this;
            },
          };
          recordingStore.set(doc._id, doc);
          return doc;
        },
        async findById(id) {
          return recordingStore.get(id) || null;
        },
      };
      MockConsent = {
        findById(id) {
          return Promise.resolve(consentStore.get(id) || null);
        },
      };
      MockAudit = {
        async log(e) {
          auditEvents.push(e);
        },
      };

      svc = factory({
        RecordingModel: MockRecording,
        ConsentModel: MockConsent,
        AuditLogger: MockAudit,
        enforceMfa: true,
      });
    });

    function seedConsent({ id, beneficiaryId, type, revokedAt, expiresAt }) {
      consentStore.set(id, {
        _id: id,
        beneficiaryId,
        type: type || 'voice_recording',
        revokedAt: revokedAt || null,
        expiresAt: expiresAt || null,
      });
    }

    const validUploadInput = () => ({
      beneficiaryId: 'b1',
      sessionId: 's1',
      therapistId: 't1',
      branchId: 'br1',
      consentRecordId: 'c1',
      storageBucket: 'speech-audio-prod',
      storageKey: 'b1/s1/audio.wav',
      encryptionKeyId: 'kms-alias/speech',
      audioHash: 'a'.repeat(64),
      audioDurationSeconds: 120,
      audioFormat: 'wav',
      audioSizeBytes: 1920000,
      actor: { userId: 'u1', mfaTier: 2 },
    });

    // ── Consent gate ──
    it('rejects when consent record not found', async () => {
      await expect(svc.registerUpload(validUploadInput())).rejects.toMatchObject({
        code: 'SPEECH_CONSENT_NOT_FOUND',
      });
    });

    it('rejects when consent belongs to other beneficiary', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b-other' });
      await expect(svc.registerUpload(validUploadInput())).rejects.toMatchObject({
        code: 'SPEECH_CONSENT_MISMATCH',
      });
    });

    it('rejects when consent type is not voice_recording', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1', type: 'photography' });
      await expect(svc.registerUpload(validUploadInput())).rejects.toMatchObject({
        code: 'SPEECH_CONSENT_TYPE_INSUFFICIENT',
      });
    });

    it('rejects when consent revoked', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1', revokedAt: new Date() });
      await expect(svc.registerUpload(validUploadInput())).rejects.toMatchObject({
        code: 'SPEECH_CONSENT_REVOKED',
      });
    });

    it('rejects when consent expired', async () => {
      seedConsent({
        id: 'c1',
        beneficiaryId: 'b1',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(svc.registerUpload(validUploadInput())).rejects.toMatchObject({
        code: 'SPEECH_CONSENT_EXPIRED',
      });
    });

    // ── MFA gate ──
    it('enforceMfa:true rejects actor with mfaTier < 2', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      const input = validUploadInput();
      input.actor = { userId: 'u1', mfaTier: 1 };
      await expect(svc.registerUpload(input)).rejects.toMatchObject({
        code: 'SPEECH_MFA_INSUFFICIENT',
      });
    });

    // ── Happy path: upload registers ──
    it('registerUpload persists recording + emits audit', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      const rec = await svc.registerUpload(validUploadInput());
      expect(rec._id).toMatch(/^rec-/);
      expect(rec.analysisStatus).toBe('uploaded');
      expect(rec.audioHash).toBe('a'.repeat(64));
      expect(rec.encryptionAlgorithm).toBe('AES-256-GCM');

      const uploadEvent = auditEvents.find(e => e.action === 'upload_registered');
      expect(uploadEvent).toBeTruthy();
      expect(uploadEvent.recordingId).toBe(rec._id);
    });

    // ── runAnalysis: state transitions + metrics ──
    it('runAnalysis transitions uploaded → analyzing → completed + populates metrics', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      const rec = await svc.registerUpload(validUploadInput());
      const updated = await svc.runAnalysis(rec._id);
      expect(updated.analysisStatus).toBe('completed');
      expect(updated.transcript).toBeTruthy();
      expect(updated.acousticMetrics.fundamentalFrequencyHz).toBeGreaterThan(0);
      expect(updated.articulation.totalPhonemes).toBeGreaterThan(0);
      expect(updated.fluency.syllablesPerMinute).toBeGreaterThan(0);
      expect(updated.languageSample.mlu).toBeGreaterThan(0);

      const completedEvent = auditEvents.find(e => e.action === 'analysis_completed');
      expect(completedEvent).toBeTruthy();
    });

    it('runAnalysis is idempotent if already completed', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      const rec = await svc.registerUpload(validUploadInput());
      const first = await svc.runAnalysis(rec._id);
      const startedAt = first.analysisStartedAt;
      const second = await svc.runAnalysis(rec._id);
      expect(second.analysisStatus).toBe('completed');
      expect(second.analysisStartedAt).toEqual(startedAt); // didn't re-run
    });

    it('runAnalysis throws when recording missing', async () => {
      await expect(svc.runAnalysis('nonexistent')).rejects.toMatchObject({
        code: 'SPEECH_RECORDING_NOT_FOUND',
      });
    });

    // ── Mock determinism ──
    it('mock analysis is deterministic per audioHash', async () => {
      const r = await svc._dispatchAnalyze({
        audioHash: 'a'.repeat(64),
        audioDurationSeconds: 60,
      });
      const r2 = await svc._dispatchAnalyze({
        audioHash: 'a'.repeat(64),
        audioDurationSeconds: 60,
      });
      expect(r).toEqual(r2);
    });

    // ── Input validation ──
    it('registerUpload rejects missing required field', async () => {
      seedConsent({ id: 'c1', beneficiaryId: 'b1' });
      const input = validUploadInput();
      delete input.storageBucket;
      await expect(svc.registerUpload(input)).rejects.toMatchObject({
        code: 'SPEECH_INVALID_INPUT',
      });
    });

    // ── audio hash helper ──
    it('_audioHashFor produces consistent sha256', () => {
      const buf = Buffer.from('test audio data');
      const h = svc._audioHashFor(buf);
      expect(h).toMatch(/^[a-f0-9]{64}$/);
      expect(svc._audioHashFor(buf)).toBe(h); // deterministic
    });
  });
});
