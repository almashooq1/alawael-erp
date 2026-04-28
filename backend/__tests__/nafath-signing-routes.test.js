/**
 * nafath-signing-routes.test.js — route-level coverage for the new
 * `GET /api/v1/nafath/signing` list endpoint (commit c5a5e204).
 *
 * Focus: server-side authorization scoping.
 *   • a non-admin caller can NEVER read another user's signing history
 *     even if they spoof signerUserId / signerNationalId in the query
 *   • an admin caller can see any signer's history (no scoping forced)
 *   • status / documentType / mode / pagination filters reach the
 *     service layer
 *
 * Strategy: stub the underlying defaultService.listSignatures so we can
 * assert exactly what filters arrive — the service-level coverage in
 * `nafath-signing-service.test.js` already exercises the real query
 * shape against a fake model.
 */

'use strict';

const express = require('express');
const request = require('supertest');

// Replace the singleton listSignatures with a spy before requiring the
// route module. The route file does `require('../services/nafathSigningService')`
// at module-load time and pulls `defaultService` from there.
jest.mock('../services/nafathSigningService', () => {
  const calls = [];
  const stub = {
    listSignatures: jest.fn(async filters => {
      calls.push(filters);
      return { total: 0, rows: [] };
    }),
    requestSignature: jest.fn(),
    pollSignature: jest.fn(),
    cancelSignature: jest.fn(),
    verifySignature: jest.fn(),
    buildEvidencePackage: jest.fn(),
  };
  return {
    createService: () => stub,
    defaultService: stub,
    __calls: calls,
  };
});

const nafathServiceMock = require('../services/nafathSigningService');
const router = require('../routes/nafath-signing.routes');

function buildApp(user) {
  const app = express();
  app.use(express.json());
  // Inject the test user so the existing `authenticate` middleware (which
  // accepts pre-set req.user under JEST_WORKER_ID) lets the request pass.
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });
  app.use('/api/v1/nafath/signing', router);
  return app;
}

describe('GET /api/v1/nafath/signing', () => {
  beforeEach(() => {
    nafathServiceMock.defaultService.listSignatures.mockClear();
  });

  it('forces signerUserId from the session for non-admin callers', async () => {
    const app = buildApp({ id: 'user-parent-1', role: 'parent' });
    const res = await request(app)
      .get('/api/v1/nafath/signing')
      // The client tries to spoof another user's history — must be ignored.
      .query({ signerUserId: 'user-other-2' });

    expect(res.status).toBe(200);
    const filters = nafathServiceMock.defaultService.listSignatures.mock.calls.at(-1)[0];
    expect(filters.signerUserId).toBe('user-parent-1');
  });

  it('also ignores spoofed signerNationalId from non-admin callers', async () => {
    const app = buildApp({ id: 'user-guardian-1', role: 'guardian' });
    const res = await request(app)
      .get('/api/v1/nafath/signing')
      .query({ signerNationalId: '1099999999' });

    expect(res.status).toBe(200);
    const filters = nafathServiceMock.defaultService.listSignatures.mock.calls.at(-1)[0];
    expect(filters.signerNationalId).toBeUndefined();
    expect(filters.signerUserId).toBe('user-guardian-1');
  });

  it('allows admins to scope by any signerNationalId', async () => {
    const app = buildApp({ id: 'admin-1', role: 'admin' });
    const res = await request(app)
      .get('/api/v1/nafath/signing')
      .query({ signerNationalId: '1099999999' });

    expect(res.status).toBe(200);
    const filters = nafathServiceMock.defaultService.listSignatures.mock.calls.at(-1)[0];
    expect(filters.signerNationalId).toBe('1099999999');
    // Admin should NOT have signerUserId forced from the session.
    expect(filters.signerUserId).toBeUndefined();
  });

  it('forwards status / documentType / mode / pagination', async () => {
    const app = buildApp({ id: 'admin-1', role: 'admin' });
    await request(app).get('/api/v1/nafath/signing').query({
      status: 'APPROVED',
      documentType: 'IRP',
      mode: 'live',
      limit: '25',
      skip: '50',
    });
    const filters = nafathServiceMock.defaultService.listSignatures.mock.calls.at(-1)[0];
    expect(filters.status).toBe('APPROVED');
    expect(filters.documentType).toBe('IRP');
    expect(filters.mode).toBe('live');
    expect(filters.limit).toBe('25');
    expect(filters.skip).toBe('50');
  });

  it('returns empty result when caller has no id (anonymous-but-authenticated edge case)', async () => {
    // E.g. a service token that survived `authenticate` but has no `id`.
    const app = buildApp({ role: 'parent' });
    const res = await request(app).get('/api/v1/nafath/signing');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { total: 0, rows: [] } });
    // listSignatures shouldn't even be called — no user id to scope by.
    expect(nafathServiceMock.defaultService.listSignatures).not.toHaveBeenCalled();
  });

  it('returns the service result envelope on the wire', async () => {
    nafathServiceMock.defaultService.listSignatures.mockResolvedValueOnce({
      total: 2,
      rows: [
        { requestId: 'r1', status: 'APPROVED' },
        { requestId: 'r2', status: 'PENDING' },
      ],
    });
    const app = buildApp({ id: 'admin-1', role: 'admin' });
    const res = await request(app).get('/api/v1/nafath/signing');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.rows).toHaveLength(2);
  });

  it('admin-tier roles include manager + auditor + compliance_officer', async () => {
    const adminTierRoles = ['admin', 'manager', 'auditor', 'compliance_officer'];
    for (const role of adminTierRoles) {
      nafathServiceMock.defaultService.listSignatures.mockClear();
      const app = buildApp({ id: `${role}-id`, role });
      await request(app).get('/api/v1/nafath/signing').query({ signerNationalId: '1099999999' });
      const filters = nafathServiceMock.defaultService.listSignatures.mock.calls.at(-1)[0];
      expect(filters.signerNationalId).toBe('1099999999');
      expect(filters.signerUserId).toBeUndefined();
    }
  });
});
