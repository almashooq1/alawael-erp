/**
 * employee-create-massassign-role-gate-wave1586.test.js — W1586
 *
 * The HR employee-admin router mounts behind `authenticate` ONLY
 * (app.js: `app.use('/api/v1/hr', authenticate, adminRouter)`), so before
 * W1586 the `POST /employees` create route had:
 *   1. NO role gate → any authenticated principal (therapist, receptionist,
 *      even a portal token) could create an Employee record.
 *   2. `Employee.create({ ...body, ... })` mass-assignment → the caller could
 *      set an arbitrary basic_salary / national_id / IBAN and forge the
 *      auto-generated employee_number.
 *
 * W1586 gates the route to HR roles and strips server-derived / identity
 * fields from the payload. This suite mounts the REAL router (real
 * `requireRole`) with a stubbed service + mocked Employee model and asserts:
 *   - a non-HR caller is 403'd,
 *   - an HR caller succeeds but the forged employee_number / created_by never
 *     reach Employee.create().
 */

const express = require('express');
const request = require('supertest');

// Capture what the handler passes to Employee.create().
const createCalls = [];
jest.mock('../models/HR/Employee', () => ({
  create: jest.fn(async doc => {
    createCalls.push(doc);
    return { _id: 'emp-1', ...doc };
  }),
}));

const {
  createEmployeeAdminRouter,
} = require('../routes/hr/employee-admin.routes');

function buildApp(user) {
  const app = express();
  app.use(express.json());
  // Stand in for the `authenticate` middleware the real mount applies.
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  const service = {
    listEmployees: jest.fn(),
    getEmployeeById: jest.fn(),
  };
  app.use('/api/v1/hr', createEmployeeAdminRouter({ service, logger: { info() {}, warn() {}, error() {} } }));
  return app;
}

describe('W1586 — employee create is HR-gated + mass-assignment-safe', () => {
  beforeEach(() => createCalls.splice(0, createCalls.length));

  it('403s a non-HR authenticated caller (was: any user could create staff)', async () => {
    const app = buildApp({ id: 'u1', role: 'therapist', branch_id: 'b1' });
    const res = await request(app)
      .post('/api/v1/hr/employees')
      .send({ name_ar: 'x', basic_salary: 1, national_id: '1234567890', branch_id: 'b1' });
    expect(res.status).toBe(403);
    expect(createCalls).toHaveLength(0);
  });

  it('allows an HR caller but strips forged employee_number / created_by', async () => {
    const app = buildApp({ id: 'hr-9', role: 'hr', branch_id: 'b1' });
    const res = await request(app)
      .post('/api/v1/hr/employees')
      .send({
        name_ar: 'موظف',
        basic_salary: 5000,
        national_id: '1000000001',
        branch_id: 'b1',
        employee_number: 'EMP-FORGED-0001',
        created_by: 'attacker',
        _id: 'attacker-controlled-id',
      });
    expect(res.status).toBe(201);
    expect(createCalls).toHaveLength(1);
    const payload = createCalls[0];
    // Server-derived / forged fields must NOT survive.
    expect(payload.employee_number).toBeUndefined();
    expect(payload._id).toBeUndefined();
    expect(payload.created_by).toBe('hr-9'); // server-stamped, not 'attacker'
    // Legitimate form fields still pass through.
    expect(payload.name_ar).toBe('موظف');
    expect(payload.basic_salary).toBe(5000);
    expect(payload.branch_id).toBe('b1');
  });

  it('accepts admin + hr_manager roles too', async () => {
    for (const role of ['admin', 'hr_manager']) {
      const app = buildApp({ id: 'x', role, branch_id: 'b1' });
      const res = await request(app)
        .post('/api/v1/hr/employees')
        .send({ name_ar: 'y', basic_salary: 1, national_id: '2000000002', branch_id: 'b1' });
      expect(res.status).toBe(201);
    }
  });

  it('source carries the requireRole gate + protected-field strip (static drift guard)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'hr', 'employee-admin.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/requireRole\('hr', 'admin', 'hr_manager'\)/);
    expect(src).toMatch(/EMPLOYEE_CREATE_PROTECTED/);
    expect(src).toMatch(/for \(const k of EMPLOYEE_CREATE_PROTECTED\) delete body\[k\]/);
  });
});
