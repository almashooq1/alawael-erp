'use strict';

/**
 * beneficiary-voice-log-behavioral-wave460.test.js — behavioral counterpart
 * to the static-analysis drift guard `beneficiary-voice-log-wave460.test.js`.
 *
 * The W460 model uses legacy `pre('save', function (next) { ...; next(); })`
 * hooks — the SAME pattern as W458 that depends on the Mongoose-9 compat
 * shim at config/mongoose.plugins.js. Without the shim, every save() throws
 * "TypeError: next is not a function" — a runtime bug source-regex cannot
 * catch. The behavioral test loads the shim first, then exercises the three
 * Wave-18 invariants the static guard documents:
 *
 *   1. proxy + capacityGrade !== 'absent' ⇒ supportArrangement (≥10 chars) required
 *   2. daily_rating / session_rating ⇒ content.ratingValue + content.ratingScale required
 *   3. aac modality ⇒ content.aacSymbols[] non-empty
 *
 * Per CLAUDE.md doctrine "Pair every static drift guard with a behavioral
 * counterpart" — 14× application across W356-W460.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/beneficiary-voice-log-behavioral-wave460.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let VoiceLog;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w460-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  // Mongoose-9 legacy-hook compat shim — required because the model uses
  // `pre('save', function (next) { ... next(); })`.
  require('../config/mongoose.plugins');
  VoiceLog = require('../models/BeneficiaryVoiceLog');
  await VoiceLog.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await VoiceLog.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseEntry(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    entryKind: 'preference',
    captureModality: 'verbal',
    capacityGrade: 'full',
    capturedBy: oid(),
    capturedByRole: 'beneficiary',
    content: { text: 'أحب الموسيقى الكلاسيكية' },
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W460 behavioral — required-field invariants', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new VoiceLog({
      branchId: oid(),
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      capturedBy: oid(),
      capturedByRole: 'beneficiary',
    });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new VoiceLog({
      beneficiaryId: oid(),
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      capturedBy: oid(),
      capturedByRole: 'beneficiary',
    });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without entryKind', async () => {
    const p = new VoiceLog({
      beneficiaryId: oid(),
      branchId: oid(),
      captureModality: 'verbal',
      capacityGrade: 'full',
      capturedBy: oid(),
      capturedByRole: 'beneficiary',
    });
    await expect(p.save()).rejects.toThrow(/entryKind/);
  });

  it('REJECTS without capacityGrade', async () => {
    const p = new VoiceLog({
      beneficiaryId: oid(),
      branchId: oid(),
      entryKind: 'preference',
      captureModality: 'verbal',
      capturedBy: oid(),
      capturedByRole: 'beneficiary',
    });
    await expect(p.save()).rejects.toThrow(/capacityGrade/);
  });

  it('REJECTS without capturedByRole', async () => {
    const p = new VoiceLog({
      beneficiaryId: oid(),
      branchId: oid(),
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      capturedBy: oid(),
    });
    await expect(p.save()).rejects.toThrow(/capturedByRole/);
  });

  it('SAVES with all required fields + defaults populate', async () => {
    const doc = await VoiceLog.create(baseEntry());
    expect(doc.language).toBe('ar');
    expect(doc.actionTaken).toBe('none');
    expect(doc.status).toBe('active');
    expect(doc.isSensitive).toBe(false);
    expect(doc.capturedAt).toBeInstanceOf(Date);
  });
});

// ─── 2. Enum validation ───────────────────────────────────────────────

describe('W460 behavioral — entryKind enum (9 values)', () => {
  for (const valid of [
    'preference',
    'dream',
    'fear',
    'dislike',
    'daily_rating',
    'session_rating',
    'complaint',
    'consent_change',
    'request',
  ]) {
    it(`SAVES with entryKind='${valid}'`, async () => {
      // daily/session ratings need extra content per W460 invariant
      const extras =
        valid === 'daily_rating' || valid === 'session_rating'
          ? { content: { ratingValue: 4, ratingScale: 'likert_5' } }
          : {};
      const doc = await VoiceLog.create(baseEntry({ entryKind: valid, ...extras }));
      expect(doc.entryKind).toBe(valid);
    });
  }

  it('REJECTS invalid entryKind', async () => {
    const p = new VoiceLog(baseEntry({ entryKind: 'soliloquy' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W460 behavioral — captureModality enum (4 values)', () => {
  it('SAVES with captureModality=verbal', async () => {
    const doc = await VoiceLog.create(baseEntry({ captureModality: 'verbal' }));
    expect(doc.captureModality).toBe('verbal');
  });

  it('SAVES with captureModality=gesture', async () => {
    const doc = await VoiceLog.create(baseEntry({ captureModality: 'gesture' }));
    expect(doc.captureModality).toBe('gesture');
  });

  it('REJECTS invalid captureModality', async () => {
    const p = new VoiceLog(baseEntry({ captureModality: 'telepathy' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W460 behavioral — capacityGrade enum (4 values)', () => {
  for (const valid of ['full', 'supported', 'shared', 'absent']) {
    it(`SAVES with capacityGrade='${valid}'`, async () => {
      const doc = await VoiceLog.create(baseEntry({ capacityGrade: valid }));
      expect(doc.capacityGrade).toBe(valid);
    });
  }
});

describe('W460 behavioral — capturedByRole enum (6 values inc advocate)', () => {
  for (const valid of [
    'beneficiary',
    'family',
    'advocate',
    'therapist',
    'case_manager',
    'cultural_officer',
  ]) {
    it(`SAVES with capturedByRole='${valid}'`, async () => {
      const doc = await VoiceLog.create(baseEntry({ capturedByRole: valid }));
      expect(doc.capturedByRole).toBe(valid);
    });
  }

  it('REJECTS invalid capturedByRole', async () => {
    const p = new VoiceLog(baseEntry({ capturedByRole: 'janitor' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 3. Wave-18 invariant: proxy + non-absent requires supportArrangement ──

describe('W460 behavioral — proxy capture requires documented support', () => {
  it('SAVES proxy + capacityGrade=absent without supportArrangement (escape hatch)', async () => {
    const doc = await VoiceLog.create(
      baseEntry({
        captureModality: 'proxy',
        capacityGrade: 'absent',
        content: { text: 'Caregiver interpreted: beneficiary refused breakfast' },
      })
    );
    expect(doc.captureModality).toBe('proxy');
  });

  it('REJECTS proxy + capacityGrade=full without supportArrangement', async () => {
    const p = new VoiceLog(
      baseEntry({
        captureModality: 'proxy',
        capacityGrade: 'full',
      })
    );
    await expect(p.save()).rejects.toThrow(/supportArrangement.*≥10 chars/);
  });

  it('REJECTS proxy + capacityGrade=supported with too-short supportArrangement', async () => {
    const p = new VoiceLog(
      baseEntry({
        captureModality: 'proxy',
        capacityGrade: 'supported',
        supportArrangement: 'short',
      })
    );
    await expect(p.save()).rejects.toThrow(/supportArrangement.*≥10 chars/);
  });

  it('SAVES proxy + capacityGrade=supported with valid supportArrangement', async () => {
    const doc = await VoiceLog.create(
      baseEntry({
        captureModality: 'proxy',
        capacityGrade: 'supported',
        supportArrangement:
          'Therapist documented gesture indicating refusal — beneficiary uses AAC but device was unavailable during this morning session',
      })
    );
    expect(doc.supportArrangement.length).toBeGreaterThanOrEqual(10);
  });
});

// ─── 4. Wave-18 invariant: daily/session rating requires ratingValue+Scale ──

describe('W460 behavioral — rating entries require ratingValue + ratingScale', () => {
  it('REJECTS daily_rating without content.ratingValue', async () => {
    const p = new VoiceLog(
      baseEntry({ entryKind: 'daily_rating', content: { ratingScale: 'likert_5' } })
    );
    await expect(p.save()).rejects.toThrow(/daily_rating requires content.ratingValue/);
  });

  it('REJECTS session_rating without content.ratingScale', async () => {
    const p = new VoiceLog(baseEntry({ entryKind: 'session_rating', content: { ratingValue: 4 } }));
    await expect(p.save()).rejects.toThrow(/session_rating requires content.ratingValue/);
  });

  it('SAVES daily_rating with both ratingValue + ratingScale', async () => {
    const doc = await VoiceLog.create(
      baseEntry({
        entryKind: 'daily_rating',
        content: { ratingValue: 5, ratingScale: 'face_5' },
      })
    );
    expect(doc.content.ratingValue).toBe(5);
  });

  it('REJECTS ratingValue=0 (below min)', async () => {
    const p = new VoiceLog(
      baseEntry({
        entryKind: 'daily_rating',
        content: { ratingValue: 0, ratingScale: 'likert_5' },
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS ratingValue=6 (above max)', async () => {
    const p = new VoiceLog(
      baseEntry({
        entryKind: 'daily_rating',
        content: { ratingValue: 6, ratingScale: 'likert_5' },
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 5. Wave-18 invariant: aac modality requires aacSymbols ──

describe('W460 behavioral — AAC capture requires aacSymbols[]', () => {
  it('REJECTS aac modality without content.aacSymbols', async () => {
    const p = new VoiceLog(
      baseEntry({ captureModality: 'aac', content: { text: 'symbolic intent only text' } })
    );
    await expect(p.save()).rejects.toThrow(/aac capture requires content.aacSymbols/);
  });

  it('REJECTS aac modality with empty aacSymbols[]', async () => {
    const p = new VoiceLog(baseEntry({ captureModality: 'aac', content: { aacSymbols: [] } }));
    await expect(p.save()).rejects.toThrow(/aac capture requires content.aacSymbols/);
  });

  it('SAVES aac with non-empty aacSymbols[]', async () => {
    const doc = await VoiceLog.create(
      baseEntry({
        captureModality: 'aac',
        content: { aacSymbols: ['happy', 'music', 'yes'] },
      })
    );
    expect(doc.content.aacSymbols).toEqual(['happy', 'music', 'yes']);
  });
});

// ─── 6. Indexes ───────────────────────────────────────────────────────

describe('W460 behavioral — indexes', () => {
  it('declares the 3 compound query indexes', async () => {
    const indexes = await VoiceLog.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+capturedAt');
    expect(keys).toContain('beneficiaryId+entryKind+capturedAt');
    expect(keys).toContain('branchId+entryKind+capturedAt');
  });

  it('uses canonical collection name beneficiary_voice_logs', () => {
    expect(VoiceLog.collection.collectionName).toBe('beneficiary_voice_logs');
  });
});

// ─── 7. End-to-end ───────────────────────────────────────────────────

describe('W460 behavioral — end-to-end multi-entry lifecycle', () => {
  it('captures voice + supersedes via supersededBy chain', async () => {
    const benId = oid();
    const branchId = oid();

    // 1. Initial preference
    const first = await VoiceLog.create(
      baseEntry({
        beneficiaryId: benId,
        branchId,
        entryKind: 'preference',
        content: { text: 'أحب الموسيقى الكلاسيكية' },
      })
    );

    // 2. Consent change (supersedes the first)
    const change = await VoiceLog.create(
      baseEntry({
        beneficiaryId: benId,
        branchId,
        entryKind: 'consent_change',
        capacityGrade: 'supported',
        supportArrangement: 'AAC-mediated re-statement of music preference after 6-week trial',
        content: { text: 'أفضل الأناشيد الآن' },
      })
    );

    // 3. Mark first as superseded
    first.status = 'superseded';
    first.supersededBy = change._id;
    await first.save();

    const reloaded = await VoiceLog.findById(first._id);
    expect(reloaded.status).toBe('superseded');
    expect(reloaded.supersededBy.toString()).toBe(change._id.toString());
  });
});
