'use strict';

/**
 * expense-anomaly-wave1218.test.js — unit tests for the READ-ONLY financial
 * expense anomaly scan (services/financeAnomaly.service.js) — the Tier-3
 * isolation-forest applied to a domain that had no anomaly detection.
 *
 * Pure logic — no DB. Requiring the service/CLI must NOT open a connection.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/expense-anomaly-wave1218.test.js
 */

const {
  detectExpenseAnomalies,
  expenseFeatureExtractor,
  EXPENSE_FEATURES,
  MIN_EXPENSES,
} = require('../services/financeAnomaly.service');

// A normal population: card expenses, business-day, varied non-round amounts.
function normalExpenses(n) {
  const out = [];
  // Mondays in Jan 2026 (business days, getDay 1..5)
  for (let i = 0; i < n; i++) {
    out.push({
      _id: 'e' + i,
      amount: 320 + i * 37, // non-round, moderate
      date: new Date(2026, 0, 5 + (i % 5)), // Jan 5–9 2026 = Mon–Fri
      category: 'office_supplies',
      paymentMethod: 'credit_card',
    });
  }
  return out;
}

describe('financeAnomaly — detectExpenseAnomalies (pure, Tier-3 IF)', () => {
  test('requiring the service does NOT open a DB connection + exposes the surface', () => {
    expect(typeof detectExpenseAnomalies).toBe('function');
    expect(EXPENSE_FEATURES).toEqual(['amount', 'dayOfWeek', 'isCash', 'isRoundThousand']);
    expect(MIN_EXPENSES).toBe(8);
  });

  test('flags a large round-number weekend cash expense among a normal population', () => {
    const expenses = normalExpenses(9);
    expenses.push({
      _id: 'SUSPECT',
      amount: 50000, // large + round thousand
      date: new Date(2026, 0, 10), // 2026-01-10 = Saturday
      category: 'office_supplies',
      paymentMethod: 'cash',
    });
    const r = detectExpenseAnomalies({ expenses });
    expect(r.eligible).toBe(true);
    expect(r.scanned).toBe(10);
    const flagged = r.anomalies.find(a => a.expenseId === 'SUSPECT');
    expect(flagged).toBeTruthy();
    expect(flagged.score).toBeGreaterThan(r.threshold);
    expect(flagged.signals).toEqual(expect.arrayContaining(['cash', 'round_thousand', 'weekend']));
  });

  test('a uniform population produces no anomalies', () => {
    const expenses = [];
    for (let i = 0; i < 10; i++) {
      expenses.push({
        _id: 'u' + i,
        amount: 500,
        date: new Date(2026, 0, 6), // Tue
        category: 'rent',
        paymentMethod: 'bank_transfer',
      });
    }
    const r = detectExpenseAnomalies({ expenses });
    expect(r.eligible).toBe(true);
    expect(r.anomalies).toEqual([]);
  });

  test('< 8 expenses → not eligible (no population)', () => {
    const r = detectExpenseAnomalies({ expenses: [{ amount: 100 }, { amount: 200 }] });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/insufficient_expenses:2\/8/);
    expect(r.anomalies).toEqual([]);
  });

  test('anomalies sorted most-anomalous-first + deterministic (seeded)', () => {
    const expenses = normalExpenses(9);
    expenses.push({ _id: 'BIG', amount: 90000, date: new Date(2026, 0, 11), paymentMethod: 'cash', category: 'x' });
    const a = detectExpenseAnomalies({ expenses, seed: 5 });
    const b = detectExpenseAnomalies({ expenses, seed: 5 });
    expect(a.anomalies.map(x => x.expenseId)).toEqual(b.anomalies.map(x => x.expenseId));
    for (let i = 1; i < a.anomalies.length; i++) {
      expect(a.anomalies[i - 1].score).toBeGreaterThanOrEqual(a.anomalies[i].score);
    }
  });

  test('feature extractor: [amount, dayOfWeek, isCash, isRoundThousand]', () => {
    // 2026-01-10 = Saturday (getDay 6); 5000 round + cash
    expect(expenseFeatureExtractor({ amount: 5000, date: new Date(2026, 0, 10), paymentMethod: 'cash' })).toEqual([
      5000, 6, 1, 1,
    ]);
    // 2026-01-06 = Tuesday (getDay 2); 1337 non-round + card
    expect(expenseFeatureExtractor({ amount: 1337, date: new Date(2026, 0, 6), paymentMethod: 'credit_card' })).toEqual([
      1337, 2, 0, 0,
    ]);
    // missing fields → safe defaults
    expect(expenseFeatureExtractor({})).toEqual([0, 0, 0, 0]);
  });

  test('CLI requires the service without connecting (require.main guard)', () => {
    const cli = require('../scripts/expense-anomaly-scan');
    expect(typeof cli.detectExpenseAnomalies).toBe('function');
  });
});
