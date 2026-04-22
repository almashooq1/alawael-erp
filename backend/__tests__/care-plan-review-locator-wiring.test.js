/**
 * care-plan-review-locator-wiring.test.js — Phase 9 Commit 10.
 *
 * Proves that bootstrapRedFlagSystem registers carePlanReviewService
 * under the exact key the registry's `operational.care_plan.review.
 * overdue` flag declares as its trigger source, and that a live
 * end-to-end evaluation resolves the registered service's response.
 *
 * No Mongo — uses in-memory models injected via locator override,
 * same pattern as red-flag-routes.test.js.
 */

'use strict';

const { createCarePlanReviewService } = require('../services/carePlanReviewService');
const { byId } = require('../config/red-flags.registry');

const FLAG_ID = 'operational.care_plan.review.overdue';

// ─── In-memory models (mirrors care-plan-review-service.test.js) ──

function fakeModel(seed = []) {
  const docs = seed.map((d, i) => ({ _id: d._id || `doc-${i + 1}`, ...d }));
  const api = {
    findOne: filter => buildQuery(docs.filter(d => matches(d, filter)).slice(0, 1), true),
    find: filter =>
      buildQuery(
        docs.filter(d => matches(d, filter)),
        false
      ),
    findById: id => buildQuery(docs.filter(d => String(d._id) === String(id)).slice(0, 1), true),
    async create(doc) {
      const stored = { _id: `doc-${docs.length + 1}`, ...doc };
      docs.push(stored);
      return stored;
    },
    async updateOne() {
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
  return api;
}
function matches(doc, filter) {
  for (const [k, v] of Object.entries(filter)) {
    if (v && typeof v === 'object' && !(v instanceof Date)) continue;
    if (doc[k] !== v && String(doc[k]) !== String(v)) return false;
  }
  return true;
}
function buildQuery(results, singular) {
  return {
    sort() {
      return this;
    },
    lean() {
      return Promise.resolve(singular ? results[0] || null : results.slice());
    },
    then(resolve, reject) {
      return Promise.resolve(singular ? results[0] || null : results.slice()).then(resolve, reject);
    },
  };
}

const FIXED_NOW = new Date('2026-05-01T00:00:00.000Z');

describe('Phase 9 Commit 10 — carePlanReviewService wired as trigger source', () => {
  it('the red-flag registry still declares the service name + method + path this file expects', () => {
    const flag = byId(FLAG_ID);
    expect(flag).not.toBeNull();
    expect(flag.trigger.source.service).toBe('carePlanReviewService');
    expect(flag.trigger.source.method).toBe('daysPastReviewDate');
    expect(flag.trigger.source.path).toBe('daysPast');
  });

  it('the service method returns a response carrying the path the flag reads', async () => {
    const svc = createCarePlanReviewService({
      carePlanModel: fakeModel([
        {
          _id: 'cp-1',
          beneficiary: 'ben-1',
          status: 'ACTIVE',
          reviewDate: new Date(FIXED_NOW.getTime() - 21 * 86400000),
        },
      ]),
      planReviewModel: fakeModel(),
      now: () => FIXED_NOW,
    });
    const out = await svc.daysPastReviewDate('ben-1');
    // The path the registry reads is 'daysPast' — so out.daysPast must be defined
    expect(Object.prototype.hasOwnProperty.call(out, 'daysPast')).toBe(true);
    expect(out.daysPast).toBe(21); // 21 days past due
  });

  it('registering the service under "carePlanReviewService" and calling daysPastReviewDate works via locator', async () => {
    // Minimal locator mock to avoid loading the full bootstrap (which
    // boots Mongo-coupled pieces). The shape is identical to what
    // services/redFlagServiceLocator exposes.
    const store = new Map();
    const locator = {
      register(name, impl) {
        store.set(name, impl);
      },
      get(name) {
        return store.get(name) || null;
      },
    };

    const flag = byId(FLAG_ID);
    const svc = createCarePlanReviewService({
      carePlanModel: fakeModel([
        {
          _id: 'cp-1',
          beneficiary: 'ben-2',
          status: 'ACTIVE',
          reviewDate: new Date(FIXED_NOW.getTime() - 10 * 86400000),
        },
      ]),
      planReviewModel: fakeModel(),
      now: () => FIXED_NOW,
    });

    locator.register(flag.trigger.source.service, svc);

    // Simulate what the red-flag evaluator does
    const registered = locator.get(flag.trigger.source.service);
    expect(registered).toBe(svc);

    const method = registered[flag.trigger.source.method];
    expect(typeof method).toBe('function');

    const result = await method('ben-2');
    const value = result[flag.trigger.source.path];
    expect(value).toBe(10);

    // And the flag's trigger.condition is `{ operator: '>=', value: 1 }` —
    // so the flag would fire for this value.
    expect(flag.trigger.condition.operator).toBe('>=');
    expect(value >= flag.trigger.condition.value).toBe(true);
  });

  it('bootstrap module declares the registration block', () => {
    // A light source-level check that the wiring actually exists in
    // redFlagBootstrap.js — cheaper than booting the full bootstrap,
    // and it catches someone accidentally deleting the registration.
    const fs = require('fs');
    const path = require('path');
    const bootstrapSrc = fs.readFileSync(
      path.resolve(__dirname, '../startup/redFlagBootstrap.js'),
      'utf8'
    );
    expect(bootstrapSrc).toContain("locator.register(\n          'carePlanReviewService'");
    expect(bootstrapSrc).toContain('createCarePlanReviewService');
  });
});
