'use strict';

/**
 * meeting-branch-tenancy-wave635.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 sibling-model denormalization (template → MDTMeeting). The model had no
 * branch dimension, so GET /mdt-coordination/meetings-stats (1 count + 3
 * aggregates) leaked all-branch meeting stats. W635 denormalizes branchId —
 * DERIVED FROM THE ORGANIZER (a meeting's branch = its organizer's branch;
 * NOT cases[].beneficiary, which may span beneficiaries) — and branch-scopes
 * that dashboard.
 *
 * Completes the mdt-coordination model denormalization (UnifiedRehabPlan W629
 * + ReferralTicket W633 + MDTMeeting now). The remaining ~60 query sites
 * across the file's other handlers stay a planned route-scoping effort.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'MDTCoordination.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'mdt-coordination.routes.js'),
  'utf8'
);

describe('W635 static — MDTMeeting model carries organizer-derived branch tenancy', () => {
  it('declares branchId reffing Branch + index + organizer-derive hook', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/mdtMeetingSchema\.index\(\{\s*branchId:\s*1,\s*status:\s*1/);
    expect(MODEL_SRC).toMatch(/mdtMeetingSchema\.pre\(\s*'save',\s*async function deriveBranchFromOrganizer/);
  });
});

describe('W635 static — meetings-stats handler is branch-scoped', () => {
  it('the meetings-stats dateFilter composes branchFilter(req)', () => {
    const start = ROUTE_SRC.indexOf("'/meetings-stats'");
    expect(start).toBeGreaterThan(-1);
    const block = ROUTE_SRC.slice(start, start + 900);
    expect(block).toMatch(/const dateFilter = \{\s*\.\.\.branchFilter\(req\)/);
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MDTMeeting;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w635-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/User'); // the derive hook resolves mongoose.model('User')
  ({ MDTMeeting } = require('../models/MDTCoordination'));
  await MDTMeeting.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MDTMeeting.deleteMany({});
  await mongoose.connection.collection('users').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;
const baseMeeting = (o = {}) => ({
  meetingNumber: `MTG-${(seq += 1)}`,
  title: 'اجتماع الفريق',
  date: new Date(),
  startTime: '10:00',
  organizer: oid(),
  ...o,
});

describe('W635 behavioral — branchId derivation from the organizer', () => {
  it('derives branchId from the organizer User when unset', async () => {
    const branchId = oid();
    const organizer = oid();
    await mongoose.connection.collection('users').insertOne({ _id: organizer, branchId });

    const m = new MDTMeeting(baseMeeting({ organizer }));
    await m.save();
    expect(String(m.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const organizer = oid();
    await mongoose.connection.collection('users').insertOne({ _id: organizer, branchId: oid() });

    const m = new MDTMeeting(baseMeeting({ organizer, branchId: explicit }));
    await m.save();
    expect(String(m.branchId)).toBe(String(explicit));
  });
});
