'use strict';

/**
 * nitaqat-contract-branch-isolation-wave1159.test.js — W269 static drift guard.
 *
 * routes/nitaqat.routes.js mounts requireBranchAccess but its /contracts/:id routes
 * (GET details · POST submit-qiwa · PUT status) loaded the employment contract by a
 * bare id with NO ownership check — so a branch-restricted hr_manager could view /
 * submit-to-Qiwa / change-status of ANY branch's contract (salary PII). The Nitaqat
 * EmploymentContract keys on `organization` (single-org platform) + `employee`, so
 * branch is the right isolation axis: denormalize branchId from the employee.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/nitaqat-contract-branch-isolation-wave1159.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTER = fs.readFileSync(path.join(__dirname, '..', 'routes', 'nitaqat.routes.js'), 'utf-8');
const MODELS_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'nitaqat.models.js'),
  'utf-8'
);

describe('W269 — nitaqat /contracts/:id routes assert branch ownership', () => {
  test('imports assertBranchMatch + defines loadContractInBranch', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/async function loadContractInBranch\(req, res, contractId\)/);
    expect(ROUTER).toMatch(/assertBranchMatch\(req, contract\.branchId, 'employment contract'\)/);
  });

  test('all 3 contract-id routes gate via loadContractInBranch (>= 3)', () => {
    const uses = ROUTER.match(/loadContractInBranch\(req, res, req\.params\.id\)/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(3);
  });

  test('NitaqatEmploymentContract carries the hrBranchScope plugin (employeeField: employee)', () => {
    expect(MODELS_SRC).toMatch(/\.plugin\(require\(['"]\.\/HR\/hrBranchScope\.plugin['"]\)/);
    expect(MODELS_SRC).toMatch(/employeeField: 'employee'/);
  });
});
