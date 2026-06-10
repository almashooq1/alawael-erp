'use strict';

/**
 * backfill-hr-branchid-wave1139.test.js — W1133 companion (backfill script).
 *
 * Locks the contract of scripts/backfill-hr-branchid.js (the 7 employee-private
 * models + their employee FKs) AND proves the behaviour against MongoMemoryServer:
 * a pre-W1133 row inserted WITHOUT branchId (raw collection insert, bypassing the
 * hrBranchScope plugin) is left untouched on a dry-run and filled from the
 * employee's branch_id on --commit. Idempotent (second pass updates nothing).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/backfill-hr-branchid-wave1139.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MODELS, backfillModel, run } = require('../scripts/backfill-hr-branchid');

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
let Employee;
let Loan;
let empA;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1139-hr-backfill' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  Employee = mongoose.model(
    'Employee',
    new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId, fullName: String })
  );
  Loan = require('../models/HR/Loan');
  empA = await Employee.create({ branch_id: BRANCH_A, fullName: 'EmpA' });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1133 — backfill script contract', () => {
  it('covers the employee-private models with their employee FK', () => {
    const keys = MODELS.map(m => m.key).sort();
    expect(keys).toEqual(
      [
        'assets',
        'documents', // W1154
        'goals', // W1154
        'health-insurance',
        'loans',
        'nitaqat-contracts', // W1159
        'onboarding',
        'shift-swaps',
        'travel',
        'visas',
      ].sort()
    );
    // Most derive from employeeId; shift-swaps from the requester, nitaqat from `employee`.
    expect(MODELS.find(m => m.key === 'shift-swaps').fk).toBe('requesterId');
    expect(MODELS.find(m => m.key === 'nitaqat-contracts').fk).toBe('employee');
    const standard = MODELS.filter(m => !['shift-swaps', 'nitaqat-contracts'].includes(m.key));
    expect(standard.every(m => m.fk === 'employeeId')).toBe(true);
  });
});

describe('W1133 — backfill fills branchId from the employee', () => {
  let rawId;
  beforeAll(async () => {
    // Raw insert bypasses the hrBranchScope plugin → simulates a pre-W1133 row.
    const r = await Loan.collection.insertOne({
      employeeId: empA._id,
      loanType: 'emergency',
      principalAmount: 100,
      status: 'active',
    });
    rawId = r.insertedId;
  });

  it('dry-run resolves but does NOT write branchId', async () => {
    const loanModel = MODELS.find(m => m.key === 'loans');
    const res = await backfillModel(loanModel, Employee, { commit: false });
    expect(res.resolved).toBeGreaterThanOrEqual(1);
    expect(res.updated).toBe(0);
    const doc = await Loan.collection.findOne({ _id: rawId });
    expect(doc.branchId == null).toBe(true);
  });

  it('--commit writes branchId = the employee branch', async () => {
    const summary = await run({ commit: true, only: 'loans' });
    expect(summary.mode).toBe('commit');
    const doc = await Loan.collection.findOne({ _id: rawId });
    expect(String(doc.branchId)).toBe(String(BRANCH_A));
  });

  it('is idempotent — a second commit pass updates nothing', async () => {
    const summary = await run({ commit: true, only: 'loans' });
    const loans = summary.results.find(r => r.key === 'loans');
    expect(loans.updated).toBe(0);
  });
});
