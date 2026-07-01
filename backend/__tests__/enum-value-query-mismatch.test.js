'use strict';

/**
 * enum-value-query-mismatch.test.js
 *
 * Two queries filtered an enum field by a literal in the WRONG format, so the
 * filter matched NOTHING (the W1488 class — silent empty result / zero KPI):
 *   - services/analyticsService.js: Employee.countDocuments({ status: 'Active' })
 *     — Employee.status enum is lowercase ('active') → HR-overview activeEmployees
 *       was ALWAYS 0.
 *   - services/ai/proactiveAlerts.service.js: Goal.find({ status: 'in_progress' })
 *     — Goal.status enum is hyphenated ('in-progress') → the stagnant-goal alert
 *       never fired.
 *
 * Static: the queries now use the enum-valid value. Behavioral: the corrected value
 * matches a seeded doc and the OLD value matches nothing (proving the filter works).
 */

const fs = require('fs');
const path = require('path');

describe('enum-value query mismatch (static)', () => {
  const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  test('analyticsService queries Employee.status with the lowercase enum value', () => {
    const src = read('services/analyticsService.js');
    expect(src).toMatch(/status:\s*'active'/);
    expect(src).not.toMatch(/countDocuments\(\{\s*status:\s*'Active'\s*\}\)/);
  });
  test('proactiveAlerts queries Goal.status with the hyphenated enum value', () => {
    const src = read('services/ai/proactiveAlerts.service.js');
    expect(src).toMatch(/status:\s*'in-progress'/);
    expect(src).not.toMatch(/status:\s*'in_progress'/);
  });
});

describe('enum-value query mismatch (behavioral — corrected value matches, old value does not)', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let mongod;
  let Employee;
  let Goal;

  beforeAll(async () => {
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'enum-mismatch' } });
    await mongoose.connect(mongod.getUri());
    Employee = require('../models/HR/Employee');
    Goal = require('../models/Goal');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  test("Employee status 'active' matches; 'Active' (the old bug) matches nothing", async () => {
    await Employee.collection.insertMany([
      { status: 'active', employee_number: 'E1', national_id: 'N1' },
      { status: 'active', employee_number: 'E2', national_id: 'N2' },
      { status: 'terminated', employee_number: 'E3', national_id: 'N3' },
    ]);
    expect(await Employee.countDocuments({ status: 'active' })).toBe(2); // fixed
    expect(await Employee.countDocuments({ status: 'Active' })).toBe(0); // the bug
  });

  test("Goal status 'in-progress' matches; 'in_progress' (the old bug) matches nothing", async () => {
    await Goal.collection.insertMany([
      { status: 'in-progress' },
      { status: 'achieved' },
    ]);
    expect(await Goal.countDocuments({ status: 'in-progress' })).toBe(1); // fixed
    expect(await Goal.countDocuments({ status: 'in_progress' })).toBe(0); // the bug
  });
});
