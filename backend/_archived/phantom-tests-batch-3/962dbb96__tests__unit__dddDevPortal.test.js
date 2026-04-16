'use strict';

jest.mock('../../models/DddDevPortal', () => ({
  DDDChangelog: {},
}));

const svc = require('../../services/dddDevPortal');

describe('dddDevPortal service', () => {
  /* ── Constants ── */
  test('DOMAIN_ENDPOINTS is an array', () => {
    expect(Array.isArray(svc.DOMAIN_ENDPOINTS)).toBe(true);
  });
  test('SDK_TARGETS is an array', () => {
    expect(Array.isArray(svc.SDK_TARGETS)).toBe(true);
  });

  /* ── TODO Functions ── */
  test('generateOpenAPISpec resolves', async () => {
    await expect(svc.generateOpenAPISpec()).resolves.toBeUndefined();
  });
  test('addChangelog resolves', async () => {
    await expect(svc.addChangelog()).resolves.toBeUndefined();
  });
  test('getChangelogs resolves', async () => {
    await expect(svc.getChangelogs()).resolves.toBeUndefined();
  });

  /* ── Dashboard ── */
  test('getDevPortalDashboard returns health object', async () => {
    const d = await svc.getDevPortalDashboard();
    expect(d).toHaveProperty('service', 'DevPortal');
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
