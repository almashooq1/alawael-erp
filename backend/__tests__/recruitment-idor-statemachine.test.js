/**
 * Recruitment IDOR / state-machine / mass-assignment guards (2026-06-29 hunt).
 * Models all use camelCase `branchId` (ref Branch, required). Most handlers spread
 * branchFilter(req); these lock the handlers that omitted it + the offer state
 * machine + the candidate-facing apply whitelist.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/recruitment.routes.js'), 'utf8');
const ONBOARD = fs.readFileSync(path.join(__dirname, '../models/OnboardingChecklist.js'), 'utf8');

describe('recruitment — cross-branch IDOR fixes', () => {
  test('interview /complete scopes the match by branch (findOneAndUpdate + branchFilter + runValidators)', () => {
    const i = SRC.indexOf("router.patch('/interviews/:id/complete'");
    const block = SRC.slice(i, i + 1000);
    expect(block).toMatch(/RecruitmentInterview\.findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}/);
    expect(block).toMatch(/runValidators: true/);
    expect(block).not.toMatch(/RecruitmentInterview\.findByIdAndUpdate/);
  });
  test('onboarding /task scopes both load and update by branch', () => {
    const i = SRC.indexOf("router.patch('/onboarding/:id/task'");
    const block = SRC.slice(i, i + 1500);
    expect(block).toMatch(/OnboardingChecklist\.findOne\(\{\s*_id: req\.params\.id,\s*\.\.\.branchFilter\(req\)/);
    expect(block).toMatch(/OnboardingChecklist\.findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}/);
    expect(block).not.toMatch(/OnboardingChecklist\.findById\(req\.params\.id\)/);
    expect(block).not.toMatch(/OnboardingChecklist\.findByIdAndUpdate\(\s*req\.params\.id/);
  });
});

describe('recruitment — offer-respond state machine', () => {
  test('only a sent offer may be responded to (atomic status precondition + 409)', () => {
    const i = SRC.indexOf("router.patch('/offers/:id/respond'");
    const block = SRC.slice(i, i + 1500);
    expect(block).toMatch(/status: 'sent' \}/);
    expect(block).toMatch(/if \(!updatedOffer\)/);
    expect(block).toMatch(/409/);
  });
  test('OnboardingChecklist has a unique index on offerId', () => {
    expect(ONBOARD).toMatch(/index\(\{ offerId: 1 \}, \{ unique: true \}\)/);
  });
});

describe('recruitment — candidate apply mass-assignment', () => {
  test('apply create uses an applicant-field whitelist, not ...req.body', () => {
    const i = SRC.indexOf('JobApplication.create');
    const block = SRC.slice(Math.max(0, i - 900), i + 200);
    expect(block).toMatch(/APPLICANT_SUBMITTABLE/);
    expect(block).toMatch(/\.\.\.applicantData/);
  });
  test('the applicant whitelist excludes HR/lifecycle fields', () => {
    const start = SRC.indexOf('const APPLICANT_SUBMITTABLE = [');
    const block = SRC.slice(start, SRC.indexOf('];', start));
    for (const forbidden of ['overallScore', 'assignedTo', 'hrNotes', 'status', 'referredBy', 'source']) {
      expect(block).not.toMatch(new RegExp(`'${forbidden}'`));
    }
  });
});

describe('recruitment — stats/reports branch-scope leak', () => {
  test('weekly-interview count is branch-scoped', () => {
    expect(SRC).toMatch(/RecruitmentInterview\.countDocuments\(\{\s*\.\.\.branchFilter\(req\),\s*\.\.\.filter,\s*scheduledAt/);
  });
  test('cost report posting/application totals are branch-scoped', () => {
    expect(SRC).toMatch(/JobPosting\.countDocuments\(\{ \.\.\.branchFilter\(req\), \.\.\.filter \}\)/);
    expect(SRC).toMatch(/JobApplication\.countDocuments\(\{ \.\.\.branchFilter\(req\), \.\.\.filter \}\)/);
  });
});
