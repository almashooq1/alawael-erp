'use strict';

/** sessions-admin-compat-mount.test.js — W1465 Admin Therapy Sessions unification drift guard */

jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const ROOT = path.resolve(__dirname, '..');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    if (!req.headers.authorization) {
      return _res.status(401).json({ success: false, message: 'unauthorized' });
    }
    req.user = { id: 'u1', role: 'therapist', branchId: 'branch-a' };
    next();
  },
  requireRole: () => (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'unauthorized' });
    next();
  },
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, res, next) => next(),
  branchFilter: () => ({}),
}));

jest.mock('../middleware/piiAccess.middleware', () => () => (_req, _res, next) => next());

function source(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('Phase 7 — Admin Therapy Sessions unification compat surface', () => {
  it('compat router file exists and exports an Express router', () => {
    const router = require('../domains/sessions/routes/sessions-admin-compat.routes');
    expect(router).toBeTruthy();
    expect(typeof router.use).toBe('function');
    expect(typeof router.get).toBe('function');
  });

  it('domain mount registers /api/v1/sessions/admin before the generic /:sessionId router', () => {
    const src = source('domains/sessions/index.js');
    const adminIdx = src.indexOf('`/api/v1/${this.name}/admin`');
    const secureIdx = src.indexOf('`/api/v1/${this.name}`');
    expect(adminIdx).toBeGreaterThan(0);
    expect(secureIdx).toBeGreaterThan(adminIdx);
  });

  it('_registry.js no longer mounts the legacy /api/admin/therapy-sessions surface', () => {
    const src = source('routes/_registry.js');
    expect(src).toContain('/api/v1/sessions/admin');
    const activeLine = src
      .split('\n')
      .find(
        l => l.includes("dualMount(app, 'admin/therapy-sessions'") && !l.trim().startsWith('//')
      );
    expect(activeLine).toBeUndefined();
  });

  it('post-deploy smoke probe points at the unified path', () => {
    const src = source('scripts/post-deploy-smoke.js');
    expect(src).toContain("'/api/v1/sessions/admin'");
    expect(src).not.toContain("'/api/admin/therapy-sessions'");
  });

  it('mounted compat router rejects unauthenticated requests with 401', async () => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/sessions/admin',
      require('../domains/sessions/routes/sessions-admin-compat.routes')
    );
    const res = await request(app).get('/api/v1/sessions/admin');
    expect(res.status).toBe(401);
  });
});
