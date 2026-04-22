/**
 * reporting-recipient-resolver.test.js — Phase 10 Commit 2.
 *
 * Exercises the resolver against in-memory model fakes. Production
 * plugs in Mongoose model proxies with the same method surface.
 */

'use strict';

const {
  createRecipientResolver,
  parseScope,
  toRecipient,
} = require('../services/reporting/recipientResolver');

describe('parseScope', () => {
  test('parses type:id triples', () => {
    expect(parseScope('beneficiary:507f1f77bcf86cd799439011')).toEqual({
      type: 'beneficiary',
      id: '507f1f77bcf86cd799439011',
    });
    expect(parseScope('branch:b1')).toEqual({ type: 'branch', id: 'b1' });
    expect(parseScope('malformed')).toBeNull();
    expect(parseScope(null)).toBeNull();
    expect(parseScope('')).toBeNull();
  });
});

describe('toRecipient', () => {
  test('extracts channel fields with locale fallback to ar', () => {
    const r = toRecipient(
      {
        _id: 'u1',
        email: 'a@x.sa',
        phone: '+966500000001',
      },
      'guardian',
      'Guardian'
    );
    expect(r).toEqual({
      id: 'u1',
      recipientModel: 'Guardian',
      email: 'a@x.sa',
      phone: '+966500000001',
      locale: 'ar',
      branchId: undefined,
      preferredChannels: undefined,
      role: 'guardian',
    });
  });

  test('returns null for falsy doc', () => {
    expect(toRecipient(null, 'guardian', 'Guardian')).toBeNull();
  });
});

describe('resolve — audiences that need scope', () => {
  test('guardian resolves primary guardians of the beneficiary', async () => {
    const Guardian = {
      find: jest.fn(async () => [
        { _id: 'g1', email: 'p1@x.sa', beneficiaryId: 'b1', preferredLocale: 'ar' },
        { _id: 'g2', email: 'p2@x.sa', beneficiaryId: 'b1', preferredLocale: 'en' },
      ]),
    };
    const resolver = createRecipientResolver({ GuardianModel: { model: Guardian } });
    const out = await resolver.resolve('guardian', 'beneficiary:b1');
    expect(out.length).toBe(2);
    expect(out[0].role).toBe('guardian');
    expect(out.map(r => r.locale)).toEqual(['ar', 'en']);
  });

  test('therapist uses Session.distinct to find teaching staff', async () => {
    const Session = { distinct: jest.fn(async () => ['t1', 't2']) };
    const User = {
      find: jest.fn(async () => [
        { _id: 't1', email: 't1@x.sa' },
        { _id: 't2', email: 't2@x.sa' },
      ]),
    };
    const resolver = createRecipientResolver({
      UserModel: { model: User },
      SessionModel: { model: Session },
    });
    const out = await resolver.resolve('therapist', 'beneficiary:b1');
    expect(out.length).toBe(2);
    expect(Session.distinct).toHaveBeenCalled();
  });

  test('beneficiary-scoped audiences return [] when scope missing', async () => {
    const resolver = createRecipientResolver({
      GuardianModel: { model: { find: jest.fn() } },
    });
    const out = await resolver.resolve('guardian'); // no scopeKey
    expect(out).toEqual([]);
  });
});

describe('resolve — role-based audiences', () => {
  test('supervisor/branch_manager filter by branch when given', async () => {
    const User = {
      find: jest.fn(async q => {
        expect(q.role.$in).toEqual(['supervisor']);
        expect(q.branchId).toBe('b1');
        return [{ _id: 's1', email: 's1@x.sa', branchId: 'b1' }];
      }),
    };
    const resolver = createRecipientResolver({ UserModel: { model: User } });
    const out = await resolver.resolve('supervisor', 'branch:b1');
    expect(out.length).toBe(1);
    expect(out[0].role).toBe('supervisor');
  });

  test('executive is tenant-wide (ignores scope)', async () => {
    const User = {
      find: jest.fn(async q => {
        expect(q.role.$in.length).toBeGreaterThan(1);
        expect(q.branchId).toBeUndefined();
        return [{ _id: 'ceo1', email: 'ceo@x.sa' }];
      }),
    };
    const resolver = createRecipientResolver({ UserModel: { model: User } });
    const out = await resolver.resolve('executive', 'branch:b1');
    expect(out.length).toBe(1);
  });

  test('unknown audience yields empty list', async () => {
    const resolver = createRecipientResolver({
      UserModel: { model: { find: jest.fn() } },
    });
    const out = await resolver.resolve('space_aliens', null);
    expect(out).toEqual([]);
  });

  test('resolver swallows model errors', async () => {
    const User = {
      find: jest.fn(async () => {
        throw new Error('mongo down');
      }),
    };
    const resolver = createRecipientResolver({ UserModel: { model: User } });
    const out = await resolver.resolve('executive');
    expect(out).toEqual([]);
  });
});
