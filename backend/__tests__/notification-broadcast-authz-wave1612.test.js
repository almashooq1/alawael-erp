/**
 * notification-broadcast-authz-wave1612.test.js — W1612
 *
 * notification-enhanced.routes.js exposed the broadcast workflow
 * (POST /broadcasts → /broadcasts/:id/approve → /broadcasts/:id/send) and the
 * notification-template CRUD with `authenticate + requireBranchAccess` but NO
 * role gate. So any authenticated principal could self-approve + send an org-wide
 * broadcast to every recipient, or rewrite notification templates.
 *
 * W1612 gates approve/send + template create/update/delete to management roles
 * (NOTIF_ADMIN_ROLES). Drafting a broadcast stays open (the draft→approve→send
 * workflow). This suite mounts the REAL router (real `authorize`) and asserts a
 * non-management caller is 403'd while a manager passes.
 */

const express = require('express');
const request = require('supertest');

jest.mock('../models/BroadcastMessage', () => ({
  create: jest.fn(async d => ({ _id: 'b1', ...d })),
  findOne: jest.fn(() => ({ select: () => ({ lean: async () => ({ _id: 'b1' }) }) })),
  findOneAndUpdate: jest.fn(async () => ({ _id: 'b1', status: 'approved' })),
  find: jest.fn(() => ({ populate: () => ({ sort: async () => [] }) })),
}), { virtual: true });
jest.mock('../models/NotificationTemplate', () => ({
  create: jest.fn(async d => ({ _id: 't1', ...d })),
  findByIdAndUpdate: jest.fn(async () => ({ _id: 't1' })),
}), { virtual: true });
jest.mock('../services/notifications/notification-enhanced.service', () => ({
  sendBroadcast: jest.fn(async () => ({ sent: 10 })),
  getNotifications: jest.fn(async () => []),
}), { virtual: true });
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => { req.branchScope = { restricted: false }; next(); },
  branchFilter: () => ({}),
}));

const router = require('../routes/notification-enhanced.routes');

function appFor(role) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { _id: 'u1', id: 'u1', role }; next(); });
  app.use('/api/notifications', router);
  return app;
}

const GATED = [
  ['post', '/api/notifications/broadcasts/b1/approve'],
  ['post', '/api/notifications/broadcasts/b1/send'],
  ['post', '/api/notifications/templates'],
  ['put', '/api/notifications/templates/t1'],
  ['delete', '/api/notifications/templates/t1'],
];

describe('W1612 — notification broadcast/template admin actions are role-gated', () => {
  it('403s a non-management caller on every gated action', async () => {
    const app = appFor('therapist');
    for (const [method, url] of GATED) {
      const res = await request(app)[method](url).send({ title: 'x', content: 'y' });
      expect(res.status).toBe(403);
    }
  });

  it('allows a manager to approve + send a broadcast', async () => {
    const app = appFor('manager');
    const approve = await request(app).post('/api/notifications/broadcasts/b1/approve').send({});
    expect(approve.status).toBe(200);
    const send = await request(app).post('/api/notifications/broadcasts/b1/send').send({});
    expect(send.status).toBe(200);
  });

  it('allows a manager to create a template', async () => {
    const res = await request(appFor('admin')).post('/api/notifications/templates').send({ code: 'C', name: 'n' });
    expect(res.status).toBe(201);
  });

  it('keeps broadcast DRAFT creation open (staff can draft)', async () => {
    const res = await request(appFor('therapist')).post('/api/notifications/broadcasts').send({ title: 't' });
    expect(res.status).toBe(201);
  });

  it('source gates approve/send/template-mutations with authorize(NOTIF_ADMIN_ROLES) (static)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'notification-enhanced.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/const NOTIF_ADMIN_ROLES =/);
    expect((src.match(/authorize\(NOTIF_ADMIN_ROLES\)/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
