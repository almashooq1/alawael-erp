'use strict';

/**
 * invoice-branch-tenancy-wave651.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B denormalization (template → Invoice). models/Invoice.js had no
 * branch dimension, so GET /invoices-admin stats (count + 3 aggregates) leaked
 * all-branch invoice/revenue stats to single-branch callers. W651 denormalizes
 * branchId (from the required beneficiary) and branch-scopes that dashboard.
 *
 * Also scopes finance-module's revenue/stats aggregates, which use the SEPARATE
 * models/finance/Invoice.js (snake_case `branch_id`, already a required field —
 * no denormalization needed there, just a snake_case branchScopeSnake() filter).
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'Invoice.js'), 'utf8');
const ADMIN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'invoices-admin.routes.js'),
  'utf8'
);
const FIN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'finance-module.routes.js'),
  'utf8'
);

describe('W651 static — Invoice model carries branch tenancy', () => {
  it('declares branchId reffing Branch + index + derive hook', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/index\(\{\s*branchId:\s*1,\s*status:\s*1\s*\}\)/);
    expect(MODEL_SRC).toMatch(/deriveBranchFromBeneficiary/);
  });
});

describe('W651 static — invoice dashboards are branch-scoped', () => {
  it('invoices-admin adds requireBranchAccess + scopes every Invoice aggregate', () => {
    expect(ADMIN_SRC).toMatch(/requireBranchAccess/);
    const bodies = ADMIN_SRC.match(/Invoice\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(3);
    expect(bodies.every(b => /(scope|branchFilter)/.test(b))).toBe(true);
  });
  it('finance-module scopes its finance/Invoice aggregates via branchScopeSnake', () => {
    expect(FIN_SRC).toMatch(/branchScopeSnake/);
    // both flagged aggregate handlers compose the snake-case branch scope
    expect(FIN_SRC).toMatch(/\$match:\s*\{\s*\.\.\.branchScopeSnake\(req\)/);
    expect(FIN_SRC).toMatch(/const filter = \{\s*\.\.\.branchScopeSnake\(req\)/);
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Invoice;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w651-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  Invoice = require('../models/Invoice');
  await Invoice.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Invoice.deleteMany({});
  await mongoose.connection.collection('beneficiaries').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;
const baseInvoice = (o = {}) => ({
  invoiceNumber: `INV-${(seq += 1)}`,
  beneficiary: oid(),
  subTotal: 100,
  totalAmount: 100,
  ...o,
});

describe('W651 behavioral — branchId derivation from the beneficiary', () => {
  it('derives branchId from the (required) beneficiary when unset', async () => {
    const branchId = oid();
    const beneficiary = oid();
    await mongoose.connection.collection('beneficiaries').insertOne({ _id: beneficiary, branchId });

    const inv = new Invoice(baseInvoice({ beneficiary }));
    await inv.save();
    expect(String(inv.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const beneficiary = oid();
    await mongoose.connection
      .collection('beneficiaries')
      .insertOne({ _id: beneficiary, branchId: oid() });

    const inv = new Invoice(baseInvoice({ beneficiary, branchId: explicit }));
    await inv.save();
    expect(String(inv.branchId)).toBe(String(explicit));
  });
});
