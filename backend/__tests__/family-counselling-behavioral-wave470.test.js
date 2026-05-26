'use strict';

/**
 * family-counselling-behavioral-wave470.test.js — behavioral counterpart to
 * the static drift guard `family-counselling-wave470.test.js`.
 *
 * W470 — FamilyCounsellingSession (Phase C Family Wellbeing). Per-family
 * counselling encounter delivered by the family_counsellor canonical role
 * (W464). 3 Wave-18 invariants on the pre-save hook:
 *   1. status=cancelled/no_show → cancellationReason ≥5 chars
 *   2. status=completed → sessionDate not in the future
 *   3. followUpActions[].status=completed → auto-fill completedAt
 *
 * Per CLAUDE.md doctrine — 21× application across W356-W470.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Session;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w470-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Session = require('../models/FamilyCounsellingSession');
  await Session.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Session.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseSession(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    counsellorUserId: oid(),
    sessionType: 'periodic_checkin',
    triggerSource: 'scheduled_routine',
    sessionDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (past, so completed default is valid)
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W470 behavioral — required fields', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new Session({ ...baseSession(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Session({ ...baseSession(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without counsellorUserId', async () => {
    const p = new Session({ ...baseSession(), counsellorUserId: undefined });
    await expect(p.save()).rejects.toThrow(/counsellorUserId/);
  });

  it('REJECTS without sessionType', async () => {
    const p = new Session({ ...baseSession(), sessionType: undefined });
    await expect(p.save()).rejects.toThrow(/sessionType/);
  });

  it('REJECTS without triggerSource', async () => {
    const p = new Session({ ...baseSession(), triggerSource: undefined });
    await expect(p.save()).rejects.toThrow(/triggerSource/);
  });

  it('SAVES with all required + defaults populate', async () => {
    const doc = await Session.create(baseSession());
    expect(doc.status).toBe('completed');
    expect(doc.durationMinutes).toBe(60);
    expect(doc.isSensitive).toBe(true);
  });
});

// ─── 2. durationMinutes bounds ────────────────────────────────────────

describe('W470 behavioral — durationMinutes 5-240', () => {
  it('REJECTS durationMinutes < 5', async () => {
    const p = new Session(baseSession({ durationMinutes: 3 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS durationMinutes > 240', async () => {
    const p = new Session(baseSession({ durationMinutes: 300 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with durationMinutes=240 (max)', async () => {
    const doc = await Session.create(baseSession({ durationMinutes: 240 }));
    expect(doc.durationMinutes).toBe(240);
  });
});

// ─── 3. Enum validation ───────────────────────────────────────────────

describe('W470 behavioral — sessionType enum (10 values)', () => {
  for (const valid of [
    'crisis_intervention',
    'periodic_checkin',
    'wbci_trigger_followup',
    'sibling_support',
    'caregiver_burnout',
    'financial_consultation',
    'extended_family_meeting',
    'bereavement_support',
    'pre_transition_planning',
    'other',
  ]) {
    it(`SAVES sessionType='${valid}'`, async () => {
      const doc = await Session.create(baseSession({ sessionType: valid }));
      expect(doc.sessionType).toBe(valid);
    });
  }

  it('REJECTS invalid sessionType', async () => {
    const p = new Session(baseSession({ sessionType: 'tarot_reading' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W470 behavioral — triggerSource + status enums', () => {
  for (const valid of [
    'wbci_low_score',
    'family_self_requested',
    'case_manager_referral',
    'voice_log_complaint',
    'safeguarding_followup',
  ]) {
    it(`SAVES triggerSource='${valid}'`, async () => {
      const doc = await Session.create(baseSession({ triggerSource: valid }));
      expect(doc.triggerSource).toBe(valid);
    });
  }

  it('REJECTS invalid triggerSource', async () => {
    const p = new Session(baseSession({ triggerSource: 'cosmic_alignment' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const valid of ['scheduled', 'in_progress', 'completed', 'no_show', 'cancelled']) {
    it(`SAVES status='${valid}' (with conditional fields)`, async () => {
      const extras =
        valid === 'no_show' || valid === 'cancelled'
          ? { cancellationReason: 'Family unable to attend due to emergency' }
          : {};
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dateOverride = valid === 'scheduled' ? { sessionDate: future } : {};
      const doc = await Session.create(baseSession({ status: valid, ...extras, ...dateOverride }));
      expect(doc.status).toBe(valid);
    });
  }
});

describe('W470 behavioral — attendee role + followUpAction status enums', () => {
  it('REJECTS invalid attendee role', async () => {
    const p = new Session(
      baseSession({
        attendees: [{ role: 'family_pet', nameDisplay: 'Rex' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid attendees including cultural_officer', async () => {
    const doc = await Session.create(
      baseSession({
        attendees: [
          { role: 'primary_caregiver', userId: oid() },
          { role: 'sibling', userId: oid() },
          { role: 'cultural_officer', userId: oid() },
          { role: 'extended_family', nameDisplay: 'الجدة' },
        ],
      })
    );
    expect(doc.attendees).toHaveLength(4);
  });

  it('REJECTS invalid followUpAction status', async () => {
    const p = new Session(
      baseSession({
        followUpActions: [{ action: 'Schedule respite booking', status: 'maybe_later' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Wellbeing capture bounds ──────────────────────────────────────

describe('W470 behavioral — wellbeing capture 0-100', () => {
  it('REJECTS preSessionWbci > 100', async () => {
    const p = new Session(baseSession({ preSessionWbci: 110 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS postSessionConcernsAddressed < 0', async () => {
    const p = new Session(baseSession({ postSessionConcernsAddressed: -10 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES at boundaries 0 + 100', async () => {
    const doc = await Session.create(
      baseSession({ preSessionWbci: 0, postSessionConcernsAddressed: 100 })
    );
    expect(doc.preSessionWbci).toBe(0);
    expect(doc.postSessionConcernsAddressed).toBe(100);
  });
});

// ─── 5. Wave-18: cancelled/no_show requires cancellationReason ────────

describe('W470 behavioral — cancellation reason invariant', () => {
  it('REJECTS status=cancelled without cancellationReason', async () => {
    const p = new Session(baseSession({ status: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancellationReason.*≥5 chars/);
  });

  it('REJECTS status=cancelled with too-short reason', async () => {
    const p = new Session(baseSession({ status: 'cancelled', cancellationReason: 'flu' }));
    await expect(p.save()).rejects.toThrow(/cancellationReason.*≥5 chars/);
  });

  it('REJECTS status=no_show without cancellationReason', async () => {
    const p = new Session(baseSession({ status: 'no_show' }));
    await expect(p.save()).rejects.toThrow(/cancellationReason.*≥5 chars/);
  });

  it('SAVES status=cancelled with valid reason', async () => {
    const doc = await Session.create(
      baseSession({
        status: 'cancelled',
        cancellationReason: 'Family member hospitalized unexpectedly; rescheduling next week',
      })
    );
    expect(doc.status).toBe('cancelled');
  });

  it('completed status does NOT require cancellationReason', async () => {
    const doc = await Session.create(baseSession({ status: 'completed' }));
    expect(doc.status).toBe('completed');
    expect(doc.cancellationReason).toBeUndefined();
  });
});

// ─── 6. Wave-18: completed session cannot have future sessionDate ────

describe('W470 behavioral — completed session not in future invariant', () => {
  it('REJECTS status=completed with sessionDate in future', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const p = new Session(baseSession({ status: 'completed', sessionDate: future }));
    await expect(p.save()).rejects.toThrow(/cannot have sessionDate in future/);
  });

  it('SAVES status=scheduled with future sessionDate', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const doc = await Session.create(baseSession({ status: 'scheduled', sessionDate: future }));
    expect(doc.sessionDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('SAVES status=completed with past sessionDate', async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const doc = await Session.create(baseSession({ status: 'completed', sessionDate: past }));
    expect(doc.status).toBe('completed');
  });
});

// ─── 7. Wave-18: followUpAction completed auto-fills completedAt ─────

describe('W470 behavioral — followUpAction completedAt auto-fill', () => {
  it('AUTO-FILLS completedAt when action.status=completed', async () => {
    const doc = await Session.create(
      baseSession({
        followUpActions: [
          { action: 'Refer to financial counsellor', status: 'completed' },
          { action: 'Schedule sibling support group', status: 'pending' },
        ],
      })
    );
    expect(doc.followUpActions[0].completedAt).toBeInstanceOf(Date);
    expect(doc.followUpActions[1].completedAt).toBeUndefined();
  });

  it('PRESERVES existing completedAt when set explicitly', async () => {
    const explicit = new Date('2026-05-01T12:00:00Z');
    const doc = await Session.create(
      baseSession({
        followUpActions: [
          {
            action: 'Done long ago',
            status: 'completed',
            completedAt: explicit,
          },
        ],
      })
    );
    expect(doc.followUpActions[0].completedAt.toISOString()).toBe(explicit.toISOString());
  });
});

// ─── 8. Indexes + collection ──────────────────────────────────────────

describe('W470 behavioral — indexes', () => {
  it('declares the 3 documented compound indexes', async () => {
    const indexes = await Session.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+sessionDate');
    expect(keys).toContain('branchId+sessionDate+sessionType');
    expect(keys).toContain('counsellorUserId+sessionDate');
  });

  it('uses canonical collection name family_counselling_sessions', () => {
    expect(Session.collection.collectionName).toBe('family_counselling_sessions');
  });
});
