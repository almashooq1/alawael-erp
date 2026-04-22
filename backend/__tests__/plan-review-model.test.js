/**
 * plan-review-model.test.js — Phase 9 Commit 9.
 *
 * Validates the PlanReview schema. Uses the jest.unmock('mongoose')
 * pattern (see goal-smart-fields.test.js) because the global mock
 * strips `.schema` metadata.
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
if (mongoose.models && mongoose.models.PlanReview) {
  delete mongoose.models.PlanReview;
  if (mongoose.modelSchemas) delete mongoose.modelSchemas.PlanReview;
}

const PlanReview = require('../models/PlanReview');
const schema = PlanReview.schema;

function pathOf(name) {
  return schema.path(name);
}

describe('PlanReview schema — required fields', () => {
  it.each(['carePlan', 'beneficiary', 'reviewDate', 'nextReviewDate'])('%s is required', name => {
    expect(pathOf(name)).toBeDefined();
    expect(pathOf(name).isRequired).toBe(true);
  });
});

describe('PlanReview schema — reviewType enum', () => {
  it('accepts only SCHEDULED | INTERIM | CRITICAL | DISCHARGE', () => {
    const allowed = pathOf('reviewType').options.enum;
    expect(allowed).toEqual(['SCHEDULED', 'INTERIM', 'CRITICAL', 'DISCHARGE']);
  });

  it('defaults to SCHEDULED', () => {
    expect(pathOf('reviewType').options.default).toBe('SCHEDULED');
  });
});

describe('PlanReview schema — progressRating enum', () => {
  it('accepts EXCELLENT | GOOD | FAIR | POOR | REGRESSING', () => {
    const allowed = pathOf('progressRating').options.enum;
    expect(allowed).toEqual(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'REGRESSING']);
  });
});

describe('PlanReview schema — goal counters have min 0 + default 0', () => {
  it.each(['goalsAchieved', 'goalsPartial', 'goalsUnmet'])('%s is bounded', name => {
    const p = pathOf(name);
    expect(p.options.default).toBe(0);
    expect(p.options.min).toBe(0);
  });
});

describe('PlanReview schema — index presence', () => {
  it('indexes carePlan + reviewDate + nextReviewDate paths individually', () => {
    expect(pathOf('carePlan').options.index).toBe(true);
    expect(pathOf('beneficiary').options.index).toBe(true);
    expect(pathOf('reviewDate').options.index).toBe(true);
    expect(pathOf('nextReviewDate').options.index).toBe(true);
    expect(pathOf('addressesScheduledDate').options.index).toBe(true);
  });

  it('declares compound indexes for the service-layer queries', () => {
    const indexes = schema.indexes();
    // Shape: [[{fields}, {opts}], ...]
    const keys = indexes.map(([fields]) => JSON.stringify(fields));
    expect(keys).toContain(JSON.stringify({ carePlan: 1, reviewDate: -1 }));
    expect(keys).toContain(JSON.stringify({ beneficiary: 1, reviewDate: -1 }));
  });
});

describe('PlanReview schema — timestamps', () => {
  it('has createdAt and updatedAt', () => {
    expect(pathOf('createdAt')).toBeDefined();
    expect(pathOf('updatedAt')).toBeDefined();
  });
});
