/**
 * coa-bootstrap.test.js — Phase 12 Commit 6.
 *
 * Verifies the default Chart of Accounts bootstrap:
 *   - writes the correct service-compatible field shape
 *   - is idempotent (re-running updates rather than inserts)
 *   - covers every code that the other Phase-12 services reference,
 *     so trial-balance / P&L / cheque postings land on known accounts
 */

'use strict';

const {
  bootstrap,
  listCodes,
  DEFAULT_ACCOUNTS,
} = require('../services/finance/chartOfAccountsBootstrap');

/**
 * In-memory Mongoose-model stand-in. Supports the three methods the
 * bootstrap actually uses: findOne(query).lean(), updateOne(query, {$set}),
 * create(payload).
 */
function fakeCoaModel(initial = []) {
  const store = new Map(initial.map(a => [a.code, { ...a }]));
  return {
    _store: store,
    findOne(q) {
      const doc = store.get(q.code) || null;
      return { lean: async () => (doc ? { ...doc } : null) };
    },
    async updateOne(q, update) {
      const cur = store.get(q.code);
      if (!cur) return { matchedCount: 0, modifiedCount: 0 };
      store.set(q.code, { ...cur, ...(update.$set || {}) });
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async create(payload) {
      store.set(payload.code, { ...payload });
      return { ...payload };
    },
  };
}

describe('chartOfAccountsBootstrap — shape and coverage', () => {
  test('every account has the service-compatible field set', () => {
    for (const a of DEFAULT_ACCOUNTS) {
      expect(a.code).toMatch(/^\d{4}$/);
      expect(typeof a.name_ar).toBe('string');
      expect(['asset', 'liability', 'equity', 'revenue', 'expense']).toContain(a.account_type);
      expect(['debit', 'credit']).toContain(a.normal_balance);
    }
  });

  test('covers every code referenced by other Phase-12 finance services', () => {
    const codes = new Set(listCodes());
    // Codes hard-referenced in FinanceService, chequeService, subsidiaryLedgerService
    const required = [
      '1100',
      '1110',
      '1140',
      '1200',
      '2100',
      '2300',
      '2400',
      '2401',
      '2402',
      '4100',
      '5100',
    ];
    for (const r of required) {
      expect(codes.has(r)).toBe(true);
    }
  });

  test('parent_code references, when set, point to an account in the list', () => {
    const codes = new Set(listCodes());
    for (const a of DEFAULT_ACCOUNTS) {
      if (a.parent_code !== null && a.parent_code !== undefined) {
        expect(codes.has(a.parent_code)).toBe(true);
      }
    }
  });

  test('no duplicate codes', () => {
    const codes = listCodes();
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('chartOfAccountsBootstrap — bootstrap() behaviour', () => {
  test('fresh DB: all rows are inserted', async () => {
    const Model = fakeCoaModel();
    const res = await bootstrap({ ChartOfAccountModel: Model });
    expect(res.inserted).toBe(DEFAULT_ACCOUNTS.length);
    expect(res.updated).toBe(0);
    expect(res.total).toBe(DEFAULT_ACCOUNTS.length);
  });

  test('second run on a seeded DB: 0 inserted, N updated (idempotent)', async () => {
    const Model = fakeCoaModel();
    await bootstrap({ ChartOfAccountModel: Model });
    const second = await bootstrap({ ChartOfAccountModel: Model });
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(DEFAULT_ACCOUNTS.length);
  });

  test('existing old-shape docs get upgraded in place to the new field names', async () => {
    // Simulate an account seeded by the older seed (different field names).
    const Model = fakeCoaModel([
      {
        code: '4100',
        type: 'revenue',
        normalBalance: 'credit',
        name: { ar: 'قديم', en: 'Old' },
        isParent: false,
      },
    ]);
    await bootstrap({ ChartOfAccountModel: Model });
    const upgraded = Model._store.get('4100');
    expect(upgraded.account_type).toBe('revenue');
    expect(upgraded.normal_balance).toBe('credit');
    expect(upgraded.name_ar).toBe('إيرادات خدمات التأهيل');
    // Old fields linger but are harmless
    expect(upgraded.type).toBe('revenue');
  });

  test('throws when ChartOfAccountModel is not supplied', async () => {
    await expect(bootstrap({})).rejects.toThrow(/ChartOfAccountModel is required/);
  });

  test('accepts a custom accounts list (for scoped seeding)', async () => {
    const Model = fakeCoaModel();
    const custom = [
      { code: '9999', name_ar: 'تجربة', account_type: 'asset', normal_balance: 'debit' },
    ];
    const res = await bootstrap({ ChartOfAccountModel: Model, accounts: custom });
    expect(res.inserted).toBe(1);
    expect(Model._store.get('9999').name_ar).toBe('تجربة');
  });
});

describe('chartOfAccountsBootstrap — listCodes()', () => {
  test('returns a flat string array of codes', () => {
    const codes = listCodes();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBe(DEFAULT_ACCOUNTS.length);
    expect(codes.every(c => typeof c === 'string')).toBe(true);
  });
});
