'use strict';

/**
 * therapy-equipment-branch-isolation-wave1613.test.js — W1613
 *
 * therapistPortal.service.js TherapyEquipment methods (via therapistUltra.routes.js /equipment)
 * ignored the model's `branch` field: getEquipment(_therapistId) listed EVERY branch's equipment
 * (cross-branch read leak), and book/return/update/delete did a bare findById on any :id
 * (cross-branch write). W1613 threads effectiveBranchScope(req) through the 6 equipment methods,
 * scoping on `branch` (reuses _branchQ) + stamping branch on create.
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
let TherapyEquipment;
const E = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1610-therapy-equipment' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  TherapyEquipment = require('../models/TherapyEquipment');
  svc = require('../services/therapistPortal.service');

  const seed = (branch, name) =>
    TherapyEquipment.collection.insertOne({
      branch,
      name,
      status: 'available',
      bookings: [],
      deletedAt: null,
      createdAt: new Date(),
    });
  E.a = (await seed(BRANCH_A, 'Wheelchair A')).insertedId;
  E.b = (await seed(BRANCH_B, 'Wheelchair B')).insertedId;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1613 — TherapyEquipment branch isolation', () => {
  it('getEquipment — restricted caller sees only own-branch equipment (was: all branches)', async () => {
    const rows = await svc.getEquipment('t1', String(BRANCH_A));
    const ids = rows.map(r => String(r._id));
    expect(ids).toContain(String(E.a));
    expect(ids).not.toContain(String(E.b));
  });

  it('getEquipment — cross-branch (null scope) sees all branches', async () => {
    const rows = await svc.getEquipment('t1', null);
    expect(rows.map(r => String(r._id))).toContain(String(E.b));
  });

  it('updateEquipment — foreign-branch item not updated (scoped → null)', async () => {
    const r = await svc.updateEquipment(E.b, { name: 'hacked' }, String(BRANCH_A));
    expect(r).toBeNull();
    expect((await TherapyEquipment.findById(E.b).lean()).name).toBe('Wheelchair B');
  });

  it('updateEquipment — own item: branch stripped (no re-home), name applies', async () => {
    const r = await svc.updateEquipment(E.a, { name: 'Renamed', branch: String(BRANCH_B) }, String(BRANCH_A));
    expect(r).not.toBeNull();
    expect(String(r.branch)).toBe(String(BRANCH_A));
    expect(r.name).toBe('Renamed');
  });

  it('bookEquipment — foreign-branch item rejected (scoped → null)', async () => {
    const r = await svc.bookEquipment(E.b, new mongoose.Types.ObjectId(), null, String(BRANCH_A));
    expect(r).toBeNull();
  });

  it('deleteEquipment — foreign-branch item not soft-deleted', async () => {
    const r = await svc.deleteEquipment(E.b, String(BRANCH_A));
    expect(r).toBeNull();
    expect((await TherapyEquipment.findById(E.b).lean()).deletedAt).toBeNull();
  });

  it('createEquipment — stamps caller branch, ignoring a spoofed branch', async () => {
    const doc = await svc.createEquipment({ name: 'New', branch: String(BRANCH_B) }, String(BRANCH_A));
    expect(String(doc.branch)).toBe(String(BRANCH_A));
  });

  it('static: equipment methods take branchScope + route threads effectiveBranchScope', () => {
    const svcSrc = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'therapistPortal.service.js'),
      'utf8'
    );
    expect(svcSrc).toMatch(/async getEquipment\(_therapistId, branchScope\)/);
    expect(svcSrc).toMatch(/async bookEquipment\(id, bookedBy, until, branchScope\)/);
    const routes = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'therapistUltra.routes.js'),
      'utf8'
    );
    expect((routes.match(/Equipment\([^)]*effectiveBranchScope\(req\)\); \/\/ W1613/g) || []).length).toBeGreaterThanOrEqual(6);
  });
});
