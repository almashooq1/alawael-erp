'use strict';

const mockDDDAccessPolicy = {};
const mockDDDPermissionMatrix = {};
const mockDDDAccessLog = {};

jest.mock('../../models/DddAccessControl', () => ({
  DDDAccessPolicy: mockDDDAccessPolicy,
  DDDPermissionMatrix: mockDDDPermissionMatrix,
  DDDAccessLog: mockDDDAccessLog,
}));

const svc = require('../../services/dddAccessControl');

describe('dddAccessControl', () => {
  /* ── Exports ── */
  it('exports expected constants as arrays', () => {
    expect(Array.isArray(svc.ABAC_ATTRIBUTES)).toBe(true);
    expect(Array.isArray(svc.ROLES)).toBe(true);
    expect(Array.isArray(svc.DOMAINS)).toBe(true);
    expect(Array.isArray(svc.BUILTIN_ABAC_POLICIES)).toBe(true);
  });

  it('exports all expected functions', () => {
    const fns = [
      'matchesSubject',
      'matchesResource',
      'matchesAction',
      'matchesEnvironment',
      'evaluateAccess',
      'evaluateAccessWithDB',
      'abacMiddleware',
      'getAccessControlDashboard',
    ];
    fns.forEach(fn => expect(typeof svc[fn]).toBe('function'));
  });

  /* ── TODO stubs return undefined ── */
  it('matchesSubject resolves (TODO stub)', async () => {
    await expect(svc.matchesSubject()).resolves.toBeUndefined();
  });
  it('matchesResource resolves (TODO stub)', async () => {
    await expect(svc.matchesResource()).resolves.toBeUndefined();
  });
  it('matchesAction resolves (TODO stub)', async () => {
    await expect(svc.matchesAction()).resolves.toBeUndefined();
  });
  it('matchesEnvironment resolves (TODO stub)', async () => {
    await expect(svc.matchesEnvironment()).resolves.toBeUndefined();
  });
  it('evaluateAccess resolves (TODO stub)', async () => {
    await expect(svc.evaluateAccess()).resolves.toBeUndefined();
  });
  it('evaluateAccessWithDB resolves (TODO stub)', async () => {
    await expect(svc.evaluateAccessWithDB()).resolves.toBeUndefined();
  });

  /* ── abacMiddleware ── */
  it('abacMiddleware calls next()', () => {
    const next = jest.fn();
    svc.abacMiddleware({}, {}, next);
    expect(next).toHaveBeenCalled();
  });

  /* ── getAccessControlDashboard ── */
  it('returns dashboard with service name and status', async () => {
    const r = await svc.getAccessControlDashboard();
    expect(r.service).toBe('AccessControl');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
