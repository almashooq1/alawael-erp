/**
 * care-plan-list-wave54.test.js — Wave 54.
 *
 * Covers:
 *   1. service.listPlans — filters / pagination / sort / branch-scope
 *   2. GET / route — permission + filter parsing + envelope
 *   3. Frontend → backend contract (statuses split, query encoding)
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { createCarePlanService } = require('../intelligence/care-plan.service');
const { createCarePlanValidator } = require('../intelligence/care-plan-validator.service');
const createCarePlanRouter = require('../routes/care-plan.routes');

// ─── Helpers ─────────────────────────────────────────────────────────

function makeModelWithDocs(docs) {
  const store = docs.map(d => ({ ...d }));
  return {
    _store: store,
    countDocuments: async filter => {
      return store.filter(d => matchesFilter(d, filter)).length;
    },
    find: filter => {
      const matched = store.filter(d => matchesFilter(d, filter));
      let result = [...matched];
      return {
        sort: spec => {
          const [[k, dir]] = Object.entries(spec);
          result = [...result].sort((a, b) => {
            const av = a[k] ?? 0;
            const bv = b[k] ?? 0;
            return dir === 1 ? (av < bv ? -1 : av > bv ? 1 : 0) : av < bv ? 1 : av > bv ? -1 : 0;
          });
          return {
            skip: n => ({
              limit: m => ({
                lean: async () => result.slice(n, n + m),
              }),
            }),
          };
        },
      };
    },
  };
}

function matchesFilter(doc, filter) {
  for (const [k, v] of Object.entries(filter)) {
    if (v && typeof v === 'object' && v.$in) {
      if (!v.$in.includes(doc[k])) return false;
    } else if (v instanceof RegExp) {
      if (!v.test(String(doc[k] ?? ''))) return false;
    } else {
      if (String(doc[k]) !== String(v)) return false;
    }
  }
  return true;
}

function makeService(model) {
  const validator = createCarePlanValidator({});
  return createCarePlanService({
    planVersionModel: model,
    validator,
    logger: { warn: () => {}, info: () => {} },
  });
}

function sampleDocs() {
  return [
    {
      _id: '1',
      planId: 'plan-A',
      versionNumber: 1,
      planType: 'individual_therapy',
      status: 'draft',
      branchId: 'br1',
      beneficiaryId: 'b1',
      authorId: 'U1',
      createdAt: new Date('2026-05-01'),
    },
    {
      _id: '2',
      planId: 'plan-B',
      versionNumber: 1,
      planType: 'behavioral',
      status: 'approved',
      branchId: 'br1',
      beneficiaryId: 'b2',
      authorId: 'U2',
      createdAt: new Date('2026-05-15'),
    },
    {
      _id: '3',
      planId: 'plan-C',
      versionNumber: 1,
      planType: 'individual_therapy',
      status: 'under_review',
      branchId: 'br2',
      beneficiaryId: 'b3',
      authorId: 'U3',
      createdAt: new Date('2026-05-10'),
    },
    {
      _id: '4',
      planId: 'plan-D',
      versionNumber: 2,
      planType: 'group',
      status: 'approved',
      branchId: 'br2',
      beneficiaryId: 'b4',
      authorId: 'U4',
      createdAt: new Date('2026-05-12'),
    },
  ];
}

// ─── 1. Service.listPlans ────────────────────────────────────────────

describe('care-plan.service — listPlans', () => {
  test('returns all docs with default pagination', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans();
    expect(r.total).toBe(4);
    expect(r.plans.length).toBe(4);
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });

  test('filters by status', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({ filters: { status: 'approved' } });
    expect(r.total).toBe(2);
    expect(r.plans.every(p => p.status === 'approved')).toBe(true);
  });

  test('filters by statuses array (status group chip)', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({
      filters: { statuses: ['draft', 'under_review'] },
    });
    expect(r.total).toBe(2);
    const sts = r.plans.map(p => p.status).sort();
    expect(sts).toEqual(['draft', 'under_review']);
  });

  test('filters by planType', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({ filters: { planType: 'individual_therapy' } });
    expect(r.total).toBe(2);
  });

  test('filters by branchId', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({ filters: { branchId: 'br1' } });
    expect(r.total).toBe(2);
  });

  test('rejects unknown status value (silently — no filter applied)', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({ filters: { status: 'attacker_value' } });
    expect(r.total).toBe(4);
  });

  test('rejects unknown statuses[] entries (filters to known only)', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({
      filters: { statuses: ['draft', 'fake_status'] },
    });
    expect(r.total).toBe(1); // only 'draft' is valid
  });

  test('branch-scope: non-executive sees only their branch', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({
      actor: { userId: 'U1', role: 'therapist', branchId: 'br1' },
    });
    expect(r.total).toBe(2);
    expect(r.plans.every(p => p.branchId === 'br1')).toBe(true);
  });

  test('branch-scope: executive sees all', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({
      actor: { userId: 'U1', role: 'executive_leadership', branchId: 'br1' },
    });
    expect(r.total).toBe(4);
  });

  test('branch-scope: client tries to override with foreign branch → empty', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({
      filters: { branchId: 'br2' },
      actor: { userId: 'U1', role: 'therapist', branchId: 'br1' },
    });
    expect(r.total).toBe(0);
  });

  test('pagination + hasMore', async () => {
    const docs = Array.from({ length: 25 }, (_, i) => ({
      _id: String(i),
      planId: `plan-${i}`,
      status: 'draft',
      planType: 'individual_therapy',
      branchId: 'br1',
      createdAt: new Date(2026, 0, i + 1),
    }));
    const svc = makeService(makeModelWithDocs(docs));
    const p1 = await svc.listPlans({ pagination: { page: 1, limit: 10 } });
    expect(p1.plans.length).toBe(10);
    expect(p1.total).toBe(25);
    expect(p1.hasMore).toBe(true);
    const p3 = await svc.listPlans({ pagination: { page: 3, limit: 10 } });
    expect(p3.plans.length).toBe(5);
    expect(p3.hasMore).toBe(false);
  });

  test('search filter applies regex on planId', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({ filters: { search: 'plan-A' } });
    expect(r.total).toBe(1);
    expect(r.plans[0].planId).toBe('plan-A');
  });

  test('search filter escapes regex special chars', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({ filters: { search: '.*' } });
    // After escaping ".*" → literal regex which won't match planId
    expect(r.total).toBe(0);
  });

  test('caps limit at 100', async () => {
    const docs = Array.from({ length: 50 }, (_, i) => ({
      _id: String(i),
      status: 'draft',
      branchId: 'br1',
      createdAt: new Date(),
    }));
    const svc = makeService(makeModelWithDocs(docs));
    const r = await svc.listPlans({ pagination: { limit: 999 } });
    expect(r.limit).toBe(100);
  });

  test('rejects invalid sortBy (falls back to createdAt)', async () => {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const r = await svc.listPlans({ pagination: { sortBy: 'attacker_field' } });
    expect(r.total).toBe(4);
  });
});

// ─── 2. GET / route ──────────────────────────────────────────────────

describe('GET / route — care-plan list', () => {
  function makeApp({ allowedPermissions = null, role = 'therapist', branchId } = {}) {
    const svc = makeService(makeModelWithDocs(sampleDocs()));
    const gov = {
      hasPermission: jest.fn((_role, code) => {
        if (allowedPermissions === null) return true;
        return allowedPermissions.includes(code);
      }),
    };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'U-1', role, ...(branchId ? { branchId } : {}) };
      // W1551: simulate requireBranchAccess output. The JWT never carries branchId
      // in prod, so list scoping reads req.branchScope (via effectiveBranchScope),
      // not req.user.branchId. A test that passes a branchId models a branch-restricted
      // user; no branchId models a cross-branch role (allBranches).
      req.branchScope = branchId
        ? { restricted: true, branchId, allBranches: false }
        : { restricted: false, branchId: null, allBranches: true };
      next();
    });
    app.use('/api/v1/care-plans', createCarePlanRouter({ service: svc, governance: gov }));
    return { app, svc };
  }

  test('happy path — returns 200 + envelope', async () => {
    const { app } = makeApp({ role: 'executive_leadership' });
    const res = await request(app).get('/api/v1/care-plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(4);
    expect(Array.isArray(res.body.data.plans)).toBe(true);
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({ allowedPermissions: [] });
    const res = await request(app).get('/api/v1/care-plans');
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.list');
  });

  test('filters by status query param', async () => {
    const { app } = makeApp({ role: 'executive_leadership' });
    const res = await request(app).get('/api/v1/care-plans').query({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });

  test('filters by statuses (comma-separated)', async () => {
    const { app } = makeApp({ role: 'executive_leadership' });
    const res = await request(app)
      .get('/api/v1/care-plans')
      .query({ statuses: 'draft,under_review' });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });

  test('branch-scope enforced from JWT branchId', async () => {
    const { app } = makeApp({ role: 'therapist', branchId: 'br1' });
    const res = await request(app).get('/api/v1/care-plans');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.plans.every(p => p.branchId === 'br1')).toBe(true);
  });

  test('pagination via query params', async () => {
    const { app } = makeApp({ role: 'executive_leadership' });
    const res = await request(app).get('/api/v1/care-plans').query({ page: 2, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.plans.length).toBeLessThanOrEqual(2);
  });

  test('listPlans absent → 501 NOT_WIRED', async () => {
    const stub = {
      hasPermission: () => true,
    };
    const stubService = {
      createDraft: () => {},
      runValidation: () => {},
      transition: () => {},
      // listPlans NOT included → route should 501
    };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'U-1', role: 'therapist' };
      next();
    });
    app.use('/api/v1/care-plans', createCarePlanRouter({ service: stubService, governance: stub }));
    const res = await request(app).get('/api/v1/care-plans');
    expect(res.status).toBe(501);
    expect(res.body.reason).toBe('LIST_NOT_WIRED');
  });

  test('GET / does NOT shadow other endpoints (recommendations/build-prompt still works)', async () => {
    const { app } = makeApp({ role: 'executive_leadership' });
    const res = await request(app).post('/api/v1/care-plans/recommendations/build-prompt').send({});
    // Permission allows it; just confirms /recommendations isn't captured by GET /
    expect([200, 403]).toContain(res.status);
  });
});
