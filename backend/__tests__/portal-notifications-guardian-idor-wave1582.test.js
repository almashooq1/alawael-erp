'use strict';

/**
 * portal-notifications-guardian-idor-wave1582.test.js — W1582
 *
 * routes/portalNotifications.routes.js is mounted with only requireAuth, which admits BOTH
 * staff tokens AND guardian tokens (guardian JWTs carry role:'guardian' + guardianId=
 * String(guardian._id); see parent-portal-v1.routes.js). PortalNotification is keyed on
 * `guardianId` and has NO branch field, so branchFilter(req) is a phantom no-op. The
 * guardianId-keyed routes (/guardian/:id[/unread|/urgent], /stats, POST /mark-all-read)
 * therefore let a guardian enumerate ANY other guardian's portal notifications (beneficiary
 * PII) — a horizontal IDOR. W1582 adds guardianOwnershipGuard: a guardian may act ONLY on
 * its own guardianId; staff / internal roles are left unchanged.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  // Guardians are not branch-restricted principals; requireBranchAccess is a pass-through
  // here and branchFilter is a phantom no-op (PortalNotification has no branch field).
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = null;
    next();
  },
  branchFilter: () => ({}),
}));

const GA = new mongoose.Types.ObjectId(); // guardian A id
const GB = new mongoose.Types.ObjectId(); // guardian B id

const asGuardianA = () => ({
  u: { _id: new mongoose.Types.ObjectId(), id: String(GA), role: 'guardian', guardianId: String(GA) },
});
const asStaff = () => ({
  u: { _id: new mongoose.Types.ObjectId(), id: 'staff-1', role: 'admin' },
});

let mongod;
let app;
let PortalNotification;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1582-portal-notif' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  PortalNotification = require('../models/PortalNotification');
  app = express();
  app.use(express.json());
  app.use('/api/portal-notifications', require('../routes/portalNotifications.routes'));

  const seed = (guardianId, priority) =>
    PortalNotification.collection.insertOne({
      guardianId,
      beneficiaryId: new mongoose.Types.ObjectId(),
      type: 'alert',
      priority,
      title_ar: 'ع',
      title_en: 'x',
      message_ar: 'ر',
      message_en: 'm',
      isRead: false,
      isArchived: false,
      status: 'sent',
      createdAt: new Date(),
    });
  await seed(GA, 'urgent');
  await seed(GB, 'urgent');
});

beforeEach(() => {
  mockUser.u = asGuardianA().u;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/portal-notifications';

describe('W1582 — portal-notifications guardian IDOR', () => {
  it('GET /guardian/:id — guardian A 403s on guardian B notifications', async () => {
    const r = await request(app).get(`${base}/guardian/${GB}`);
    expect(r.status).toBe(403);
  });

  it('GET /guardian/:id — guardian A reads its OWN notifications', async () => {
    const r = await request(app).get(`${base}/guardian/${GA}`);
    expect(r.status).toBe(200);
    expect(r.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /guardian/:id — staff may read any guardian (unchanged)', async () => {
    mockUser.u = asStaff().u;
    const r = await request(app).get(`${base}/guardian/${GB}`);
    expect(r.status).toBe(200);
  });

  it('GET /guardian/:id/unread — guardian A 403s on B, 200s on own', async () => {
    expect((await request(app).get(`${base}/guardian/${GB}/unread`)).status).toBe(403);
    expect((await request(app).get(`${base}/guardian/${GA}/unread`)).status).toBe(200);
  });

  it('GET /guardian/:id/urgent — guardian A 403s on B', async () => {
    const r = await request(app).get(`${base}/guardian/${GB}/urgent`);
    expect(r.status).toBe(403);
  });

  it('GET /stats — guardian A 403s on B (query guardianId), 200s on own', async () => {
    expect((await request(app).get(`${base}/stats?guardianId=${GB}`)).status).toBe(403);
    expect((await request(app).get(`${base}/stats?guardianId=${GA}`)).status).toBe(200);
  });

  it('POST /mark-all-read — guardian A 403s on B (body guardianId), 200s on own', async () => {
    expect((await request(app).post(`${base}/mark-all-read`).send({ guardianId: String(GB) })).status).toBe(403);
    const own = await request(app).post(`${base}/mark-all-read`).send({ guardianId: String(GA) });
    expect(own.status).toBe(200);
  });

  it('static: guardianOwnershipGuard defined + applied to the 5 guardianId-keyed routes', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'portalNotifications.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/const guardianOwnershipGuard = \(req, res, next\) =>/);
    expect((src.match(/guardianOwnershipGuard/g) || []).length).toBeGreaterThanOrEqual(6); // 1 def + 5 uses
  });
});
