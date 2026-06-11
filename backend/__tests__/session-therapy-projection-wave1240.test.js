/**
 * W1240 — behavioral test for the ClinicalSession → TherapySession CQRS projection
 * (therapySessionProjection.js). Verifies the root fix for the write/read session
 * split: a session written through the UI model (ClinicalSession) is faithfully
 * projected into the analytics model (TherapySession) so Session-Center / episodes /
 * goal-progress / claims (the 56 TherapySession consumers) can see it.
 *
 * Asserts: faithful field+enum mapping · faithful-or-null therapist resolution
 * (User→Employee via Employee.user_id) · idempotent upsert (one projection per
 * source, re-project updates the same record) · FAIL-SAFE (never throws).
 */

jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  mapSessionType,
  mapStatus,
  mapClinicalToTherapy,
  projectClinicalSession,
} = require('../domains/sessions/services/therapySessionProjection');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Real analytics model (validates the schema + the new sourceClinicalSessionId field).
  require('../models/TherapySession');
  // Minimal Employee (the projection only needs Employee.findOne({user_id})._id).
  if (!mongoose.models.Employee) {
    mongoose.model(
      'Employee',
      new mongoose.Schema({ user_id: { type: mongoose.Schema.Types.ObjectId } })
    );
  }
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await mongoose.model('TherapySession').deleteMany({});
  await mongoose.model('Employee').deleteMany({});
});

function clinicalStub(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    episodeId: new mongoose.Types.ObjectId(),
    therapistId: new mongoose.Types.ObjectId(),
    specialty: 'speech_therapy',
    status: 'scheduled',
    scheduledDate: new Date('2026-06-12T10:00:00Z'),
    scheduledDurationMinutes: 45,
    ...overrides,
  };
}

describe('W1240 — pure mappers', () => {
  test('specialty → Arabic discipline enum (faithful + fallback)', () => {
    expect(mapSessionType('speech_therapy')).toBe('نطق وتخاطب');
    expect(mapSessionType('physical_therapy')).toBe('علاج طبيعي');
    expect(mapSessionType('occupational_therapy')).toBe('علاج وظيفي');
    expect(mapSessionType('behavioral_therapy')).toBe('علاج سلوكي');
    expect(mapSessionType('psychological')).toBe('علاج نفسي');
    expect(mapSessionType('nursing')).toBe('أخرى'); // unmapped → fallback
    expect(mapSessionType(undefined)).toBe('أخرى');
  });

  test('status lowercase → UPPERCASE enum (faithful + fallback)', () => {
    expect(mapStatus('scheduled')).toBe('SCHEDULED');
    expect(mapStatus('completed')).toBe('COMPLETED');
    expect(mapStatus('no_show')).toBe('NO_SHOW');
    expect(mapStatus('cancelled')).toBe('CANCELLED_BY_CENTER');
    expect(mapStatus('late_cancel')).toBe('CANCELLED_BY_PATIENT');
    expect(mapStatus('weird')).toBe('SCHEDULED'); // unknown → safe default
  });
});

describe('W1240 — projection (faithful field mapping)', () => {
  test('creates a TherapySession with faithfully mapped fields', async () => {
    const clinical = clinicalStub();
    const res = await projectClinicalSession(clinical);
    expect(res.ok).toBe(true);

    const TherapySession = mongoose.model('TherapySession');
    const projected = await TherapySession.findOne({ sourceClinicalSessionId: clinical._id }).lean();
    expect(projected).toBeTruthy();
    expect(String(projected.beneficiary)).toBe(String(clinical.beneficiaryId));
    expect(String(projected.episodeOfCare)).toBe(String(clinical.episodeId));
    expect(projected.sessionType).toBe('نطق وتخاطب');
    expect(projected.status).toBe('SCHEDULED');
    expect(new Date(projected.date).toISOString()).toBe(clinical.scheduledDate.toISOString());
    expect(projected.duration).toBe(45);
  });

  test('mapClinicalToTherapy always yields a valid Date even with no scheduledDate', async () => {
    const fields = await mapClinicalToTherapy(clinicalStub({ scheduledDate: undefined }));
    expect(fields.date instanceof Date).toBe(true);
  });
});

describe('W1240 — therapist resolution (faithful-or-null)', () => {
  test('resolves therapistId(User) → therapist(Employee) via Employee.user_id', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await mongoose.model('Employee').create({ user_id: userId });
    const res = await projectClinicalSession(clinicalStub({ therapistId: userId }));
    expect(res.ok).toBe(true);
    const doc = await mongoose.model('TherapySession').findById(res.id).lean();
    expect(String(doc.therapist)).toBe(String(emp._id));
  });

  test('leaves therapist NULL when no Employee is linked (never wrong attribution)', async () => {
    const res = await projectClinicalSession(clinicalStub());
    const doc = await mongoose.model('TherapySession').findById(res.id).lean();
    expect(doc.therapist == null).toBe(true);
  });
});

describe('W1240 — idempotency (one projection per source)', () => {
  test('re-projecting the same source updates the SAME record, no duplicate', async () => {
    const clinical = clinicalStub();
    const r1 = await projectClinicalSession(clinical);
    const r2 = await projectClinicalSession({ ...clinical, status: 'completed' });
    expect(String(r1.id)).toBe(String(r2.id));

    const TherapySession = mongoose.model('TherapySession');
    const count = await TherapySession.countDocuments({ sourceClinicalSessionId: clinical._id });
    expect(count).toBe(1);
    const doc = await TherapySession.findById(r1.id).lean();
    expect(doc.status).toBe('COMPLETED'); // updated in place
  });
});

describe('W1240 — FAIL-SAFE (never throws, never breaks the session write)', () => {
  test('returns {ok:false} for a null / id-less source instead of throwing', async () => {
    await expect(projectClinicalSession(null)).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(projectClinicalSession({})).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });
});
