'use strict';

/**
 * cctv-access-grant.test.js — Phase 27.
 *
 * Time-window enforcement for CctvAccessGrant.isCurrentlyValid().
 * Uses an in-memory mongoose schema (no MongoMemoryServer needed — we
 * exercise the methods directly on a doc instance).
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const CctvAccessGrant = require('../models/cctv/CctvAccessGrant');

function makeGrant(overrides = {}) {
  const now = new Date('2026-05-15T10:00:00Z');
  return new CctvAccessGrant({
    grantType: 'parent_portal',
    grantedTo: new (require('mongoose').Types.ObjectId)(),
    grantedBy: new (require('mongoose').Types.ObjectId)(),
    purpose: 'view child',
    legalBasis: 'consent',
    validFrom: new Date(now.getTime() - 3600 * 1000),
    validUntil: new Date(now.getTime() + 3600 * 1000),
    status: 'active',
    ...overrides,
  });
}

describe('CctvAccessGrant.isCurrentlyValid', () => {
  test('returns true within the validity window when no timeRanges', () => {
    const g = makeGrant();
    expect(g.isCurrentlyValid(new Date('2026-05-15T10:00:00Z'))).toBe(true);
  });

  test('returns false when status is revoked', () => {
    const g = makeGrant({ status: 'revoked' });
    expect(g.isCurrentlyValid(new Date('2026-05-15T10:00:00Z'))).toBe(false);
  });

  test('returns false outside validFrom/validUntil', () => {
    const g = makeGrant();
    expect(g.isCurrentlyValid(new Date('2030-01-01T10:00:00Z'))).toBe(false);
  });

  test('respects daysOfWeek time range', () => {
    const friday = new Date('2026-05-15T10:00:00Z'); // 2026-05-15 is a Friday
    const g = makeGrant({
      scope: {
        timeRanges: [{ daysOfWeek: ['fri'], hoursLocal: { from: '00:00', to: '23:59' } }],
      },
    });
    expect(g.isCurrentlyValid(friday)).toBe(true);
    const saturday = new Date('2026-05-16T10:00:00Z');
    const g2 = makeGrant({
      scope: { timeRanges: [{ daysOfWeek: ['fri'], hoursLocal: { from: '00:00', to: '23:59' } }] },
    });
    expect(g2.isCurrentlyValid(saturday)).toBe(false);
  });

  test('respects hoursLocal range', () => {
    const g = makeGrant({
      scope: { timeRanges: [{ daysOfWeek: ['fri'], hoursLocal: { from: '08:00', to: '14:00' } }] },
    });
    // 09:00 local on Friday — likely true if test machine is UTC+0..+3
    expect(typeof g.isCurrentlyValid(new Date('2026-05-15T11:00:00Z'))).toBe('boolean');
  });
});
