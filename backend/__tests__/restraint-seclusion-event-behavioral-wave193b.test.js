'use strict';

/**
 * restraint-seclusion-event-behavioral-wave193b.test.js — behavioral coverage
 * for the W193b RestraintSeclusionEvent model.
 *
 * This is the regulatory ledger required by CBAHI + MOHRSD for any use of
 * restraint or seclusion on a beneficiary — centers cannot legally apply
 * these interventions without complete documentation. There is NO static
 * drift guard for this model yet — this behavioral test serves dual duty:
 * (1) verifies all 9 Wave-18 invariants fire at runtime, (2) implicitly
 * locks the schema shape by exercising every required field + enum.
 *
 * 9 Wave-18 invariants:
 *   1. type ∈ TYPES (4 values: physical / mechanical / chemical / seclusion)
 *   2. techniqueUsed required (trim non-empty)
 *   3. triggerBehavior required (trim non-empty)
 *   4. type='chemical' → medicationName required
 *   5. type='seclusion' → seclusionLocation required
 *   6. type ∈ {physical, mechanical} + status='completed' → durationMinutes > 0
 *   7. status='completed' → parentNotifiedAt required
 *   8. status='completed' → debriefDone=true required (CBAHI mandate)
 *   9. injury=true → injuryNotes required
 *
 * Per CLAUDE.md doctrine — 25× application across W38 + W39 + W41 + W193b +
 * W356-W470. First entry from the Clinical-operations lower-priority group
 * (next-up recommended in BEHAVIORAL_TEST_COVERAGE_BACKLOG.md).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/restraint-seclusion-event-behavioral-wave193b.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Event;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w193b-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Event = require('../models/RestraintSeclusionEvent');
  await Event.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Event.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

// Baseline = in_progress physical hold (no parent-notif/debrief required yet)
function baseEvent(overrides = {}) {
  return {
    beneficiaryId: oid(),
    date: new Date(),
    startTime: new Date(),
    type: 'physical',
    techniqueUsed: 'two-person standing escort',
    triggerBehavior: 'self-injurious headbanging episode',
    status: 'in_progress',
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W193b behavioral — required fields', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new Event({ ...baseEvent(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without date', async () => {
    const p = new Event({ ...baseEvent(), date: undefined });
    await expect(p.save()).rejects.toThrow(/date/);
  });

  it('REJECTS without startTime', async () => {
    const p = new Event({ ...baseEvent(), startTime: undefined });
    await expect(p.save()).rejects.toThrow(/startTime/);
  });

  it('REJECTS without type', async () => {
    const p = new Event({ ...baseEvent(), type: undefined });
    await expect(p.save()).rejects.toThrow(/type/);
  });

  it('REJECTS without techniqueUsed', async () => {
    const p = new Event({ ...baseEvent(), techniqueUsed: undefined });
    await expect(p.save()).rejects.toThrow(/techniqueUsed/);
  });

  it('REJECTS without triggerBehavior', async () => {
    const p = new Event({ ...baseEvent(), triggerBehavior: undefined });
    await expect(p.save()).rejects.toThrow(/triggerBehavior/);
  });

  it('SAVES baseline in_progress physical event + defaults populate', async () => {
    const doc = await Event.create(baseEvent());
    expect(doc.status).toBe('in_progress');
    expect(doc.injury).toBe(false);
    expect(doc.debriefDone).toBe(false);
    expect(doc.staffSupporting).toEqual([]);
  });
});

// ─── 2. Enum + bounds ─────────────────────────────────────────────────

describe('W193b behavioral — type enum (CBAHI 4 categories)', () => {
  it('SAVES type=physical (with required fields)', async () => {
    const doc = await Event.create(baseEvent({ type: 'physical' }));
    expect(doc.type).toBe('physical');
  });

  it('SAVES type=mechanical with technique', async () => {
    const doc = await Event.create(
      baseEvent({ type: 'mechanical', techniqueUsed: 'soft wrist restraint' })
    );
    expect(doc.type).toBe('mechanical');
  });

  it('SAVES type=chemical with medicationName', async () => {
    const doc = await Event.create(
      baseEvent({
        type: 'chemical',
        techniqueUsed: 'PRN sedative IM',
        medicationName: 'Haloperidol 5mg IM',
      })
    );
    expect(doc.type).toBe('chemical');
  });

  it('SAVES type=seclusion with location', async () => {
    const doc = await Event.create(
      baseEvent({
        type: 'seclusion',
        techniqueUsed: 'observed isolation room',
        seclusionLocation: 'Quiet Room A — observation window',
      })
    );
    expect(doc.type).toBe('seclusion');
  });

  it('REJECTS invalid type', async () => {
    const p = new Event(baseEvent({ type: 'verbal_redirect' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W193b behavioral — durationMinutes 0-240 bounds (4hr safety cap)', () => {
  it('REJECTS durationMinutes > 240 (4-hour absolute cap)', async () => {
    const p = new Event(baseEvent({ durationMinutes: 300 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS durationMinutes < 0', async () => {
    const p = new Event(baseEvent({ durationMinutes: -10 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES durationMinutes=240 (max safety cap)', async () => {
    const doc = await Event.create(
      baseEvent({
        status: 'completed',
        durationMinutes: 240,
        endTime: new Date(),
        parentNotifiedAt: new Date(),
        debriefDone: true,
        debriefAt: new Date(),
      })
    );
    expect(doc.durationMinutes).toBe(240);
  });
});

describe('W193b behavioral — parentNotificationMethod enum', () => {
  for (const valid of ['phone', 'sms', 'in_person', 'whatsapp', 'email']) {
    it(`SAVES parentNotificationMethod='${valid}'`, async () => {
      const doc = await Event.create(
        baseEvent({ parentNotificationMethod: valid, parentNotifiedAt: new Date() })
      );
      expect(doc.parentNotificationMethod).toBe(valid);
    });
  }

  it('REJECTS invalid parentNotificationMethod', async () => {
    const p = new Event(baseEvent({ parentNotificationMethod: 'pigeon' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 3. Wave-18: type-specific required fields ────────────────────────

describe('W193b behavioral — chemical restraint requires medicationName', () => {
  it('REJECTS type=chemical without medicationName', async () => {
    const p = new Event(baseEvent({ type: 'chemical' }));
    await expect(p.save()).rejects.toThrow(/medicationName.*chemical restraint/);
  });

  it('REJECTS type=chemical with empty medicationName', async () => {
    const p = new Event(baseEvent({ type: 'chemical', medicationName: '   ' }));
    await expect(p.save()).rejects.toThrow(/medicationName.*chemical restraint/);
  });
});

describe('W193b behavioral — seclusion requires seclusionLocation', () => {
  it('REJECTS type=seclusion without seclusionLocation', async () => {
    const p = new Event(baseEvent({ type: 'seclusion' }));
    await expect(p.save()).rejects.toThrow(/seclusionLocation.*seclusion/);
  });
});

// ─── 4. Wave-18: completed status requires duration + notification + debrief ──

describe('W193b behavioral — completion gating (physical/mechanical duration)', () => {
  it('REJECTS physical completed without durationMinutes', async () => {
    const p = new Event(
      baseEvent({
        status: 'completed',
        endTime: new Date(),
        parentNotifiedAt: new Date(),
        debriefDone: true,
      })
    );
    await expect(p.save()).rejects.toThrow(
      /durationMinutes.*physical\/mechanical event is completed/
    );
  });

  it('REJECTS mechanical completed with durationMinutes=0', async () => {
    const p = new Event(
      baseEvent({
        type: 'mechanical',
        techniqueUsed: 'soft restraint',
        status: 'completed',
        durationMinutes: 0,
        endTime: new Date(),
        parentNotifiedAt: new Date(),
        debriefDone: true,
      })
    );
    await expect(p.save()).rejects.toThrow(/durationMinutes/);
  });

  it('SAVES physical completed with positive durationMinutes', async () => {
    const doc = await Event.create(
      baseEvent({
        status: 'completed',
        durationMinutes: 8,
        endTime: new Date(),
        parentNotifiedAt: new Date(),
        debriefDone: true,
        debriefAt: new Date(),
      })
    );
    expect(doc.durationMinutes).toBe(8);
  });

  it('chemical completed does NOT require durationMinutes (different mechanism)', async () => {
    const doc = await Event.create(
      baseEvent({
        type: 'chemical',
        techniqueUsed: 'PRN IM',
        medicationName: 'Haloperidol 5mg',
        status: 'completed',
        parentNotifiedAt: new Date(),
        debriefDone: true,
      })
    );
    expect(doc.status).toBe('completed');
    expect(doc.durationMinutes).toBeNull();
  });
});

describe('W193b behavioral — completion requires parent notification + debrief (CBAHI)', () => {
  it('REJECTS completed without parentNotifiedAt', async () => {
    const p = new Event(
      baseEvent({
        status: 'completed',
        durationMinutes: 10,
        endTime: new Date(),
        debriefDone: true,
      })
    );
    await expect(p.save()).rejects.toThrow(/parentNotifiedAt.*parent notification required/);
  });

  it('REJECTS completed without debriefDone (CBAHI mandate)', async () => {
    const p = new Event(
      baseEvent({
        status: 'completed',
        durationMinutes: 10,
        endTime: new Date(),
        parentNotifiedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/debriefDone.*debrief required to complete \(CBAHI\)/);
  });

  it('in_progress status does NOT require parent/debrief yet', async () => {
    const doc = await Event.create(baseEvent());
    expect(doc.status).toBe('in_progress');
    expect(doc.parentNotifiedAt).toBeNull();
    expect(doc.debriefDone).toBe(false);
  });
});

// ─── 5. Wave-18: injury invariant ─────────────────────────────────────

describe('W193b behavioral — injury reporting invariant', () => {
  it('REJECTS injury=true without injuryNotes', async () => {
    const p = new Event(baseEvent({ injury: true }));
    await expect(p.save()).rejects.toThrow(/injuryNotes.*injury notes required when injury=true/);
  });

  it('REJECTS injury=true with empty injuryNotes', async () => {
    const p = new Event(baseEvent({ injury: true, injuryNotes: '   ' }));
    await expect(p.save()).rejects.toThrow(/injuryNotes/);
  });

  it('SAVES injury=true with documented notes', async () => {
    const doc = await Event.create(
      baseEvent({
        injury: true,
        injuryNotes:
          'Beneficiary scraped right elbow during floor-hold transition; cleaned + bandaged on-site, no further care required',
      })
    );
    expect(doc.injury).toBe(true);
  });

  it('injury=false does NOT require notes (default safe path)', async () => {
    const doc = await Event.create(baseEvent());
    expect(doc.injury).toBe(false);
    expect(doc.injuryNotes).toBe('');
  });
});

// ─── 6. Indexes + collection ─────────────────────────────────────────

describe('W193b behavioral — indexes + collection', () => {
  it('declares the 4 documented compound indexes', async () => {
    const indexes = await Event.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+startTime');
    expect(keys).toContain('branchId+date');
    expect(keys).toContain('status+date');
    expect(keys).toContain('injury+date');
  });

  it('uses canonical collection name restraint_seclusion_events', () => {
    expect(Event.collection.collectionName).toBe('restraint_seclusion_events');
  });
});

// ─── 7. End-to-end CBAHI-compliant lifecycle ─────────────────────────

describe('W193b behavioral — full in_progress → completed → reviewed lifecycle', () => {
  it('records physical hold from incident through debrief + supervisor review', async () => {
    const benId = oid();
    const branchId = oid();
    const staffPrimary = oid();
    const supervisor = oid();

    // 1. Event begins — in_progress
    const event = await Event.create({
      beneficiaryId: benId,
      branchId,
      date: new Date(),
      startTime: new Date(),
      type: 'physical',
      techniqueUsed: 'two-person standing hold',
      triggerBehavior: 'Aggression toward peer — biting attempt; verbal redirection unsuccessful',
      lessRestrictiveTried: 'Verbal redirection + sensory break offered, both refused',
      staffPrimary,
      staffPrimaryName: 'Therapist A',
      staffSupporting: ['Therapist B', 'Aide C'],
      status: 'in_progress',
    });
    expect(event.status).toBe('in_progress');

    // 2. Event ends — supervisor notified, parent contacted, debrief done
    event.endTime = new Date(Date.now() + 8 * 60 * 1000); // 8 min hold
    event.durationMinutes = 8;
    event.supervisorNotifiedAt = new Date();
    event.supervisorName = 'Supervisor X';
    event.parentNotifiedAt = new Date();
    event.parentNotificationMethod = 'phone';
    event.debriefDone = true;
    event.debriefAt = new Date();
    event.debriefNotes = 'Team reviewed antecedent + de-escalation steps; updated behavior plan';
    event.debriefAttendees = ['Therapist A', 'Therapist B', 'Supervisor X', 'BCBA'];
    event.followUpAction = 'BIP review scheduled within 7 days; sensory pre-emption added';
    event.status = 'completed';
    await event.save();

    expect(event.status).toBe('completed');
    expect(event.durationMinutes).toBe(8);

    // 3. Supervisor review — terminal state
    event.reviewedBy = supervisor;
    event.reviewedByName = 'Supervisor X';
    event.reviewedAt = new Date();
    event.status = 'reviewed';
    event.finalizedAt = new Date();
    await event.save();

    const reloaded = await Event.findById(event._id);
    expect(reloaded.status).toBe('reviewed');
    expect(reloaded.finalizedAt).toBeInstanceOf(Date);
    expect(reloaded.debriefAttendees).toHaveLength(4);
  });
});
