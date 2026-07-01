'use strict';

/**
 * branch-enhanced-appointment-enum.test.js
 *
 * services/branches/branch-enhanced.service.js counted branch appointments by
 * `status: 'completed'` / `'cancelled'` — but models/Appointment.js (single-
 * registered) enum is UPPERCASE {PENDING,CONFIRMED,…,COMPLETED,CANCELLED,…}, so the
 * lowercase literals matched NOTHING → the branch dashboard's completed/cancelled
 * appointment KPIs were always 0. Fixed to the enum-valid UPPERCASE values.
 *
 * (The sibling cancel-on-transfer write — filter `status: 'scheduled'`, which the
 * enum also lacks — is left flagged-not-fixed: a destructive write whose correct
 * state-set is a product call.)
 */

const fs = require('fs');
const path = require('path');

describe('branch-enhanced appointment enum (static)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'branches', 'branch-enhanced.service.js'),
    'utf8'
  );
  test('the branch KPI counts use the UPPERCASE enum values', () => {
    expect(src).toMatch(/status:\s*'COMPLETED'/);
    expect(src).toMatch(/status:\s*'CANCELLED'/);
    expect(src).not.toMatch(/countDocuments\([^)]*status:\s*'completed'/);
    expect(src).not.toMatch(/countDocuments\([^)]*status:\s*'cancelled'/);
  });
  test('the known-broken cancel-on-transfer write stays explicitly flagged', () => {
    expect(src).toMatch(/KNOWN-BROKEN \(flagged/);
  });
});

describe('branch-enhanced appointment enum (behavioral)', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let mongod;
  let Appointment;

  beforeAll(async () => {
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'branch-appt-enum' } });
    await mongoose.connect(mongod.getUri());
    Appointment = require('../models/Appointment');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  test("status 'COMPLETED'/'CANCELLED' match; the old lowercase match nothing", async () => {
    const branchId = new mongoose.Types.ObjectId();
    await Appointment.collection.insertMany([
      { branchId, status: 'COMPLETED', date: new Date() },
      { branchId, status: 'COMPLETED', date: new Date() },
      { branchId, status: 'CANCELLED', date: new Date() },
    ]);
    expect(await Appointment.countDocuments({ branchId, status: 'COMPLETED' })).toBe(2); // fixed
    expect(await Appointment.countDocuments({ branchId, status: 'CANCELLED' })).toBe(1); // fixed
    expect(await Appointment.countDocuments({ branchId, status: 'completed' })).toBe(0); // the bug
    expect(await Appointment.countDocuments({ branchId, status: 'cancelled' })).toBe(0); // the bug
  });
});
