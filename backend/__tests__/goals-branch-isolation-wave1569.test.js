'use strict';

/**
 * W1569 — goals domain branch isolation + mass-assignment.
 *
 * The goals domain mount applies authenticate + requireBranchAccess (so req.branchScope
 * is set), and TherapeuticGoal has an indexed branchId — but the inline /goals routes
 * never called any branch filter: GET /goals (all branches), /goals/:id (raw getById),
 * /goals/beneficiary/:id + /tree + /episode/:id (no ownership), /statistics + /overdue
 * (raw req.query.branchId spoof), and POST/PUT spread raw req.body with the never-set
 * req.user.branchId (so new goals got NO branchId). This wires branchFilter /
 * effectiveBranchScope / enforceBeneficiaryBranch / assertBranchMatch + a field whitelist.
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'domains', 'goals', 'index.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1569 goals branch isolation + mass-assignment', () => {
  test('imports the branch guards', () => {
    expect(CODE).toMatch(/enforceBeneficiaryBranch/);
    expect(CODE).toMatch(/assertBranchMatch/);
    expect(CODE).toMatch(/effectiveBranchScope/);
    expect(CODE).toMatch(/branchFilter/);
  });

  test('list + episode scoped by branchFilter', () => {
    expect(CODE).toMatch(/goalSvc\.list\(\{\s*filter: \{ \.\.\.branchFilter\(req\)/);
    expect(CODE).toMatch(/getForEpisode\(req\.params\.episodeId, branchFilter\(req\)\)/);
  });

  test('statistics + overdue use effectiveBranchScope (not raw query)', () => {
    expect(CODE).not.toMatch(/getStatistics\(req\.query\)/);
    expect(CODE).not.toMatch(/getOverdue\(req\.query\.branchId\)/);
    expect(CODE).toMatch(/getOverdue\(effectiveBranchScope\(req\)/);
  });

  test('beneficiary + tree enforce beneficiary branch', () => {
    const n = (CODE.match(/enforceBeneficiaryBranch\(req, req\.params\.beneficiaryId\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
  });

  test(':id read + write + progress + achieve assert branch match', () => {
    const n = (CODE.match(/assertBranchMatch\(req, [a-zA-Z.]+\.branchId, 'goal'\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(4);
  });

  test('create + update strip protected fields + server-derived branch', () => {
    const n = (CODE.match(/stripGoalFields\(req\.body\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(CODE).toMatch(/branchId: effectiveBranchScope\(req\) \}/);
    expect(CODE).not.toMatch(/branchId: req\.user\?\.branchId/);
    expect(CODE).toMatch(/GOAL_PROTECTED_FIELDS/);
  });
});
