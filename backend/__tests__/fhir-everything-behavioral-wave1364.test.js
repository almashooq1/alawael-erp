'use strict';

/**
 * W1364 — behavioral counterpart to the W1364 static drift guard
 * (`fhir-everything-route-wave1364.test.js`).
 *
 * WHY: the static guard proves GET /Patient/:id/$everything DECLARES its three
 * gates (flag + branch + consent) and behaviourally proves only the flag-OFF
 * default (404, no PHI). The security-critical flag-ON path — does the PDPL
 * consent gate ACTUALLY block, and does the happy path ACTUALLY emit a valid
 * FHIR R4 searchset Bundle containing the Patient + its EpisodeOfCare
 * compartment — needs the wired code RUN (CLAUDE.md W349 lesson).
 *
 * Asserts (flag ON, real Express + MongoMemoryServer):
 *   1. active consent → 200 + valid searchset Bundle (Patient + Episodes).
 *   2. NO consent → 403 forbidden OperationOutcome (gate 3 blocks).
 *   3. REVOKED consent → 403 (proves the revokedAt:null filter).
 *   4. nonexistent id → 404 (no PHI for a missing beneficiary).
 *   5. malformed id → 400 (input gate, before any DB lookup).
 *
 * Branch isolation (gate 2) is intentionally NOT re-proven here — the route
 * mounts WITHOUT req.branchScope, so enforceBeneficiaryBranch is a documented
 * no-op (assertBranchMatch.js header), and W269's 64-test suite covers it.
 *
 * Docs are seeded via raw collection.insertOne to bypass heavy schema
 * validators — the route only reads mapper-relevant fields.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *   __tests__/fhir-everything-behavioral-wave1364.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;
let Beneficiary;
let Consent;
let EpisodeOfCare;
let SeizureEvent;
let ProstheticOrthoticOrder;
let CaregiverSupportProgram;
let RespiteBooking;
let BeneficiaryDietPrescription;
let InstrumentalSwallowStudy;
let SpasticityInjection;
let ARVRSession;

const oid = () => new mongoose.Types.ObjectId();

async function seedBeneficiary(id) {
  await Beneficiary.collection.insertOne({
    _id: id,
    firstName: 'Sara',
    lastName: 'Al-Otaibi',
    nationalId: '1234567890',
    gender: 'female',
    dateOfBirth: new Date('2015-03-01T00:00:00.000Z'),
    status: 'active',
    branchId: oid(),
  });
}

async function seedConsent(beneficiaryId, overrides = {}) {
  await Consent.collection.insertOne({
    beneficiaryId,
    type: 'data_sharing',
    grantedBy: oid(),
    grantedAt: new Date(),
    revokedAt: null,
    expiresAt: null,
    ...overrides,
  });
}

async function seedEpisode(beneficiaryId, overrides = {}) {
  await EpisodeOfCare.collection.insertOne({
    beneficiaryId,
    status: 'active',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedSeizure(beneficiaryId, overrides = {}) {
  await SeizureEvent.collection.insertOne({
    beneficiaryId,
    type: 'focal',
    date: new Date('2024-02-01T10:00:00.000Z'),
    startTime: new Date('2024-02-01T10:00:00.000Z'),
    durationSeconds: 90,
    status: 'recorded',
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedProsthetic(beneficiaryId, overrides = {}) {
  await ProstheticOrthoticOrder.collection.insertOne({
    beneficiaryId,
    deviceCategory: 'ankle_foot_orthosis',
    stage: 'prescribed',
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedCaregiverProgram(beneficiaryId, overrides = {}) {
  await CaregiverSupportProgram.collection.insertOne({
    beneficiaryId,
    programType: 'training',
    status: 'enrolled',
    enrolledAt: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedRespiteBooking(beneficiaryId, overrides = {}) {
  await RespiteBooking.collection.insertOne({
    beneficiaryId,
    bookingType: 'day',
    status: 'approved',
    startAt: new Date('2024-03-01T08:00:00.000Z'),
    endAt: new Date('2024-03-01T16:00:00.000Z'),
    requestedAt: new Date('2024-02-20T00:00:00.000Z'),
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedDietPrescription(beneficiaryId, overrides = {}) {
  await BeneficiaryDietPrescription.collection.insertOne({
    beneficiaryId,
    status: 'active',
    // NutritionOrder.dateTime is mandatory (1..1) -> prescribedAt required.
    prescribedAt: new Date('2024-01-10T00:00:00.000Z'),
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedSwallowStudy(beneficiaryId, overrides = {}) {
  await InstrumentalSwallowStudy.collection.insertOne({
    beneficiaryId,
    studyType: 'VFSS',
    status: 'completed',
    performedDate: new Date('2024-02-05T00:00:00.000Z'),
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedSpasticityInjection(beneficiaryId, overrides = {}) {
  await SpasticityInjection.collection.insertOne({
    beneficiaryId,
    agent: 'botulinum_toxin',
    status: 'completed',
    procedureDate: new Date('2024-02-08T00:00:00.000Z'),
    createdAt: new Date(),
    ...overrides,
  });
}

async function seedArvrSession(beneficiaryId, overrides = {}) {
  await ARVRSession.collection.insertOne({
    beneficiaryId,
    status: 'completed',
    sessionDate: new Date('2024-02-12T00:00:00.000Z'),
    durationMinutes: 30,
    createdAt: new Date(),
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1364-fhir-everything' } });
  await mongoose.connect(mongod.getUri());

  Beneficiary = require('../models/Beneficiary');
  if (Beneficiary && Beneficiary.default) Beneficiary = Beneficiary.default;
  ({ Consent } = require('../models/Consent'));
  ({ EpisodeOfCare } = require('../domains/episodes/models/EpisodeOfCare'));
  SeizureEvent = require('../models/SeizureEvent');
  if (SeizureEvent && SeizureEvent.default) SeizureEvent = SeizureEvent.default;
  ProstheticOrthoticOrder = require('../models/ProstheticOrthoticOrder');
  if (ProstheticOrthoticOrder && ProstheticOrthoticOrder.default) {
    ProstheticOrthoticOrder = ProstheticOrthoticOrder.default;
  }
  CaregiverSupportProgram = require('../models/CaregiverSupportProgram');
  if (CaregiverSupportProgram && CaregiverSupportProgram.default) {
    CaregiverSupportProgram = CaregiverSupportProgram.default;
  }
  RespiteBooking = require('../models/RespiteBooking');
  if (RespiteBooking && RespiteBooking.default) RespiteBooking = RespiteBooking.default;
  BeneficiaryDietPrescription = require('../models/BeneficiaryDietPrescription');
  if (BeneficiaryDietPrescription && BeneficiaryDietPrescription.default) {
    BeneficiaryDietPrescription = BeneficiaryDietPrescription.default;
  }
  InstrumentalSwallowStudy = require('../models/InstrumentalSwallowStudy');
  if (InstrumentalSwallowStudy && InstrumentalSwallowStudy.default) {
    InstrumentalSwallowStudy = InstrumentalSwallowStudy.default;
  }
  SpasticityInjection = require('../models/SpasticityInjection');
  if (SpasticityInjection && SpasticityInjection.default) {
    SpasticityInjection = SpasticityInjection.default;
  }
  ARVRSession = require('../domains/ar-vr/models/ARVRSession');
  if (ARVRSession && ARVRSession.default) ARVRSession = ARVRSession.default;

  process.env.ENABLE_FHIR_PHI_EXPORT = 'true';
  delete require.cache[require.resolve('../routes/fhir.routes')];
  const router = require('../routes/fhir.routes');

  app = express();
  app.use('/fhir', router);
});

afterAll(async () => {
  delete process.env.ENABLE_FHIR_PHI_EXPORT;
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Beneficiary.collection.deleteMany({});
  await Consent.collection.deleteMany({});
  await EpisodeOfCare.collection.deleteMany({});
  await SeizureEvent.collection.deleteMany({});
  await ProstheticOrthoticOrder.collection.deleteMany({});
  await CaregiverSupportProgram.collection.deleteMany({});
  await RespiteBooking.collection.deleteMany({});
  await BeneficiaryDietPrescription.collection.deleteMany({});
  await InstrumentalSwallowStudy.collection.deleteMany({});
  await SpasticityInjection.collection.deleteMany({});
  await ARVRSession.collection.deleteMany({});
});

describe('W1364 — FHIR GET /Patient/:id/$everything flag-ON behavioral', () => {
  it('1. active consent → 200 + valid searchset Bundle (Patient + Episodes)', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id);
    await seedEpisode(id);

    const res = await request(app)
      .get(`/fhir/Patient/${id}/$everything`)
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('Bundle');
    expect(res.body.type).toBe('searchset');
    expect(Array.isArray(res.body.entry)).toBe(true);
    // Patient + at least the one seeded EpisodeOfCare.
    expect(res.body.entry.length).toBeGreaterThanOrEqual(2);
    const types = res.body.entry.map(e => e.resource && e.resource.resourceType);
    expect(types).toContain('Patient');
    expect(types).toContain('EpisodeOfCare');
  });

  it('1b. compartment registry pulls a SeizureEvent into the Bundle', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id);
    await seedSeizure(id);

    const res = await request(app)
      .get(`/fhir/Patient/${id}/$everything`)
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('Bundle');
    const types = res.body.entry.map(e => e.resource && e.resource.resourceType);
    expect(types).toContain('Patient');
    // SeizureEvent maps to a FHIR Observation (per the W13xx mapper layer).
    expect(types).toContain('Observation');
  });

  it('1c. W1366 expansion pulls a ProstheticOrthoticOrder (DeviceRequest); an un-projectable record is omitted, not fatal', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id);
    // One valid order (maps cleanly) + one missing the mapper-required
    // deviceCategory (the mapper throws → W1366 per-record resilience omits it).
    await seedProsthetic(id);
    await seedProsthetic(id, { deviceCategory: undefined });

    const res = await request(app)
      .get(`/fhir/Patient/${id}/$everything`)
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('Bundle');
    const types = res.body.entry.map(e => e.resource && e.resource.resourceType);
    expect(types).toContain('Patient');
    // ProstheticOrthoticOrder maps to a FHIR DeviceRequest.
    const deviceRequests = types.filter(t => t === 'DeviceRequest');
    // Exactly the one valid order survives; the un-projectable one is dropped.
    expect(deviceRequests).toHaveLength(1);
  });

  it('1d. W1366 expansion pulls a CaregiverSupportProgram (CarePlan) into the Bundle', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id);
    await seedCaregiverProgram(id);

    const res = await request(app)
      .get(`/fhir/Patient/${id}/$everything`)
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('Bundle');
    const types = res.body.entry.map(e => e.resource && e.resource.resourceType);
    expect(types).toContain('Patient');
    // CaregiverSupportProgram maps to a FHIR CarePlan (a 3rd resource family
    // beyond the Observation/DeviceRequest already proven above).
    expect(types).toContain('CarePlan');
  });

  it('1e. W1366 expansion pulls a RespiteBooking (Appointment) into the Bundle', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id);
    await seedRespiteBooking(id);

    const res = await request(app)
      .get(`/fhir/Patient/${id}/$everything`)
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('Bundle');
    const types = res.body.entry.map(e => e.resource && e.resource.resourceType);
    expect(types).toContain('Patient');
    // RespiteBooking maps to a FHIR Appointment (a 4th resource family).
    expect(types).toContain('Appointment');
  });

  it('1f. compartment yields every remaining FHIR family (NutritionOrder + DiagnosticReport + Procedure + Encounter)', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id);
    await seedDietPrescription(id); // -> NutritionOrder
    await seedSwallowStudy(id); // -> DiagnosticReport
    await seedSpasticityInjection(id); // -> Procedure
    await seedArvrSession(id); // -> Encounter

    const res = await request(app)
      .get(`/fhir/Patient/${id}/$everything`)
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('Bundle');
    const types = res.body.entry.map(e => e.resource && e.resource.resourceType);
    expect(types).toContain('Patient');
    // With 1b-1f covered, every distinct FHIR resource family the compartment
    // produces is now proven to flow end-to-end through the live route.
    expect(types).toContain('NutritionOrder');
    expect(types).toContain('DiagnosticReport');
    expect(types).toContain('Procedure');
    expect(types).toContain('Encounter');
  });

  it('2. NO consent → 403 forbidden OperationOutcome (gate 3 blocks PHI)', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedEpisode(id);

    const res = await request(app)
      .get(`/fhir/Patient/${id}/$everything`)
      .expect(403)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('OperationOutcome');
    expect(Array.isArray(res.body.issue)).toBe(true);
    expect(res.body.issue.length).toBeGreaterThan(0);
  });

  it('3. REVOKED consent → 403 (revokedAt:null filter excludes it)', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id, { revokedAt: new Date() });

    const res = await request(app).get(`/fhir/Patient/${id}/$everything`).expect(403);
    expect(res.body.resourceType).toBe('OperationOutcome');
  });

  it('4. nonexistent beneficiary id → 404 (no PHI for a missing record)', async () => {
    const res = await request(app)
      .get(`/fhir/Patient/${oid()}/$everything`)
      .expect(404)
      .expect('Content-Type', /application\/fhir\+json/);
    expect(res.body.resourceType).toBe('OperationOutcome');
  });

  it('5. malformed (non-ObjectId) id → 400 (input gate, no DB lookup)', async () => {
    const res = await request(app)
      .get('/fhir/Patient/not-a-valid-objectid/$everything')
      .expect(400)
      .expect('Content-Type', /application\/fhir\+json/);
    expect(res.body.resourceType).toBe('OperationOutcome');
    expect(Array.isArray(res.body.issue)).toBe(true);
    expect(res.body.issue.length).toBeGreaterThan(0);
    expect(typeof res.body.issue[0].code).toBe('string');
    expect(res.body.issue[0].code.length).toBeGreaterThan(0);
  });
});
