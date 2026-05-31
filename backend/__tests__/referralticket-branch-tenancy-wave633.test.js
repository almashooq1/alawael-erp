'use strict';

/**
 * referralticket-branch-tenancy-wave633.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 sibling-model denormalization (W613/W621/W629 template → ReferralTicket).
 * The model had no branch dimension, so GET /mdt-coordination/referrals-stats
 * (1 count + 4 aggregates) leaked all-branch referral-ticket stats to
 * single-branch callers. W633 denormalizes branchId (from the required
 * beneficiary via pre-save) and branch-scopes that dashboard.
 *
 * NOTE: this scopes only the dedicated /referrals-stats handler. The other
 * MDTMeeting + ReferralTicket query sites across mdt-coordination.routes.js
 * (~15 handlers, 70+ sites) + MDTMeeting's branch denormalization (organizer-
 * derived) remain a separate planned route-scoping effort.
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

describe('W633 static — ReferralTicket model carries branch tenancy', () => {
  it('declares branchId reffing Branch + index + derive hook', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/referralTicketSchema\.index\(\{\s*branchId:\s*1,\s*status:\s*1/);
    expect(MODEL_SRC).toMatch(
      /referralTicketSchema\.pre\(\s*'save',\s*async function deriveBranchFromBeneficiary/
    );
  });
});

describe('W633 static — /referrals-stats is branch-scoped', () => {
  it('the referrals-stats handler scopes its count + every aggregate', () => {
    const start = ROUTE_SRC.indexOf("'/referrals-stats'");
    expect(start).toBeGreaterThan(-1);
    const block = ROUTE_SRC.slice(start, start + 1400);
    // 4 ReferralTicket.aggregate in this handler, each must have a scoped $match
    const aggs = block.match(/ReferralTicket\.aggregate/g) || [];
    expect(aggs.length).toBeGreaterThanOrEqual(4);
    expect(block).toMatch(/const scope = branchFilter\(req\)/);
    expect(block).toMatch(/countDocuments\(\{\s*\.\.\.scope/);
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let ReferralTicket;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w633-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  ({ ReferralTicket } = require('../models/MDTCoordination'));
  await ReferralTicket.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await ReferralTicket.deleteMany({});
  await mongoose.connection.collection('beneficiaries').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;
const baseTicket = (o = {}) => ({
  ticketNumber: `TKT-${(seq += 1)}`,
  beneficiary: oid(),
  referredBy: oid(),
  fromDepartment: 'PT',
  toDepartment: 'OT',
  reason: 'سبب الإحالة',
  ...o,
});

describe('W633 behavioral — branchId derivation from the beneficiary', () => {
  it('derives branchId from the (required) beneficiary when unset', async () => {
    const branchId = oid();
    const beneficiary = oid();
    await mongoose.connection.collection('beneficiaries').insertOne({ _id: beneficiary, branchId });

    const t = new ReferralTicket(baseTicket({ beneficiary }));
    await t.save();
    expect(String(t.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const beneficiary = oid();
    await mongoose.connection
      .collection('beneficiaries')
      .insertOne({ _id: beneficiary, branchId: oid() });

    const t = new ReferralTicket(baseTicket({ beneficiary, branchId: explicit }));
    await t.save();
    expect(String(t.branchId)).toBe(String(explicit));
  });
});
