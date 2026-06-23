'use strict';

/* eslint-disable no-template-curly-in-string */

/** sessions-therapist-compat-mount.test.js — Phase 8 Therapist Portal unification drift guard */

jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');

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

describe('Phase 8 — Therapist Portal Sessions unification compat surface', () => {
  it('compat router file exists and exports an Express router', () => {
    const router = require('../domains/sessions/routes/sessions-therapist-compat.routes');
    expect(router).toBeTruthy();
    expect(typeof router.use).toBe('function');
    expect(typeof router.get).toBe('function');
  });

  it('domain mount registers /api/v1/sessions/therapist before the generic /:sessionId router', () => {
    const src = source('domains/sessions/index.js');
    const therapistIdx = src.indexOf('`/api/v1/${this.name}/therapist`');
    const secureIdx = src.indexOf(
      'app.use(`/api/${this.name}`, authenticate, requireBranchAccess, secureRouter)'
    );
    expect(therapistIdx).toBeGreaterThan(0);
    expect(secureIdx).toBeGreaterThan(therapistIdx);
  });

  it('compat router wires branchScopedResourceParam for :sessionId', () => {
    const src = source('domains/sessions/routes/sessions-therapist-compat.routes.js');
    expect(src).toContain("'sessionId'");
    expect(src).toContain('branchScopedResourceParam');
    expect(src).toContain("modelName: 'TherapySession'");
  });

  it('compat router exposes therapist schedule + sessions surfaces', () => {
    const src = source('domains/sessions/routes/sessions-therapist-compat.routes.js');
    expect(src).toContain("'/schedule'");
    expect(src).toContain("'/sessions'");
    expect(src).toContain("'/sessions/:sessionId/documentation'");
  });

  it('domain mount applies authenticate + requireBranchAccess to therapist compat surface', () => {
    const src = source('domains/sessions/index.js');
    const therapistLine = src.split('\n').find(l => l.includes('`/api/v1/${this.name}/therapist`'));
    expect(therapistLine).toContain('authenticate');
    expect(therapistLine).toContain('requireBranchAccess');
  });
});
