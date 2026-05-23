/**
 * speech-retention-sweeper-wave284c.test.js — daily audio purge cron (W284c).
 *
 * Tests:
 *   (1) findOnce returns expected counts (scanned/purged/failed)
 *   (2) storagePurger called per record with bucket+key
 *   (3) Recording updated to status='expired' + audioPurgedAt set
 *   (4) Already-purged records excluded from next sweep (idempotency)
 *   (5) storagePurger throw → record marked failed, sweep continues
 *   (6) redactTranscriptOnPurge=true → transcript $unset
 *   (7) Empty result handled cleanly
 *   (8) Bootstrap wires sweeper + cron disabled by default
 */

'use strict';

jest.unmock('mongoose');

const sweeperFactory = require('../services/ai/speech-retention-sweeper.service');

describe('W284c — Speech retention sweeper', () => {
  let store;
  let MockRecording;
  let purgerCalls;
  let storagePurger;
  let auditEvents;
  let MockAudit;

  beforeEach(() => {
    store = new Map();
    purgerCalls = [];
    auditEvents = [];

    MockRecording = {
      find(filter) {
        const items = [...store.values()].filter(rec => {
          if (filter.expiresAt?.$lt) {
            if (!rec.expiresAt || rec.expiresAt >= filter.expiresAt.$lt) return false;
          }
          if (filter.audioPurgedAt === null) {
            if (rec.audioPurgedAt) return false;
          }
          return true;
        });
        return {
          limit(_n) {
            return { lean: async () => items };
          },
        };
      },
      async updateOne(filter, update) {
        const rec = store.get(String(filter._id));
        if (!rec) return { matchedCount: 0 };
        Object.assign(rec, update.$set || {});
        if (update.$unset) {
          for (const k of Object.keys(update.$unset)) {
            delete rec[k];
          }
        }
        return { matchedCount: 1, modifiedCount: 1 };
      },
    };

    storagePurger = async ({ bucket, key }) => {
      purgerCalls.push({ bucket, key });
    };

    MockAudit = {
      async log(e) {
        auditEvents.push(e);
      },
    };
  });

  function seed(rec) {
    store.set(String(rec._id), { ...rec });
  }

  it('runOnce returns counts (empty store)', async () => {
    const svc = sweeperFactory({
      RecordingModel: MockRecording,
      storagePurger,
      auditLogger: MockAudit,
    });
    const result = await svc.runOnce();
    expect(result).toMatchObject({ scanned: 0, purged: 0, failed: 0 });
  });

  it('purges expired records + calls storagePurger', async () => {
    seed({
      _id: 'r-1',
      beneficiaryId: 'b1',
      storageBucket: 'speech-audio',
      storageKey: 'b1/rec1.wav',
      expiresAt: new Date(Date.now() - 86400_000),
      audioPurgedAt: null,
    });
    seed({
      _id: 'r-2',
      beneficiaryId: 'b2',
      storageBucket: 'speech-audio',
      storageKey: 'b2/rec2.wav',
      expiresAt: new Date(Date.now() - 86400_000),
      audioPurgedAt: null,
    });
    const svc = sweeperFactory({
      RecordingModel: MockRecording,
      storagePurger,
      auditLogger: MockAudit,
    });
    const result = await svc.runOnce();
    expect(result.scanned).toBe(2);
    expect(result.purged).toBe(2);
    expect(result.failed).toBe(0);
    expect(purgerCalls).toEqual([
      { bucket: 'speech-audio', key: 'b1/rec1.wav' },
      { bucket: 'speech-audio', key: 'b2/rec2.wav' },
    ]);
    // Records now have analysisStatus=expired + audioPurgedAt set
    expect(store.get('r-1').analysisStatus).toBe('expired');
    expect(store.get('r-1').audioPurgedAt).toBeInstanceOf(Date);
  });

  it('skips records that are already purged (idempotent)', async () => {
    seed({
      _id: 'r-1',
      expiresAt: new Date(Date.now() - 86400_000),
      audioPurgedAt: new Date(Date.now() - 3600_000), // already purged
      storageBucket: 's',
      storageKey: 'k',
    });
    const svc = sweeperFactory({
      RecordingModel: MockRecording,
      storagePurger,
    });
    const result = await svc.runOnce();
    expect(result.scanned).toBe(0);
    expect(purgerCalls).toEqual([]);
  });

  it('storagePurger throw → record marked failed, sweep continues', async () => {
    seed({
      _id: 'r-good',
      expiresAt: new Date(Date.now() - 86400_000),
      audioPurgedAt: null,
      storageBucket: 's',
      storageKey: 'good.wav',
    });
    seed({
      _id: 'r-bad',
      expiresAt: new Date(Date.now() - 86400_000),
      audioPurgedAt: null,
      storageBucket: 's',
      storageKey: 'bad.wav',
    });
    const failingPurger = async ({ key }) => {
      if (key === 'bad.wav') {
        const e = new Error('S3 access denied');
        e.code = 'AccessDenied';
        throw e;
      }
    };
    const svc = sweeperFactory({
      RecordingModel: MockRecording,
      storagePurger: failingPurger,
      auditLogger: MockAudit,
    });
    const result = await svc.runOnce();
    expect(result.scanned).toBe(2);
    expect(result.purged).toBe(1);
    expect(result.failed).toBe(1);
    // Good record purged
    expect(store.get('r-good').analysisStatus).toBe('expired');
    // Bad record NOT updated (sweep failed for it)
    expect(store.get('r-bad').analysisStatus).toBeUndefined();
    // Audit shows the failure
    const fail = auditEvents.find(e => e.action === 'recording_purge_failed');
    expect(fail).toBeTruthy();
    expect(fail.errorCode).toBe('AccessDenied');
  });

  it('redactTranscriptOnPurge=true → transcript unset', async () => {
    seed({
      _id: 'r-1',
      expiresAt: new Date(Date.now() - 86400_000),
      audioPurgedAt: null,
      storageBucket: 's',
      storageKey: 'k',
      transcript: 'sensitive content',
    });
    const svc = sweeperFactory({
      RecordingModel: MockRecording,
      storagePurger,
      redactTranscriptOnPurge: true,
    });
    await svc.runOnce();
    expect(store.get('r-1').transcript).toBeUndefined();
  });

  it('throws SPEECH_RETENTION_MODEL_UNAVAILABLE if no model wired', async () => {
    const svc = sweeperFactory({ RecordingModel: null, storagePurger });
    await expect(svc.runOnce()).rejects.toMatchObject({
      code: 'SPEECH_RETENTION_MODEL_UNAVAILABLE',
    });
  });

  describe('bootstrap wires cron', () => {
    const fs = require('fs');
    const path = require('path');
    const BOOTSTRAP = fs.readFileSync(
      path.join(__dirname, '..', 'startup', 'speechBootstrap.js'),
      'utf8'
    );

    it('reads ENABLE_SPEECH_RETENTION_CRON env', () => {
      expect(BOOTSTRAP).toMatch(/ENABLE_SPEECH_RETENTION_CRON/);
    });

    it('cron schedule is daily at 03:00 Asia/Riyadh', () => {
      expect(BOOTSTRAP).toMatch(/cron\.schedule\(\s*['"]0 3 \* \* \*['"]/);
      expect(BOOTSTRAP).toMatch(/timezone:\s*['"]Asia\/Riyadh['"]/);
    });

    it('attaches sweeper to app._speechRetentionSweeper', () => {
      const fakeApp = { use: jest.fn() };
      // Ensure cron disabled
      delete process.env.ENABLE_SPEECH_RETENTION_CRON;
      const { wireSpeech } = require('../startup/speechBootstrap');
      wireSpeech(fakeApp, { logger: { info: () => {}, warn: () => {}, error: () => {} } });
      expect(fakeApp._speechRetentionSweeper).toBeTruthy();
      expect(typeof fakeApp._speechRetentionSweeper.runOnce).toBe('function');
      // Cron should not be scheduled when env disabled
      expect(fakeApp._speechRetentionCronTask).toBeUndefined();
    });
  });
});
