'use strict';

/**
 * therapist-portal-referral-group-kpi-branch-isolation-wave1615.test.js — W1615
 *
 * therapistPortal.service.js referral/group/kpi surfaces (via therapistUltra.routes.js) had
 * owner-scoped LISTS but bare-findById `:id` mutations → cross-therapist/cross-branch write IDOR.
 * W1615 threads effectiveBranchScope(req) through updateReferral/updateReferralStatus/
 * deleteReferral, updateGroup/addParticipant/removeParticipant/deleteGroup, updateKPI/deleteKPI
 * + stamps branch on create. ⭐CASING: Referral/KPI use `branch`; TherapyGroup uses `branchId`
 * (→ separate `_branchIdQ` helper).
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const A = new mongoose.Types.ObjectId();
const B = new mongoose.Types.ObjectId();
const THERAPIST = new mongoose.Types.ObjectId();

let mongod;
let svc;
let TherapyReferral, TherapyGroup, TherapyCustomKPI;
const ref = {}, grp = {}, kpi = {};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1615-tp-rgk' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  TherapyReferral = require('../models/TherapyReferral');
  TherapyGroup = require('../models/TherapyGroup');
  TherapyCustomKPI = require('../models/TherapyCustomKPI');
  svc = require('../services/therapistPortal.service');

  ref.a = (await TherapyReferral.collection.insertOne({ branch: A, referralNumber: 'REF-A', referrer: THERAPIST, status: 'pending', deletedAt: null })).insertedId;
  ref.b = (await TherapyReferral.collection.insertOne({ branch: B, referralNumber: 'REF-B', referrer: new mongoose.Types.ObjectId(), status: 'pending', deletedAt: null })).insertedId;
  grp.a = (await TherapyGroup.collection.insertOne({ branchId: A, name: 'GA', nameAr: 'GA', type: 'mixed', facilitator: THERAPIST, participants: [], maxParticipants: 8, deletedAt: null })).insertedId;
  grp.b = (await TherapyGroup.collection.insertOne({ branchId: B, name: 'GB', nameAr: 'GB', type: 'mixed', facilitator: new mongoose.Types.ObjectId(), participants: [], maxParticipants: 8, deletedAt: null })).insertedId;
  kpi.a = (await TherapyCustomKPI.collection.insertOne({ branch: A, name: 'KA', therapist: THERAPIST, deletedAt: null })).insertedId;
  kpi.b = (await TherapyCustomKPI.collection.insertOne({ branch: B, name: 'KB', therapist: new mongoose.Types.ObjectId(), deletedAt: null })).insertedId;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1615 — therapistPortal referral/group/kpi branch isolation', () => {
  // Referrals (branch)
  it('updateReferral — foreign branch not updated (scoped → null)', async () => {
    expect(await svc.updateReferral(ref.b, { status: 'accepted' }, String(A))).toBeNull();
  });
  it('updateReferralStatus / deleteReferral — foreign branch → null', async () => {
    expect(await svc.updateReferralStatus(ref.b, 'accepted', String(A))).toBeNull();
    expect(await svc.deleteReferral(ref.b, String(A))).toBeNull();
  });
  it('updateReferral — own branch updates + branch stripped', async () => {
    const r = await svc.updateReferral(ref.a, { status: 'accepted', branch: String(B) }, String(A));
    expect(r).not.toBeNull();
    expect(String(r.branch)).toBe(String(A));
  });

  // Groups (branchId)
  it('updateGroup / deleteGroup — foreign branch → null (branchId-keyed)', async () => {
    expect(await svc.updateGroup(grp.b, { name: 'x' }, String(A))).toBeNull();
    expect(await svc.deleteGroup(grp.b, String(A))).toBeNull();
  });
  it('addParticipant — foreign branch → null', async () => {
    expect(await svc.addParticipant(grp.b, { beneficiary: new mongoose.Types.ObjectId() }, String(A))).toBeNull();
  });
  it('createGroup — stamps caller branchId (spoof ignored)', async () => {
    const g = await svc.createGroup({ name: 'New', type: 'mixed', branchId: String(B) }, THERAPIST, String(A));
    expect(String(g.branchId)).toBe(String(A));
  });

  // KPIs (branch)
  it('updateKPI / deleteKPI — foreign branch → null', async () => {
    expect(await svc.updateKPI(kpi.b, { name: 'x' }, String(A))).toBeNull();
    expect(await svc.deleteKPI(kpi.b, String(A))).toBeNull();
  });
  it('createCustomKPI — stamps caller branch', async () => {
    const k = await svc.createCustomKPI({ name: 'NewKPI', branch: String(B) }, THERAPIST, String(A));
    expect(String(k.branch)).toBe(String(A));
  });

  it('static: _branchIdQ helper + branchScope params + route threading', () => {
    const s = fs.readFileSync(path.join(__dirname, '..', 'services', 'therapistPortal.service.js'), 'utf8');
    expect(s).toMatch(/_branchIdQ\(branchScope\)/);
    expect(s).toMatch(/async updateReferral\(id, patch, branchScope\)/);
    expect(s).toMatch(/async updateGroup\(id, patch, branchScope\)/);
    expect(s).toMatch(/async updateKPI\(id, patch, branchScope\)/);
    const r = fs.readFileSync(path.join(__dirname, '..', 'routes', 'therapistUltra.routes.js'), 'utf8');
    expect((r.match(/effectiveBranchScope\(req\)\); \/\/ W1615/g) || []).length).toBeGreaterThanOrEqual(12);
  });
});
