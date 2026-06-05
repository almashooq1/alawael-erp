/**
 * Wave 933 — guards for the HR employee create fix.
 *
 * Two blockers stopped the web-admin EmployeeForm from saving:
 *  1. /api/v1/hr/employees had NO POST handler (employee-admin router only did
 *     GET/PATCH) → create never reached the model.
 *  2. Employee.pre('save') used the mixed `async function (next){…next()}` style →
 *     "next is not a function" under Mongoose 9.
 *
 * Static source guards (pure-unit, no DB).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'hr', 'employee-admin.routes.js'),
  'utf8'
);
const MODEL = fs.readFileSync(path.join(__dirname, '..', 'models', 'HR', 'Employee.js'), 'utf8');

describe('W933 — employee create route + async hook', () => {
  it('the employee-admin router defines a POST /employees handler', () => {
    expect(ROUTE).toMatch(/router\.post\(\s*'\/employees'/);
    expect(ROUTE).toMatch(/Employee\.create/);
  });

  it('the POST maps camelCase → snake_case + stamps branch_id and created_by', () => {
    expect(ROUTE).toMatch(/camelKeysToSnake\(req\.body/);
    expect(ROUTE).toMatch(/branch_id:\s*branchId/);
    expect(ROUTE).toMatch(/created_by:\s*ctx\.callerUserId/);
    // full create-field map present
    expect(ROUTE).toMatch(/nameAr:\s*'name_ar'/);
    expect(ROUTE).toMatch(/nationalId:\s*'national_id'/);
    expect(ROUTE).toMatch(/contractType:\s*'contract_type'/);
  });

  it('the Employee pre(save) hook is a pure async hook (no mixed next param)', () => {
    expect(MODEL).toMatch(/pre\(\s*'save'\s*,\s*async function\s*\(\s*\)/);
    expect(MODEL).not.toMatch(/pre\(\s*'save'\s*,\s*async function\s*\(\s*next\s*\)/);
  });
});
