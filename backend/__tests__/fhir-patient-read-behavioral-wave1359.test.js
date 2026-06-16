'use strict';

/**
 * W1359 — behavioral counterpart to the W1358 static drift guard
 * (`fhir-patient-read-route-wave1358.test.js`).
 *
 * WHY: the W1358 guard proves the GET /Patient/:id source DECLARES its three
 * gates (flag + branch + consent) and behaviourally proves only the
 * flag-OFF default (404, no PHI). The security-critical flag-ON path — does
 * the PDPL consent gate ACTUALLY block, and does the happy path ACTUALLY
 * emit a valid FHIR R4 Patient — was covered by static assertions only.
 *
 * Per CLAUDE.md doctrine "Pair every static drift guard with a behavioral
 * counterpart" (W356-W460 lesson, + W349: "only RUNNING the wired code
 * catches behavioral bugs"), this exercises the flag-ON route end-to-end
 * against a real Express app + MongoMemoryServer, asserting:
 *
 *   1. flag ON + active data_sharing consent → 200 + valid FHIR Patient.
 *   2. flag ON + NO consent → 403 forbidden OperationOutcome (gate 3 blocks).
 *   3. flag ON + REVOKED consent → 403 (proves the revokedAt:null filter).
 *   4. flag ON + EXPIRED consent → 403 (proves the expiresAt filter).
 *   5. flag ON + nonexistent id → 404 (no PHI for a missing beneficiary).
 *
 * Branch isolation (gate 2) is intentionally NOT re-proven here — the
 * route mounts WITHOUT req.branchScope, so enforceBeneficiaryBranch is a
 * documented no-op (assertBranchMatch.js header), and W269's 64-test
 * suite already covers that gate. This file isolates the W1358-specific
 * consent + happy-path logic.
 *
 * Beneficiary + Consent docs are seeded via raw collection.insertOne to
 * bypass the 690-line Beneficiary schema validators — the route only reads
 * the mapper-relevant fields (nationalId/firstName/lastName/gender/dob), so
 * a minimal raw doc is both sufficient and robust against schema growth.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *   __tests__/fhir-patient-read-behavioral-wave1359.test.js --runInBand
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

const oid = () => new mongoose.Types.ObjectId();

/** Seed a minimal mapper-valid beneficiary (raw insert, bypasses validators). */
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

/** Seed a consent row with explicit lifecycle fields (raw insert). */
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

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1359-fhir-phi' } });
  await mongoose.connect(mongod.getUri());

  // Real models — auto-register under 'Beneficiary' / 'Consent', the exact
  // names the route resolves via mongoose.model(...) / require('../models/Consent').
  Beneficiary = require('../models/Beneficiary');
  if (Beneficiary && Beneficiary.default) Beneficiary = Beneficiary.default;
  ({ Consent } = require('../models/Consent'));

  // Flip the PHI flag ON, then (re)load the route so its module-load-time
  // gate reads 'true'. Must precede the require.
  process.env.ENABLE_FHIR_PHI_EXPORT = 'true';
  delete require.cache[require.resolve('../routes/fhir.routes')];
  const router = require('../routes/fhir.routes');

  app = express();
  // Mount WITHOUT branchScope → enforceBeneficiaryBranch is a no-op (gate 2
  // out of scope here, see file header).
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
});

describe('W1359 — FHIR GET /Patient/:id flag-ON behavioral (consent gate + happy path)', () => {
  it('1. active data_sharing consent → 200 + valid FHIR Patient', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id);

    const res = await request(app)
      .get(`/fhir/Patient/${id}`)
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);

    expect(res.body.resourceType).toBe('Patient');
    expect(res.body.id).toBe(String(id));
    expect(Array.isArray(res.body.identifier)).toBe(true);
    expect(res.body.identifier.length).toBeGreaterThan(0);
    // nationalId starting '1' → citizen national-id system (mapper contract).
    expect(res.body.identifier[0].value).toBe('1234567890');
  });

  it('2. NO consent → 403 forbidden OperationOutcome (gate 3 blocks PHI)', async () => {
    const id = oid();
    await seedBeneficiary(id);
    // deliberately no consent

    const res = await request(app)
      .get(`/fhir/Patient/${id}`)
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

    const res = await request(app).get(`/fhir/Patient/${id}`).expect(403);
    expect(res.body.resourceType).toBe('OperationOutcome');
  });

  it('4. EXPIRED consent → 403 (expiresAt filter excludes it)', async () => {
    const id = oid();
    await seedBeneficiary(id);
    await seedConsent(id, { expiresAt: new Date(Date.now() - 60_000) });

    const res = await request(app).get(`/fhir/Patient/${id}`).expect(403);
    expect(res.body.resourceType).toBe('OperationOutcome');
  });

  it('5. nonexistent beneficiary id → 404 (no PHI for a missing record)', async () => {
    const res = await request(app)
      .get(`/fhir/Patient/${oid()}`)
      .expect(404)
      .expect('Content-Type', /application\/fhir\+json/);
    expect(res.body.resourceType).toBe('OperationOutcome');
  });
});
