'use strict';

/**
 * safety-protocol-branch-isolation-wave1606.test.js — W1606
 *
 * SafetyProtocol (therapistPortal.service.js, reached via therapistUltra.routes.js /safety/*)
 * carries a `branch` field that was NEVER consulted: getSafetyProtocols returned every branch's
 * protocols, and every :id op did a bare findById with no ownership check → cross-branch IDOR
 * read/update/delete/incident-push + mass-assignment (branch/protocolNumber/deletedAt settable
 * via the raw patch). W1606 threads the caller's branch (effectiveBranchScope(req)) through the
 * service, scopes every query on `branch`, stamps branch on create, and strips server-controlled
 * fields on update. This exercises the service (the fix locus) directly.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let svc;
let SafetyProtocol;
const P = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1605-safety-protocol' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  SafetyProtocol = require('../models/SafetyProtocol');
  svc = require('../services/therapistPortal.service');

  const seed = (branch, n) =>
    SafetyProtocol.collection.insertOne({
      branch,
      protocolNumber: 'SP-' + n,
      title: 'Protocol ' + n,
      content: 'c',
      category: 'other',
      status: 'active',
      incidents: [],
      deletedAt: null,
      createdAt: new Date(),
    });
  P.a = (await seed(BRANCH_A, 'A')).insertedId;
  P.b = (await seed(BRANCH_B, 'B')).insertedId;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1606 — SafetyProtocol branch isolation', () => {
  it('getSafetyProtocols — restricted caller sees only own-branch protocols', async () => {
    const rows = await svc.getSafetyProtocols('t1', String(BRANCH_A));
    const ids = rows.map(r => String(r._id));
    expect(ids).toContain(String(P.a));
    expect(ids).not.toContain(String(P.b));
  });

  it('getSafetyProtocols — cross-branch (null scope) sees all branches', async () => {
    const rows = await svc.getSafetyProtocols('t1', null);
    expect(rows.map(r => String(r._id))).toContain(String(P.b));
  });

  it('updateSafetyProtocol — foreign-branch protocol is not updated (scoped → null)', async () => {
    const r = await svc.updateSafetyProtocol(P.b, { content: 'hacked' }, String(BRANCH_A));
    expect(r).toBeNull();
    const fresh = await SafetyProtocol.findById(P.b).lean();
    expect(fresh.content).toBe('c'); // untouched
  });

  it('updateSafetyProtocol — own protocol: branch/protocolNumber stripped, content applies', async () => {
    const r = await svc.updateSafetyProtocol(
      P.a,
      { content: 'edited', branch: String(BRANCH_B), protocolNumber: 'EVIL' },
      String(BRANCH_A)
    );
    expect(r).not.toBeNull();
    expect(String(r.branch)).toBe(String(BRANCH_A)); // not re-homed
    expect(r.protocolNumber).toBe('SP-A'); // identity field unchanged
    expect(r.content).toBe('edited');
  });

  it('reportIncident — foreign-branch protocol rejects the push (scoped → null)', async () => {
    const r = await svc.reportIncident(P.b, { description: 'x' }, String(BRANCH_A));
    expect(r).toBeNull();
  });

  it('deleteSafetyProtocol — foreign-branch protocol is not soft-deleted', async () => {
    const r = await svc.deleteSafetyProtocol(P.b, String(BRANCH_A));
    expect(r).toBeNull();
    const fresh = await SafetyProtocol.findById(P.b).lean();
    expect(fresh.deletedAt).toBeNull();
  });

  it('createSafetyProtocol — stamps caller branch, ignoring a spoofed branch', async () => {
    const doc = await svc.createSafetyProtocol(
      { title: 'New', content: 'c', branch: String(BRANCH_B) },
      String(BRANCH_A)
    );
    expect(String(doc.branch)).toBe(String(BRANCH_A));
  });

  it('static: route threads effectiveBranchScope + service scopes on branch', () => {
    const routes = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'therapistUltra.routes.js'),
      'utf8'
    );
    expect((routes.match(/effectiveBranchScope\(req\)\); \/\/ W1606/g) || []).length).toBeGreaterThanOrEqual(6);
    const svcSrc = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'therapistPortal.service.js'),
      'utf8'
    );
    expect(svcSrc).toMatch(/_branchQ\(branchScope\)/);
    expect((svcSrc.match(/\.\.\.this\._branchQ\(branchScope\)/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
