/**
 * red-flag-consent-routes.test.js — Beneficiary-360 Commit 22.
 *
 * End-to-end HTTP tests via supertest against real Consent +
 * Beneficiary models in mongodb-memory-server. Covers the full
 * capture lifecycle: toggle tracking → grant → list → revoke,
 * plus the validation edges (invalid type, missing id, double
 * revoke).
 */

'use strict';

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createConsentRouter } = require('../routes/beneficiary-consents.routes');

let mongoServer;
let Consent;
let Beneficiary;
let CONSENT_TYPES;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'consent-routes-test' });
  const exports_ = require('../models/Consent');
  Consent = exports_.Consent;
  CONSENT_TYPES = exports_.CONSENT_TYPES;
  Beneficiary = require('../models/Beneficiary');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await Consent.deleteMany({});
  await Beneficiary.deleteMany({});
});

// ─── Harness ────────────────────────────────────────────────────

async function buildApp() {
  const router = createConsentRouter({
    consentModel: Consent,
    beneficiaryModel: Beneficiary,
    consentTypes: CONSENT_TYPES,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/beneficiaries', router);
  return app;
}

async function seedBeneficiary({ trackingEnabled = false } = {}) {
  return Beneficiary.create({
    firstName: 'Consent',
    lastName: 'Test',
    dateOfBirth: new Date('2018-01-01'),
    gender: 'male',
    consentTrackingEnabled: trackingEnabled,
  });
}

// ─── Construction ───────────────────────────────────────────────

describe('createConsentRouter — construction', () => {
  it('throws when consentModel is missing', () => {
    expect(() => createConsentRouter({ beneficiaryModel: Beneficiary })).toThrow(/consentModel/);
  });

  it('throws when beneficiaryModel is missing', () => {
    expect(() => createConsentRouter({ consentModel: Consent })).toThrow(/beneficiaryModel/);
  });
});

// ─── GET consent-tracking ──────────────────────────────────────

describe('GET /:beneficiaryId/consent-tracking', () => {
  it('returns the current tracking state', async () => {
    const b = await seedBeneficiary({ trackingEnabled: true });
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/beneficiaries/${b._id}/consent-tracking`);
    expect(res.status).toBe(200);
    expect(res.body.data.consentTrackingEnabled).toBe(true);
  });

  it('defaults to false for a fresh beneficiary', async () => {
    const b = await seedBeneficiary();
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/beneficiaries/${b._id}/consent-tracking`);
    expect(res.status).toBe(200);
    expect(res.body.data.consentTrackingEnabled).toBe(false);
  });

  it('returns 404 when the beneficiary does not exist', async () => {
    const app = await buildApp();
    const res = await request(app).get(
      `/api/v1/beneficiaries/${new mongoose.Types.ObjectId()}/consent-tracking`
    );
    expect(res.status).toBe(404);
  });
});

// ─── PATCH consent-tracking ─────────────────────────────────────

describe('PATCH /:beneficiaryId/consent-tracking', () => {
  it('toggles consentTrackingEnabled on the beneficiary', async () => {
    const b = await seedBeneficiary();
    const app = await buildApp();
    const res = await request(app)
      .patch(`/api/v1/beneficiaries/${b._id}/consent-tracking`)
      .send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.data.consentTrackingEnabled).toBe(true);
    const reloaded = await Beneficiary.findById(b._id).lean();
    expect(reloaded.consentTrackingEnabled).toBe(true);
  });

  it('returns 400 when body.enabled is not a boolean', async () => {
    const b = await seedBeneficiary();
    const app = await buildApp();
    const res = await request(app)
      .patch(`/api/v1/beneficiaries/${b._id}/consent-tracking`)
      .send({ enabled: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ENABLED_REQUIRED');
  });

  it('returns 404 when beneficiary does not exist', async () => {
    const app = await buildApp();
    const res = await request(app)
      .patch(`/api/v1/beneficiaries/${new mongoose.Types.ObjectId()}/consent-tracking`)
      .send({ enabled: true });
    expect(res.status).toBe(404);
  });
});

// ─── POST create consent ────────────────────────────────────────

describe('POST /:beneficiaryId/consents', () => {
  it('grants a new consent and returns 201 with the full record', async () => {
    const b = await seedBeneficiary({ trackingEnabled: true });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/beneficiaries/${b._id}/consents`).send({
      type: 'treatment',
      grantedAt: '2026-04-22T10:00:00.000Z',
      signatureRef: 'sig-hash-abc',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('treatment');
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.signatureRef).toBe('sig-hash-abc');
  });

  it('rejects an invalid type with 400', async () => {
    const b = await seedBeneficiary({ trackingEnabled: true });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents`)
      .send({ type: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CONSENT_TYPE_INVALID');
  });

  it('records an optional expiresAt', async () => {
    const b = await seedBeneficiary({ trackingEnabled: true });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/beneficiaries/${b._id}/consents`).send({
      type: 'photography',
      expiresAt: '2027-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.expiresAt).toBe('2027-01-01T00:00:00.000Z');
  });
});

// ─── GET list ──────────────────────────────────────────────────

describe('GET /:beneficiaryId/consents', () => {
  it('returns empty array when no consents exist', async () => {
    const b = await seedBeneficiary();
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/beneficiaries/${b._id}/consents`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns consents sorted newest-first', async () => {
    const b = await seedBeneficiary({ trackingEnabled: true });
    const app = await buildApp();
    await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents`)
      .send({ type: 'treatment', grantedAt: '2026-01-01T00:00:00.000Z' });
    await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents`)
      .send({ type: 'data_sharing', grantedAt: '2026-04-15T00:00:00.000Z' });
    const res = await request(app).get(`/api/v1/beneficiaries/${b._id}/consents`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].type).toBe('data_sharing');
    expect(res.body.data[1].type).toBe('treatment');
  });
});

// ─── POST revoke ───────────────────────────────────────────────

describe('POST /:beneficiaryId/consents/:consentId/revoke', () => {
  it('revokes an active consent', async () => {
    const b = await seedBeneficiary({ trackingEnabled: true });
    const app = await buildApp();
    const createRes = await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents`)
      .send({ type: 'treatment' });
    const cId = createRes.body.data.id;
    const res = await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents/${cId}/revoke`)
      .send({ reason: 'guardian withdrew' });
    expect(res.status).toBe(200);
    expect(res.body.data.revokedAt).toBeTruthy();
    expect(res.body.data.revokedReason).toBe('guardian withdrew');
    expect(res.body.data.isActive).toBe(false);
  });

  it('returns 404 for an unknown consent id', async () => {
    const b = await seedBeneficiary();
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents/${new mongoose.Types.ObjectId()}/revoke`)
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CONSENT_NOT_FOUND');
  });

  it('returns 409 when revoking an already-revoked consent (append-only)', async () => {
    const b = await seedBeneficiary({ trackingEnabled: true });
    const app = await buildApp();
    const createRes = await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents`)
      .send({ type: 'treatment' });
    const cId = createRes.body.data.id;
    await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents/${cId}/revoke`)
      .send({ reason: 'first' });
    const res = await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents/${cId}/revoke`)
      .send({ reason: 'second' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONSENT_ALREADY_REVOKED');
  });
});

// ─── Full lifecycle ─────────────────────────────────────────────

describe('full consent capture lifecycle', () => {
  it('enable tracking → grant both required → list shows active → revoke one → list shows revoked', async () => {
    const b = await seedBeneficiary();
    const app = await buildApp();

    // 1. enable tracking
    await request(app)
      .patch(`/api/v1/beneficiaries/${b._id}/consent-tracking`)
      .send({ enabled: true });

    // 2. grant both required consents
    await request(app).post(`/api/v1/beneficiaries/${b._id}/consents`).send({ type: 'treatment' });
    const dsRes = await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents`)
      .send({ type: 'data_sharing' });

    // 3. list shows both active
    const listRes = await request(app).get(`/api/v1/beneficiaries/${b._id}/consents`);
    expect(listRes.body.data).toHaveLength(2);
    expect(listRes.body.data.every(c => c.isActive)).toBe(true);

    // 4. revoke data_sharing
    await request(app)
      .post(`/api/v1/beneficiaries/${b._id}/consents/${dsRes.body.data.id}/revoke`)
      .send({ reason: 'test' });

    // 5. list reflects revocation
    const finalList = await request(app).get(`/api/v1/beneficiaries/${b._id}/consents`);
    const active = finalList.body.data.filter(c => c.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe('treatment');
  });
});
