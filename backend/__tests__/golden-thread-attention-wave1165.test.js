'use strict';

/**
 * golden-thread-attention-wave1165.test.js — pure + source guard for the
 * caseload/branch attention triage (blueprint §4.3 at scale).
 *
 * Covers the pure `summarizeCaseloadAttention()` (ranks beneficiaries by urgency)
 * + asserts the CLI report `scripts/golden-thread-attention.js` is READ-ONLY and
 * require.main-guarded. Paired with the behavioral counterpart
 * `golden-thread-attention-behavioral-wave1165.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/golden-thread-attention-wave1165.test.js
 */

const fs = require('fs');
const path = require('path');
const { summarizeCaseloadAttention } = require('../services/goldenThread.service');

const trace = (beneficiaryId, actions) => ({ beneficiaryId, nextActions: actions });
const act = priority => ({ priority, code: `C${priority}`, action: `a${priority}`, goalId: 'g' });

describe('golden-thread (W1165) — summarizeCaseloadAttention (pure)', () => {
  test('exported without opening a DB connection', () => {
    expect(typeof summarizeCaseloadAttention).toBe('function');
  });

  test('includes only beneficiaries that NEED attention', () => {
    const { rows } = summarizeCaseloadAttention([
      trace('a', [act(1)]),
      trace('b', []), // on-track — excluded
      trace('c', [act(3)]),
    ]);
    expect(rows.map(r => r.beneficiaryId).sort()).toEqual(['a', 'c']);
  });

  test('ranks most-urgent first (lowest top priority), then by attentionCount', () => {
    const { rows } = summarizeCaseloadAttention([
      trace('low', [act(3)]),
      trace('urgent', [act(1)]),
      trace('mid-many', [act(2), act(3)]),
      trace('mid-one', [act(2)]),
    ]);
    expect(rows.map(r => r.beneficiaryId)).toEqual(['urgent', 'mid-many', 'mid-one', 'low']);
  });

  test('summary counts beneficiaries, total actions, and P1-urgent', () => {
    const { summary } = summarizeCaseloadAttention([
      trace('a', [act(1), act(3)]),
      trace('b', [act(1)]),
      trace('c', [act(2)]),
    ]);
    expect(summary).toEqual({ beneficiariesNeedingAttention: 3, totalActions: 4, urgentCount: 2 });
  });

  test('each row carries the single top action', () => {
    const { rows } = summarizeCaseloadAttention([trace('a', [act(1), act(2)])]);
    expect(rows[0].topAction.code).toBe('C1');
    expect(rows[0].attentionCount).toBe(2);
    expect(rows[0].topPriority).toBe(1);
  });

  test('empty / undefined input is safe', () => {
    expect(summarizeCaseloadAttention([]).rows).toEqual([]);
    expect(summarizeCaseloadAttention().summary.beneficiariesNeedingAttention).toBe(0);
  });
});

describe('golden-thread (W1165) — the CLI report is read-only + guarded', () => {
  const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'golden-thread-attention.js'),
    'utf-8'
  );
  test('only runs main() when invoked directly (require.main guard)', () => {
    expect(SRC).toMatch(/if \(require\.main === module\)/);
  });
  test('performs NO mutation (no save/create/update/delete/insert calls)', () => {
    expect(SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|insertOne|findOneAndUpdate|bulkWrite)\(/
    );
  });
  test('requires --branch and MONGODB_URI', () => {
    expect(SRC).toMatch(/--branch/);
    expect(SRC).toMatch(/MONGODB_URI/);
  });
});
