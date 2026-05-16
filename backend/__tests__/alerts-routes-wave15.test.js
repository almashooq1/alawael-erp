/**
 * alerts-routes-wave15.test.js — Wave 15.
 *
 * Verifies the HTTP surface for the Alert & Priority Engine:
 *
 *   1. Workflow routes (ack/assign/snooze/mute/resolve/comments/
 *      timeline) translate WorkflowService results into HTTP
 *      statuses per the documented mapping.
 *   2. Mute is gated to branch_manager+ (403 otherwise).
 *   3. Dashboard routes apply the right filter + role gate +
 *      PII masking per surface.
 *   4. Invalid bodies don't crash — they return 400 with a reason.
 *
 * No Mongo, no real auth — fake workflow service + fake AlertModel
 * + a stub `req.user` middleware.
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { createAlertsWorkflowRouter } = require('../routes/alerts-workflow.routes');
const { createAlertsDashboardRouter, ROLE_GATES } = require('../routes/alerts-dashboard.routes');

// ─── Fake services + models ──────────────────────────────────────
function makeWorkflow(overrides = {}) {
  const calls = {};
  const methods = [
    'acknowledgeAlert',
    'assignAlert',
    'snoozeAlert',
    'muteAlert',
    'resolveAlertManually',
    'commentAlert',
  ];
  for (const m of methods) {
    calls[m] = [];
  }
  return {
    _calls: calls,
    acknowledgeAlert:
      overrides.acknowledgeAlert ??
      (async args => {
        calls.acknowledgeAlert.push(args);
        return { ok: true, alert: { _id: args.alertId } };
      }),
    assignAlert:
      overrides.assignAlert ??
      (async args => {
        calls.assignAlert.push(args);
        return { ok: true, alert: { _id: args.alertId } };
      }),
    snoozeAlert:
      overrides.snoozeAlert ??
      (async args => {
        calls.snoozeAlert.push(args);
        return { ok: true, alert: { _id: args.alertId } };
      }),
    muteAlert:
      overrides.muteAlert ??
      (async args => {
        calls.muteAlert.push(args);
        return { ok: true, alert: { _id: args.alertId } };
      }),
    resolveAlertManually:
      overrides.resolveAlertManually ??
      (async args => {
        calls.resolveAlertManually.push(args);
        return { ok: true, alert: { _id: args.alertId } };
      }),
    commentAlert:
      overrides.commentAlert ??
      (async args => {
        calls.commentAlert.push(args);
        return { ok: true, alert: { _id: args.alertId } };
      }),
  };
}

function mountWorkflow({
  workflow,
  user = { id: 'u-1', role: 'branch_manager' },
  alertModel = null,
}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/v1/alerts', createAlertsWorkflowRouter({ workflow, alertModel }));
  return app;
}

function mountDashboard({ user, modelData = [] }) {
  // Stub the AlertModel.find chain. We don't care about the actual
  // filter contents in these tests — those are covered by
  // alert-filters-wave14.test.js. What we DO care about is whether
  // the route gates and PII masking work end-to-end.
  jest.resetModules();
  jest.doMock('../alerts/alert.model', () => ({
    model: {
      find: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(modelData),
            }),
          }),
        }),
      }),
    },
  }));
  const dash = require('../routes/alerts-dashboard.routes');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/v1/alerts/dashboard', dash.createAlertsDashboardRouter());
  return app;
}

// ─── Workflow routes — happy paths ───────────────────────────────
describe('alerts-workflow routes', () => {
  test('POST /:id/acknowledge → 200 + workflow.ack called', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow });
    const res = await request(app).post('/api/v1/alerts/a-1/acknowledge').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(workflow._calls.acknowledgeAlert).toHaveLength(1);
    expect(workflow._calls.acknowledgeAlert[0].alertId).toBe('a-1');
    expect(workflow._calls.acknowledgeAlert[0].actor.userId).toBe('u-1');
  });

  test('POST /:id/assign passes assigneeUserId through', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow });
    const res = await request(app)
      .post('/api/v1/alerts/a-1/assign')
      .send({ assigneeUserId: 'u-9' });
    expect(res.status).toBe(200);
    expect(workflow._calls.assignAlert[0]).toMatchObject({
      alertId: 'a-1',
      assigneeUserId: 'u-9',
    });
  });

  test('POST /:id/snooze accepts numeric minutes', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow });
    const res = await request(app)
      .post('/api/v1/alerts/a-1/snooze')
      .send({ minutes: 60, reason: 'lunch' });
    expect(res.status).toBe(200);
    expect(workflow._calls.snoozeAlert[0]).toMatchObject({ minutes: 60, reason: 'lunch' });
  });

  test('POST /:id/snooze coerces string minutes to number', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow });
    const res = await request(app).post('/api/v1/alerts/a-1/snooze').send({ minutes: '30' });
    expect(res.status).toBe(200);
    expect(workflow._calls.snoozeAlert[0].minutes).toBe(30);
  });

  test('POST /:id/mute is allowed for branch_manager', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow, user: { id: 'u', role: 'branch_manager' } });
    const res = await request(app)
      .post('/api/v1/alerts/a-1/mute')
      .send({ hours: 24, reason: 'duplicate of jira PROD-1234' });
    expect(res.status).toBe(200);
    expect(workflow._calls.muteAlert).toHaveLength(1);
  });

  test('POST /:id/mute is FORBIDDEN for therapist', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow, user: { id: 'u', role: 'therapist' } });
    const res = await request(app)
      .post('/api/v1/alerts/a-1/mute')
      .send({ hours: 24, reason: 'long enough' });
    expect(res.status).toBe(403);
    expect(workflow._calls.muteAlert).toHaveLength(0);
  });

  test('POST /:id/resolve passes note', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow });
    const res = await request(app)
      .post('/api/v1/alerts/a-1/resolve')
      .send({ note: 'fixed via SCFHS portal' });
    expect(res.status).toBe(200);
    expect(workflow._calls.resolveAlertManually[0].note).toContain('SCFHS');
  });

  test('POST /:id/comments passes text', async () => {
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow });
    const res = await request(app)
      .post('/api/v1/alerts/a-1/comments')
      .send({ text: 'تواصلت مع المسؤول' });
    expect(res.status).toBe(200);
    expect(workflow._calls.commentAlert[0].text).toContain('المسؤول');
  });
});

// ─── Workflow routes — error mapping ─────────────────────────────
describe('alerts-workflow routes — error mapping', () => {
  test('NOT_FOUND → 404', async () => {
    const workflow = makeWorkflow({
      acknowledgeAlert: async () => ({ ok: false, reason: 'NOT_FOUND' }),
    });
    const app = mountWorkflow({ workflow });
    const res = await request(app).post('/api/v1/alerts/missing/acknowledge').send({});
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('NOT_FOUND');
  });

  test('ALREADY_RESOLVED → 409', async () => {
    const workflow = makeWorkflow({
      assignAlert: async () => ({ ok: false, reason: 'ALREADY_RESOLVED' }),
    });
    const app = mountWorkflow({ workflow });
    const res = await request(app).post('/api/v1/alerts/a/assign').send({ assigneeUserId: 'u' });
    expect(res.status).toBe(409);
  });

  test('ASSIGNEE_REQUIRED → 400', async () => {
    const workflow = makeWorkflow({
      assignAlert: async () => ({ ok: false, reason: 'ASSIGNEE_REQUIRED' }),
    });
    const app = mountWorkflow({ workflow });
    const res = await request(app).post('/api/v1/alerts/a/assign').send({});
    expect(res.status).toBe(400);
  });

  test('COMMENT_TEXT_TOO_LONG → 413', async () => {
    const workflow = makeWorkflow({
      commentAlert: async () => ({ ok: false, reason: 'COMMENT_TEXT_TOO_LONG' }),
    });
    const app = mountWorkflow({ workflow });
    const res = await request(app).post('/api/v1/alerts/a/comments').send({ text: 'x' });
    expect(res.status).toBe(413);
  });

  test('INVALID_SNOOZE_DURATION → 400', async () => {
    const workflow = makeWorkflow({
      snoozeAlert: async () => ({ ok: false, reason: 'INVALID_SNOOZE_DURATION' }),
    });
    const app = mountWorkflow({ workflow });
    const res = await request(app).post('/api/v1/alerts/a/snooze').send({ minutes: 0 });
    expect(res.status).toBe(400);
  });
});

// ─── Workflow routes — defensive ─────────────────────────────────
describe('alerts-workflow routes — defensive', () => {
  test('throws if workflow service is missing', () => {
    expect(() => createAlertsWorkflowRouter({})).toThrow();
  });

  test('GET /:id/timeline returns 404 for missing alert', async () => {
    const fakeModel = { model: { findById: () => ({ lean: () => Promise.resolve(null) }) } };
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow, alertModel: fakeModel });
    const res = await request(app).get('/api/v1/alerts/missing/timeline');
    expect(res.status).toBe(404);
  });

  test('GET /:id/timeline merges + sorts events DESC', async () => {
    const fakeAlert = {
      _id: 'a-1',
      ruleId: 'r',
      state: {
        current: 'ACKNOWLEDGED',
        transitions: [
          { from: 'OPEN', to: 'ACKNOWLEDGED', at: new Date('2026-05-16T08:00:00Z'), byRole: 'mgr' },
        ],
      },
      escalation: { currentTier: 1 },
      comments: [
        { byUserId: 'u', byRole: 'mgr', text: 'hi', at: new Date('2026-05-16T09:00:00Z') },
      ],
      reopens: [
        {
          reopenedAt: new Date('2026-05-16T07:00:00Z'),
          previousResolvedAt: new Date('2026-05-15T18:00:00Z'),
          reason: 'engine_redetected',
        },
      ],
    };
    const fakeModel = { model: { findById: () => ({ lean: () => Promise.resolve(fakeAlert) }) } };
    const workflow = makeWorkflow();
    const app = mountWorkflow({ workflow, alertModel: fakeModel });
    const res = await request(app).get('/api/v1/alerts/a-1/timeline');
    expect(res.status).toBe(200);
    expect(res.body.data.events).toHaveLength(3);
    // Sorted DESC by `at`: comment (09:00) → transition (08:00) → reopen (07:00)
    expect(res.body.data.events[0].kind).toBe('comment');
    expect(res.body.data.events[1].kind).toBe('state_transition');
    expect(res.body.data.events[2].kind).toBe('reopen');
    expect(res.body.data.currentState).toBe('ACKNOWLEDGED');
  });
});

// ─── Dashboard routes — role gates ───────────────────────────────
describe('alerts-dashboard routes — role gates', () => {
  test('/executive — ceo allowed, therapist forbidden', async () => {
    const ceoApp = mountDashboard({ user: { role: 'ceo' }, modelData: [] });
    const r1 = await request(ceoApp).get('/api/v1/alerts/dashboard/executive');
    expect(r1.status).toBe(200);

    const therapistApp = mountDashboard({ user: { role: 'therapist' }, modelData: [] });
    const r2 = await request(therapistApp).get('/api/v1/alerts/dashboard/executive');
    expect(r2.status).toBe(403);
    expect(r2.body.surface).toBe('executive');
  });

  test('/clinical — clinical_director allowed, accountant forbidden', async () => {
    const dirApp = mountDashboard({ user: { role: 'clinical_director' }, modelData: [] });
    const r1 = await request(dirApp).get('/api/v1/alerts/dashboard/clinical');
    expect(r1.status).toBe(200);

    const acctApp = mountDashboard({ user: { role: 'accountant' }, modelData: [] });
    const r2 = await request(acctApp).get('/api/v1/alerts/dashboard/clinical');
    expect(r2.status).toBe(403);
  });

  test('/dpo — only dpo + super_admin pass', async () => {
    const dpoApp = mountDashboard({ user: { role: 'dpo' }, modelData: [] });
    expect((await request(dpoApp).get('/api/v1/alerts/dashboard/dpo')).status).toBe(200);

    const sAdminApp = mountDashboard({ user: { role: 'super_admin' }, modelData: [] });
    expect((await request(sAdminApp).get('/api/v1/alerts/dashboard/dpo')).status).toBe(200);

    const mgrApp = mountDashboard({ user: { role: 'branch_manager' }, modelData: [] });
    expect((await request(mgrApp).get('/api/v1/alerts/dashboard/dpo')).status).toBe(403);
  });

  test('/branch — anyone authenticated reaches the filter', async () => {
    const therapistApp = mountDashboard({ user: { role: 'therapist' }, modelData: [] });
    const r = await request(therapistApp).get('/api/v1/alerts/dashboard/branch');
    expect(r.status).toBe(200);
  });

  test('/me — anyone authenticated reaches the filter', async () => {
    const therapistApp = mountDashboard({ user: { id: 'u-1', role: 'therapist' }, modelData: [] });
    const r = await request(therapistApp).get('/api/v1/alerts/dashboard/me');
    expect(r.status).toBe(200);
  });
});

// ─── Dashboard routes — masking + envelope ───────────────────────
describe('alerts-dashboard routes — masking + envelope', () => {
  test('executive viewer receives masked items (no subject.id)', async () => {
    const items = [
      {
        _id: 'a-1',
        ruleId: 'r',
        severity: 'critical',
        message: 'msg',
        subject: { type: { type: 'Beneficiary' }, id: 'b-1' },
        ownership: { assignedTo: 'u-x' },
      },
    ];
    const app = mountDashboard({ user: { role: 'ceo' }, modelData: items });
    const res = await request(app).get('/api/v1/alerts/dashboard/executive');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.items[0].subject.id).toBeUndefined();
    expect(res.body.items[0].subject.type.type).toBe('Beneficiary');
    expect(res.body.items[0].ownership.assignedTo).toBeUndefined();
    expect(res.body.meta.viewerRole).toBe('ceo');
    expect(res.body.meta.surface).toBe('executive');
  });

  test('branch_manager sees subject.id (no masking applied at their level)', async () => {
    const items = [
      {
        _id: 'a-1',
        ruleId: 'r',
        severity: 'high',
        message: 'msg',
        subject: { type: { type: 'Employee' }, id: 'e-1' },
        ownership: { assignedTo: 'u-x' },
      },
    ];
    const app = mountDashboard({
      user: { role: 'branch_manager', activeBranchId: 'b-1' },
      modelData: items,
    });
    const res = await request(app).get('/api/v1/alerts/dashboard/branch');
    expect(res.status).toBe(200);
    expect(res.body.items[0].subject.id).toBe('e-1');
    expect(res.body.items[0].ownership.assignedTo).toBe('u-x');
  });

  test('limit/skip query params are honored (within bounds)', async () => {
    const app = mountDashboard({ user: { role: 'ceo' }, modelData: [] });
    const res = await request(app).get('/api/v1/alerts/dashboard/executive?limit=10&skip=5');
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(10);
    expect(res.body.meta.skip).toBe(5);
  });

  test('limit caps at 200 (defensive)', async () => {
    const app = mountDashboard({ user: { role: 'ceo' }, modelData: [] });
    const res = await request(app).get('/api/v1/alerts/dashboard/executive?limit=99999');
    expect(res.body.meta.limit).toBe(200);
  });
});

// ─── ROLE_GATES export — covers the surface ──────────────────────
describe('ROLE_GATES exposure', () => {
  test('every documented role gate is present', () => {
    expect(ROLE_GATES.EXECUTIVE_ROLES.has('ceo')).toBe(true);
    expect(ROLE_GATES.CLINICAL_ROLES.has('therapist')).toBe(true);
    expect(ROLE_GATES.HR_ROLES.has('hr_manager')).toBe(true);
    expect(ROLE_GATES.FINANCE_ROLES.has('accountant')).toBe(true);
    expect(ROLE_GATES.QUALITY_ROLES.has('quality_coordinator')).toBe(true);
    expect(ROLE_GATES.DPO_ROLES.has('dpo')).toBe(true);
  });
});
