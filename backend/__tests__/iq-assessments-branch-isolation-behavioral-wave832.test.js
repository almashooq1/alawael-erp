'use strict';

/**
 * iq-assessments-branch-isolation-behavioral-wave832.test.js — W832.
 *
 * Security regression test for the IDOR fix in W832. Before W832 the
 * iq-assessments router was mounted in app.js WITHOUT requireBranchAccess and
 * there is no global requireBranchAccess, so `req.branchScope` was never set —
 * every assertBranchMatch / branchFilter / enforceBeneficiaryBranch call was a
 * silent no-op. A restricted examiner in branch A could read any branch's IQ
 * scores (clinical PII) by guessing an ObjectId.
 *
 * This test boots the real router (with the W832 `router.use(requireBranchAccess)`
 * now in place), injects a restricted therapist on branch A, and proves:
 *   - own-branch assessment → 200
 *   - foreign-branch assessment → 403 (was a silent leak; the catch now honors
 *     err.status instead of masking it as 500)
 *   - invalid ObjectId → 400
 *
 * Harness sets req.user + a satisfied req.actor (mfaLevel 2) so the real
 * requireMfaTier passes and the focus stays on branch isolation.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();

let IQAssessment;

function seed(branchId) {
  return IQAssessment.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    episodeId: new mongoose.Types.ObjectId(),
    branchId,
    instrumentType: 'SB5',
    edition: 'N/A',
    examinerName: 'Dr. Test',
    examinerId: ACTOR,
    assessmentDate: new Date(),
    fullScaleIQ: 100,
    classificationBand: 'average',
    severityTier: 'L0',
    severity: 'normal',
  });
}

function mountApp() {
  const a = express();
  a.use(express.json());
  // Stand in for the global auth + MFA-actor middleware: restricted therapist
  // on branch A with a satisfied MFA tier so the real requireMfaTier passes.
  a.use((req, _res, next) => {
    req.user = { id: ACTOR, _id: ACTOR, role: 'therapist', branchId: BRANCH_A };
    req.actor = { userId: ACTOR, role: 'therapist', mfaLevel: 2, mfaAssertedAt: new Date() };
    next();
  });
  a.use('/api/v1/iq-assessments', require('../routes/iq-assessments.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w832-iq' } });
  await mongoose.connect(mongod.getUri());

  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  // The route populates episodeId (ref 'EpisodeOfCare'); register a minimal stub so
  // populate() doesn't throw MissingSchemaError.
  if (!mongoose.models.EpisodeOfCare) {
    mongoose.model(
      'EpisodeOfCare',
      new mongoose.Schema({ phase_nr: Number, currentPhase: String })
    );
  }
  IQAssessment = require('../models/IQAssessment');

  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W832 — iq-assessments cross-branch isolation (IDOR fix)', () => {
  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/iq-assessments/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch assessment (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/iq-assessments/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body._id)).toBe(String(own._id));
  });

  it('GET /:id denies a foreign-branch assessment with 403 (no PII leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/iq-assessments/${foreign._id}`);
    expect(res.status).toBe(403);
    // Ensure the clinical payload did NOT leak.
    expect(res.body.fullScaleIQ).toBeUndefined();
  });

  it('GET /:id/report denies a foreign-branch assessment with 403', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/iq-assessments/${foreign._id}/report`);
    expect(res.status).toBe(403);
  });

  it('GET /:id/report returns a report for an own-branch assessment (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/iq-assessments/${own._id}/report`);
    expect(res.status).toBe(200);
  });
});
