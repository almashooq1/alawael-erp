'use strict';

/**
 * W1385 — compa-ratio service behavioral (MongoMemoryServer).
 *
 * The integration test that catches the "wired-but-broken" class (W1227 lesson):
 * seeds REAL Employee + JobBandMapping + CompensationBand and asserts the whole
 * chain — role→band→midpoint→compa-ratio→classify→aggregate — plus the two
 * invariants that matter: branch isolation (W269) and "unmapped is EXCLUDED, never
 * salary-guessed".
 *
 * Employees are inserted at the collection level (bypassing the heavy Employee
 * required-field validation) since this test exercises the pay-equity service, not
 * Employee's schema.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let svc;
let Employee;
let JobBandMapping;
let CompensationBand;
let mongo;

const B1 = new mongoose.Types.ObjectId();
const B2 = new mongoose.Types.ObjectId();

let empSeq = 0;
function emp(branch_id, job_title_en, basic_salary, extra = {}) {
  empSeq += 1;
  // Employee carries unique indexes (employee_number, national_id) — give each a
  // distinct value so collection-level inserts don't collide on null.
  return {
    status: 'active',
    deleted_at: null,
    branch_id,
    job_title_en,
    basic_salary,
    full_name: job_title_en,
    employee_number: `EMP-${empSeq}`,
    national_id: `100000000${empSeq}`,
    email: `emp${empSeq}@test.local`,
    ...extra,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  Employee = require('../models/HR/Employee');
  JobBandMapping = require('../models/HR/JobBandMapping');
  CompensationBand = require('../models/HR/CompensationBand');
  svc = require('../services/hr/payEquityService');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await Promise.all([
    Employee.collection.deleteMany({}),
    JobBandMapping.deleteMany({}),
    CompensationBand.deleteMany({}),
  ]);
});

async function seedBandAndMapping() {
  await CompensationBand.create({
    bandCode: 'L3',
    bandName: 'Level 3',
    level: 3,
    minSalary: 8000,
    midSalary: 10000,
    maxSalary: 12000,
    isActive: true,
  });
  await JobBandMapping.create({ jobTitle: 'Therapist', bandCode: 'L3', active: true });
}

describe('W1385 compaRatioAnalysis', () => {
  test('computes + classifies + aggregates the full role→band→compa chain', async () => {
    await seedBandAndMapping();
    await Employee.collection.insertMany([
      emp(B1, 'Therapist', 7000), // 0.7  → below
      emp(B1, 'Therapist', 10000), // 1.0 → within
      emp(B1, 'Therapist', 13000), // 1.3 → above
      emp(B1, 'Receptionist', 9000), // no mapping → UNMAPPED (excluded)
    ]);

    const a = await svc.compaRatioAnalysis({ branchId: B1 });
    expect(a.workforce).toBe(4);
    expect(a.mapped).toBe(3);
    expect(a.unmapped).toBe(1); // Receptionist excluded, NOT salary-guessed
    expect(a.coveragePct).toBe(75);
    expect(a.stats.belowCount).toBe(1);
    expect(a.stats.withinCount).toBe(1);
    expect(a.stats.aboveCount).toBe(1);
    expect(a.stats.medianCompaRatio).toBe(1);
  });

  test('an inactive band yields no compa-ratio (graceful, never misleading)', async () => {
    await CompensationBand.create({
      bandCode: 'L3',
      bandName: 'L3',
      level: 3,
      minSalary: 8000,
      midSalary: 10000,
      maxSalary: 12000,
      isActive: false,
    });
    await JobBandMapping.create({ jobTitle: 'Therapist', bandCode: 'L3', active: true });
    await Employee.collection.insertMany([emp(B1, 'Therapist', 7000)]);

    const a = await svc.compaRatioAnalysis({ branchId: B1 });
    expect(a.workforce).toBe(1);
    expect(a.mapped).toBe(0);
    expect(a.unmapped).toBe(1);
  });

  test('branch isolation (W269) — a foreign-branch employee is excluded', async () => {
    await seedBandAndMapping();
    await Employee.collection.insertMany([
      emp(B1, 'Therapist', 10000),
      emp(B2, 'Therapist', 5000), // branch B2 — must NOT appear in a B1 analysis
    ]);

    const a = await svc.compaRatioAnalysis({ branchId: B1 });
    expect(a.workforce).toBe(1);
    expect(a.mapped).toBe(1);
    expect(a.stats.belowCount).toBe(0); // the B2 underpaid one is not counted
  });
});

describe('W1385 belowBandEmployees', () => {
  test('returns only below-band employees, most-underpaid first', async () => {
    await seedBandAndMapping();
    await Employee.collection.insertMany([
      emp(B1, 'Therapist', 7800, { full_name: 'A' }), // 0.78 → below
      emp(B1, 'Therapist', 7000, { full_name: 'B' }), // 0.70 → below (more)
      emp(B1, 'Therapist', 10000, { full_name: 'C' }), // within → excluded
    ]);

    const list = await svc.belowBandEmployees({ branchId: B1 });
    expect(list).toHaveLength(2);
    expect(list.map(e => e.name)).toEqual(['B', 'A']); // 0.70 before 0.78
    expect(list.every(e => e.compaRatio < 0.8)).toBe(true);
  });
});
