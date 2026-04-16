/**
 * Executive Dashboard API tests — exercises the router with stub models.
 */

const express = require('express');
const request = require('supertest');
const { buildRouter } = require('../kpi/dashboard.routes');

function counter(data) {
  return {
    countDocuments: async (q = {}) => data.filter(d => shallowMatch(d, q)).length,
    aggregate: async pipeline => {
      let w = [...data];
      for (const s of pipeline) {
        if (s.$match) w = w.filter(d => shallowMatch(d, s.$match));
        if (s.$group) {
          const field = s.$group.total?.$sum?.replace(/^\$/, '');
          w = [{ _id: null, total: w.reduce((a, b) => a + (b[field] || 0), 0) }];
        }
      }
      return w;
    },
  };
}
function shallowMatch(doc, q) {
  return Object.entries(q).every(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(doc[k]);
      if ('$nin' in v) return !v.$nin.includes(doc[k]);
      if ('$gte' in v || '$lte' in v) {
        const val = doc[k];
        if (val == null) return false;
        if (v.$gte != null && val < v.$gte) return false;
        if (v.$lte != null && val > v.$lte) return false;
        return true;
      }
    }
    return doc[k] === v;
  });
}

function makeApp() {
  const Beneficiary = counter([
    { admissionStatus: 'active', branchId: 'br-1' },
    { admissionStatus: 'active', branchId: 'br-1' },
    { admissionStatus: 'active', branchId: 'br-2' },
  ]);
  const Employee = counter([
    { status: 'active', branchId: 'br-1' },
    { status: 'active', branchId: 'br-2' },
  ]);
  const Invoice = counter([
    { status: 'paid', branchId: 'br-1', total: 1000, paidAt: new Date() },
    { status: 'issued', branchId: 'br-1', outstandingAmount: 500 },
  ]);

  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', buildRouter({ models: { Beneficiary, Employee, Invoice } }));
  return app;
}

describe('GET /api/dashboard/kpi-definitions', () => {
  test('returns all KPIs with hasComputer flag', async () => {
    const res = await request(makeApp()).get('/api/dashboard/kpi-definitions');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(50);
    const activeB = res.body.find(d => d.id === 'active-beneficiaries');
    expect(activeB.hasComputer).toBe(true);
    const noShow = res.body.find(d => d.id === 'no-show-rate');
    // Depends on whether Session model is injected; we did not inject it here.
    expect(noShow.hasComputer).toBe(true);
  });
});

describe('GET /api/dashboard/kpi/:id', () => {
  test('returns computed value', async () => {
    const res = await request(makeApp()).get(
      '/api/dashboard/kpi/active-beneficiaries?branchId=br-1'
    );
    expect(res.status).toBe(200);
    expect(res.body.value).toBe(2);
    expect(res.body.definition.id).toBe('active-beneficiaries');
  });

  test('500 when computer throws', async () => {
    const app = express();
    app.use(
      '/api/dashboard',
      buildRouter({
        models: {
          Beneficiary: {
            countDocuments: () => {
              throw new Error('db down');
            },
          },
        },
      })
    );
    const res = await request(app).get('/api/dashboard/kpi/active-beneficiaries');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('db down');
  });
});

describe('GET /api/dashboard/kpi', () => {
  test('rejects invalid category', async () => {
    const res = await request(makeApp()).get('/api/dashboard/kpi?category=nope');
    expect(res.status).toBe(400);
  });

  test('returns results for financial category', async () => {
    const res = await request(makeApp()).get('/api/dashboard/kpi?category=financial&branchId=br-1');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.results[0].definition.category).toBe('financial');
  });
});

describe('GET /api/dashboard/executive-snapshot', () => {
  test('returns KPIs grouped by category', async () => {
    const res = await request(makeApp()).get('/api/dashboard/executive-snapshot?branchId=br-1');
    expect(res.status).toBe(200);
    expect(res.body.byCategory).toBeDefined();
    expect(res.body.period.from).toBeDefined();
    expect(res.body.byCategory.clinical).toBeDefined();
    const active = res.body.byCategory.clinical.find(k => k.id === 'active-beneficiaries');
    expect(active.value).toBe(2);
    expect(active.nameAr).toBe('عدد المستفيدين النشطين');
  });
});
