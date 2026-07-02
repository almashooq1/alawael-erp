/**
 * W1622 — field-training list endpoints cross-branch isolation guard.
 *
 * WHY: W1160 hardened this domain's `:programId` / `:traineeRecordId` param
 * lookups (branchScopedResourceParam) + the dashboard (effectiveBranchScope),
 * but MISSED the two collection-list endpoints — `GET /field-training/programs`
 * and `GET /field-training/trainees`. `requireBranchAccess` (the mount guard)
 * only rejects a request that NAMES a foreign branchId; a list endpoint that
 * takes no branchId sails through unfiltered → any authenticated restricted
 * user could read TrainingProgram + TraineeRecord (PII: trainee names,
 * evaluations, competencies, caseload beneficiary assignments) from ALL
 * branches. This is the recurring "helper imported but forgotten on the list
 * handler" IDOR class (W269 doctrine).
 *
 * Static source scan (no mongoose, no DB).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES = fs.readFileSync(
  path.resolve(__dirname, '../domains/field-training/routes/field-training.routes.js'),
  'utf8'
);
const SERVICE = fs.readFileSync(
  path.resolve(__dirname, '../domains/field-training/services/FieldTrainingService.js'),
  'utf8'
);

// The `fieldTrainingService.<method>({ ... })` call block in the route handler.
function callBlock(src, method) {
  const i = src.indexOf(`fieldTrainingService.${method}({`);
  return i === -1 ? '' : src.slice(i, i + 500);
}
// The `async <method>({ ... }) { ... }` body in the service.
function methodBody(src, method) {
  const i = src.indexOf(`async ${method}(`);
  return i === -1 ? '' : src.slice(i, i + 600);
}

describe('field-training list endpoints — cross-branch isolation (W1622)', () => {
  test('sanity: route file imports effectiveBranchScope', () => {
    expect(ROUTES).toMatch(/effectiveBranchScope/);
  });

  test('GET /programs passes branchId: effectiveBranchScope(req) to listPrograms', () => {
    expect(callBlock(ROUTES, 'listPrograms')).toMatch(/branchId:\s*effectiveBranchScope\(req\)/);
  });

  test('GET /trainees passes branchId: effectiveBranchScope(req) to listTrainees', () => {
    expect(callBlock(ROUTES, 'listTrainees')).toMatch(/branchId:\s*effectiveBranchScope\(req\)/);
  });

  test('service listPrograms accepts branchId and filters the query', () => {
    const body = methodBody(SERVICE, 'listPrograms');
    expect(body).toMatch(/async listPrograms\(\{[^}]*\bbranchId\b/);
    expect(body).toMatch(/if\s*\(branchId\)\s*q\.branchId\s*=\s*branchId/);
  });

  test('service listTrainees accepts branchId and filters the query', () => {
    const body = methodBody(SERVICE, 'listTrainees');
    expect(body).toMatch(/async listTrainees\(\{[^}]*\bbranchId\b/);
    expect(body).toMatch(/if\s*\(branchId\)\s*q\.branchId\s*=\s*branchId/);
  });
});
