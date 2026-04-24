/**
 * red-flag-routes.test.js — Beneficiary-360 Commit 3c.
 *
 * End-to-end HTTP tests via supertest. Wires a real router against
 * a real engine + state store + locator, using fake in-memory
 * services for the trigger.source contracts. This is the highest
 * layer that still fits in a pure unit test (no DB, no auth) —
 * proves the stack composes correctly.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');
const { createStateStore } = require('../services/redFlagStateStore');
const { createRedFlagRouter } = require('../routes/beneficiary-red-flags.routes');
const { byId } = require('../config/red-flags.registry');

// ─── Test harness ───────────────────────────────────────────────

/**
 * Build a fake locator pre-populated with canned responses for the
 * services referenced by the specified registry flag ids.
 */
function locatorFor(flagIds, responses) {
  const locator = createLocator();
  const services = new Map();
  for (const id of flagIds) {
    const flag = byId(id);
    if (!flag) throw new Error(`unknown fixture flag ${id}`);
    const { service, method } = flag.trigger.source;
    if (!services.has(service)) services.set(service, {});
    services.get(service)[method] = () => responses[id];
  }
  for (const [name, obj] of services) locator.register(name, obj);
  return locator;
}

function buildApp({ flagIds, responses, overrideLog = null }) {
  const locator = locatorFor(flagIds, responses);
  const engine = createEngine({ locator });
  const store = createStateStore();
  const router = createRedFlagRouter({ engine, store, overrideLog });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/beneficiaries', router);
  return { app, engine, store, locator };
}

function makeFakeOverrideLog() {
  const records = [];
  return {
    records,
    async record(input) {
      // mimic service-level validation
      if (!input.beneficiaryId) throw new Error('beneficiaryId is required');
      if (!input.overriddenBy) throw new Error('overriddenBy is required');
      const reason = (input.reason || '').trim();
      if (reason.length < 10) throw new Error('reason must be at least 10 characters');
      const record = {
        id: `ovr-${records.length + 1}`,
        beneficiaryId: input.beneficiaryId,
        overriddenBy: input.overriddenBy,
        reason,
        overriddenAt: new Date().toISOString(),
        blockingFlagIds: input.blockingFlagIds || [],
        context: input.context || {},
      };
      records.push(record);
      return record;
    },
    async listForBeneficiary(bId) {
      return records.filter(r => r.beneficiaryId === bId);
    },
  };
}

// ─── Router construction guardrails ─────────────────────────────

describe('createRedFlagRouter — construction', () => {
  it('throws when engine is missing', () => {
    const store = createStateStore();
    expect(() => createRedFlagRouter({ store })).toThrow(/engine/);
  });

  it('throws when store is missing', () => {
    const locator = createLocator();
    const engine = createEngine({ locator });
    expect(() => createRedFlagRouter({ engine })).toThrow(/store/);
  });
});

// ─── GET /:beneficiaryId/red-flags ──────────────────────────────

describe('GET /:beneficiaryId/red-flags', () => {
  it('returns an empty active list with zeroed summary for a fresh beneficiary', async () => {
    const { app } = buildApp({ flagIds: [], responses: {} });
    const res = await request(app).get('/api/v1/beneficiaries/BEN-1/red-flags');
    expect(res.status).toBe(200);
    expect(res.body.data.beneficiaryId).toBe('BEN-1');
    expect(res.body.data.active).toEqual([]);
    expect(res.body.data.summary).toEqual({
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
      blocking: 0,
    });
  });

  it('returns active flags with severity breakdown after evaluate', async () => {
    const flagIds = [
      'attendance.monthly.rate.low_70',
      'clinical.consent.treatment.missing_pre_session',
    ];
    const responses = {
      'attendance.monthly.rate.low_70': { attendanceRate: 50 },
      'clinical.consent.treatment.missing_pre_session': { treatmentActive: false },
    };
    const { app } = buildApp({ flagIds, responses });
    await request(app).post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate').send({});
    const res = await request(app).get('/api/v1/beneficiaries/BEN-1/red-flags');
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toMatchObject({
      total: 2,
      critical: 1,
      warning: 1,
      blocking: 1,
    });
  });
});

// ─── POST /:beneficiaryId/red-flags/evaluate ────────────────────

describe('POST /:beneficiaryId/red-flags/evaluate', () => {
  it('raises a flag on first evaluate and reports it in newlyRaised', async () => {
    const flagIds = ['attendance.monthly.rate.low_70'];
    const responses = { 'attendance.monthly.rate.low_70': { attendanceRate: 40 } };
    const { app } = buildApp({ flagIds, responses });
    const res = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate')
      .send({ flagIds });
    expect(res.status).toBe(200);
    expect(res.body.data.transitions.newlyRaised).toHaveLength(1);
    expect(res.body.data.transitions.newlyRaised[0].flagId).toBe('attendance.monthly.rate.low_70');
  });

  it('second evaluate with same raised condition reports stillRaised, not newlyRaised', async () => {
    const flagIds = ['attendance.monthly.rate.low_70'];
    const responses = { 'attendance.monthly.rate.low_70': { attendanceRate: 40 } };
    const { app } = buildApp({ flagIds, responses });
    await request(app).post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate').send({ flagIds });
    const res = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate')
      .send({ flagIds });
    expect(res.body.data.transitions.newlyRaised).toHaveLength(0);
    expect(res.body.data.transitions.stillRaised).toHaveLength(1);
  });

  it('accepts domain + severity filters in the body', async () => {
    const flagIds = [
      'attendance.monthly.rate.low_70',
      'clinical.consent.treatment.missing_pre_session',
    ];
    const responses = {
      'attendance.monthly.rate.low_70': { attendanceRate: 50 },
      'clinical.consent.treatment.missing_pre_session': { treatmentActive: false },
    };
    const { app } = buildApp({ flagIds, responses });
    const res = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate')
      .send({ domains: 'clinical' });
    expect(res.status).toBe(200);
    expect(res.body.data.flagsEvaluated).toBeGreaterThan(0);
    // Only clinical.* flags should be in verdicts — attendance one filtered out
    for (const bucket of Object.values(res.body.data.transitions)) {
      if (Array.isArray(bucket)) {
        for (const v of bucket) {
          if (v.flagId) expect(v.flagId.startsWith('clinical.')).toBe(true);
        }
      }
    }
  });
});

// ─── POST /:beneficiaryId/red-flags/:flagId/resolve ─────────────

describe('POST /:beneficiaryId/red-flags/:flagId/resolve', () => {
  it('closes an active flag and returns the resolved record', async () => {
    const flagIds = ['clinical.consent.treatment.missing_pre_session'];
    const responses = { [flagIds[0]]: { treatmentActive: false } };
    const { app } = buildApp({ flagIds, responses });
    await request(app).post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate').send({ flagIds });
    const res = await request(app)
      .post(`/api/v1/beneficiaries/BEN-1/red-flags/${flagIds[0]}/resolve`)
      .send({ resolvedBy: 'dr.ahmed', resolution: 'consent collected' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      flagId: flagIds[0],
      resolvedBy: 'dr.ahmed',
      resolution: 'consent collected',
    });
  });

  it('returns 404 when the flag is not active', async () => {
    const { app } = buildApp({ flagIds: [], responses: {} });
    const res = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/nonexistent.flag/resolve')
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FLAG_NOT_ACTIVE');
  });
});

// ─── GET /:beneficiaryId/red-flags/session-start-check ──────────

describe('GET /:beneficiaryId/red-flags/session-start-check', () => {
  it('returns 200 allowed: true when no blocking flags raised', async () => {
    const { app } = buildApp({ flagIds: [], responses: {} });
    const res = await request(app).get('/api/v1/beneficiaries/BEN-1/red-flags/session-start-check');
    expect(res.status).toBe(200);
    expect(res.body.data.allowed).toBe(true);
    expect(res.body.data.blockingFlags).toEqual([]);
  });

  it('returns 409 allowed: false when a blocking flag is raised', async () => {
    const flagIds = ['clinical.consent.treatment.missing_pre_session'];
    const responses = { [flagIds[0]]: { treatmentActive: false } };
    const { app } = buildApp({ flagIds, responses });
    await request(app).post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate').send({ flagIds });
    const res = await request(app).get('/api/v1/beneficiaries/BEN-1/red-flags/session-start-check');
    expect(res.status).toBe(409);
    expect(res.body.data.allowed).toBe(false);
    expect(res.body.data.blockingFlags).toHaveLength(1);
  });

  it('returns 200 allowed: true with emergencyOverride when ?emergency=true', async () => {
    const flagIds = ['clinical.consent.treatment.missing_pre_session'];
    const responses = { [flagIds[0]]: { treatmentActive: false } };
    const { app } = buildApp({ flagIds, responses });
    await request(app).post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate').send({ flagIds });
    const res = await request(app)
      .get('/api/v1/beneficiaries/BEN-1/red-flags/session-start-check')
      .query({ emergency: 'true' });
    expect(res.status).toBe(200);
    expect(res.body.data.allowed).toBe(true);
    expect(res.body.data.emergencyOverride).toBe(true);
    expect(res.body.data.blockingFlags).toHaveLength(1);
  });
});

// ─── POST /:beneficiaryId/red-flags/override ───────────────────

describe('POST /:beneficiaryId/red-flags/override', () => {
  it('returns 501 when overrideLog is not configured', async () => {
    const { app } = buildApp({ flagIds: [], responses: {} });
    const res = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/override')
      .send({ overriddenBy: 'dr', reason: 'long enough reason' });
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('OVERRIDE_LOG_NOT_CONFIGURED');
  });

  it('records a valid override and returns 201', async () => {
    const overrideLog = makeFakeOverrideLog();
    const { app } = buildApp({ flagIds: [], responses: {}, overrideLog });
    const res = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/override')
      .send({
        overriddenBy: 'dr.ahmed',
        reason: 'تدخّل طارئ — تفاقم أعراض',
        blockingFlagIds: ['clinical.consent.treatment.missing_pre_session'],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.overriddenBy).toBe('dr.ahmed');
    expect(overrideLog.records).toHaveLength(1);
  });

  it('returns 400 on validation failure', async () => {
    const overrideLog = makeFakeOverrideLog();
    const { app } = buildApp({ flagIds: [], responses: {}, overrideLog });
    const res = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/override')
      .send({ overriddenBy: 'dr', reason: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OVERRIDE_VALIDATION_FAILED');
  });
});

// ─── GET /:beneficiaryId/red-flags/overrides ───────────────────

describe('GET /:beneficiaryId/red-flags/overrides', () => {
  it('returns 501 when overrideLog is not configured', async () => {
    const { app } = buildApp({ flagIds: [], responses: {} });
    const res = await request(app).get('/api/v1/beneficiaries/BEN-1/red-flags/overrides');
    expect(res.status).toBe(501);
  });

  it('returns recorded overrides for the beneficiary', async () => {
    const overrideLog = makeFakeOverrideLog();
    const { app } = buildApp({ flagIds: [], responses: {}, overrideLog });
    await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/override')
      .send({ overriddenBy: 'dr', reason: 'long enough reason for override' });
    const res = await request(app).get('/api/v1/beneficiaries/BEN-1/red-flags/overrides');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ─── Full lifecycle ─────────────────────────────────────────────

describe('Red-flag lifecycle via HTTP', () => {
  it('evaluate → raises → session blocked → resolve → session allowed', async () => {
    const flagIds = ['clinical.consent.treatment.missing_pre_session'];
    const responses = { [flagIds[0]]: { treatmentActive: false } };
    const { app } = buildApp({ flagIds, responses });

    // 1. evaluate raises the flag
    const ev = await request(app)
      .post('/api/v1/beneficiaries/BEN-1/red-flags/evaluate')
      .send({ flagIds });
    expect(ev.body.data.transitions.newlyRaised).toHaveLength(1);

    // 2. session-start-check is blocked
    const block = await request(app).get(
      '/api/v1/beneficiaries/BEN-1/red-flags/session-start-check'
    );
    expect(block.status).toBe(409);

    // 3. resolve the flag
    const resolve = await request(app)
      .post(`/api/v1/beneficiaries/BEN-1/red-flags/${flagIds[0]}/resolve`)
      .send({ resolvedBy: 'compliance.officer', resolution: 'consent signed' });
    expect(resolve.status).toBe(200);

    // 4. session-start-check is now allowed
    const allow = await request(app).get(
      '/api/v1/beneficiaries/BEN-1/red-flags/session-start-check'
    );
    expect(allow.status).toBe(200);
    expect(allow.body.data.allowed).toBe(true);
  });
});
