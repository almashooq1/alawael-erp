'use strict';

/**
 * cctv-reports-wave1230.test.js — static drift guard for the W1230 fast-reports
 * surface (/api(/v1)/cctv/reports — employees / plates / visitors / AI overview).
 *
 * Pure source-text analysis (fs.readFileSync — no mongoose, no DB). The
 * behavioral counterpart `cctv-reports-behavioral-wave1230.test.js` exercises
 * the aggregations against MongoMemoryServer.
 *
 * Locks:
 *   1. cctv.registry.js mounts /cctv/reports (and documents it in the header)
 *   2. Route file is authenticated + role-gated + READ-ONLY (GET only)
 *   3. Route file has no req.branchId reads (W269h class) + no ...req.body spread
 *   4. Service is read-only (no save/create/update/delete calls)
 *   5. Service uses reg.GATE_DECISION constants (no hardcoded decision strings)
 *   6. Window cap + ObjectId validation present
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/cctv-reports-wave1230.test.js
 */

const fs = require('fs');
const path = require('path');

const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const registrySrc = read('routes/registries/cctv.registry.js');
const routeSrc = read('routes/cctv/reports.routes.js');
const serviceSrc = read('services/cctv/reports.service.js');

describe('W1230 — registry mounts the reports surface', () => {
  test('mount tuple present', () => {
    expect(registrySrc).toMatch(/\['\/cctv\/reports',\s*'\.\.\/cctv\/reports\.routes'\]/);
  });

  test('header comment documents /cctv/reports', () => {
    expect(registrySrc).toMatch(/\*\s+\/cctv\/reports\s+—/);
  });
});

describe('W1230 — route surface shape', () => {
  test('authenticated at router level', () => {
    expect(routeSrc).toMatch(/router\.use\(authenticateToken\)/);
  });

  test('role-gated at router level (admin + security_officer at minimum)', () => {
    const gate = routeSrc.match(/router\.use\(requireRole\(\[([^\]]+)\]\)\)/);
    expect(gate).not.toBeNull();
    expect(gate[1]).toContain("'admin'");
    expect(gate[1]).toContain("'security_officer'");
  });

  test.each([
    '/employees',
    '/employees/:employeeId',
    '/plates',
    '/plates/:plate',
    '/visitors',
    '/ai-overview',
  ])('declares GET %s', endpoint => {
    expect(routeSrc).toContain(`'${endpoint}'`);
  });

  test('surface is READ-ONLY — no mutating verbs', () => {
    expect(routeSrc).not.toMatch(/router\.(post|put|patch|delete)\(/);
  });

  test('no req.branchId reads (W269h class)', () => {
    expect(routeSrc).not.toMatch(/req\.branchId/);
    expect(serviceSrc).not.toMatch(/req\.branchId/);
  });

  test('no mass-assignment spread of req.body', () => {
    expect(routeSrc).not.toMatch(/\.\.\.req\.body/);
  });
});

describe('W1230 — service is a pure read layer', () => {
  test.each([
    'employeesReport',
    'employeeTimeline',
    'platesReport',
    'plateHistory',
    'visitorsReport',
    'aiOverview',
  ])('exports %s', fn => {
    expect(serviceSrc).toMatch(new RegExp(`async function ${fn}\\(`));
    expect(serviceSrc).toMatch(new RegExp(`^\\s+${fn},`, 'm'));
  });

  test('no write operations anywhere in the service', () => {
    expect(serviceSrc).not.toMatch(
      /\.(save|create|insertMany|updateOne|updateMany|findOneAndUpdate|findByIdAndUpdate|deleteOne|deleteMany|bulkWrite)\(/
    );
  });

  test('gate decisions come from the hikvision registry, not hardcoded strings', () => {
    expect(serviceSrc).toMatch(/reg\.GATE_DECISION\.AUTO_ACCEPT/);
    expect(serviceSrc).toMatch(/reg\.GATE_DECISION\.REVIEW/);
    expect(serviceSrc).not.toMatch(/'auto-accept'|'suppressed'/);
  });

  test('window is capped (MAX_WINDOW_DAYS)', () => {
    expect(serviceSrc).toMatch(/MAX_WINDOW_DAYS\s*=\s*92/);
  });

  test('ObjectId inputs are validated before querying', () => {
    expect(serviceSrc).toMatch(/isValidObjectId\(branchId\)/);
    expect(serviceSrc).toMatch(/isValidObjectId\(employeeId\)/);
  });

  test('plate reports join the ANPR registry + transport fleet', () => {
    expect(serviceSrc).toMatch(/CctvAnpr\.find\(/);
    expect(serviceSrc).toMatch(/TransportVehicle/);
    expect(serviceSrc).toMatch(/license_plate/);
  });

  test('per-day bucketing uses the Riyadh offset', () => {
    expect(serviceSrc).toMatch(/\+03:00/);
  });
});
