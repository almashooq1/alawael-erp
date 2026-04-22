/**
 * approval-escalate-digest-script.test.js — unit tests for the
 * buildEscalationPlan pure function that classifies open approval
 * requests into breaches / nearBreach / healthy given a now + warn
 * threshold.
 *
 * No DB, no I/O — the CLI's async main() path is covered indirectly
 * by the same pure planner plus the exit-code contract below.
 */

'use strict';

const { buildEscalationPlan } = require('../scripts/approval-escalate-digest');

const now = new Date('2026-04-22T12:00:00Z');

function mk({ id = 'r1', slaDeadline, openedAt, currentStep = 0, role = 'manager' } = {}) {
  return {
    _id: id,
    chainId: 'A-12-expense-mid',
    resourceType: 'Expense',
    resourceId: 'resource-' + id,
    currentStep,
    steps: [{ role: 'accountant' }, { role: 'finance_supervisor' }, { role: role }],
    openedAt: openedAt ? new Date(openedAt) : new Date('2026-04-20T12:00:00Z'),
    slaDeadline: slaDeadline ? new Date(slaDeadline) : null,
  };
}

describe('buildEscalationPlan — bucket assignment', () => {
  it('empty input returns three empty buckets', () => {
    expect(buildEscalationPlan([], now)).toEqual({
      breaches: [],
      nearBreach: [],
      healthy: [],
    });
  });

  it('request past SLA → breaches with overdueHours', () => {
    // Due 6 hours ago
    const overdueAt = new Date(now.getTime() - 6 * 3600_000).toISOString();
    const plan = buildEscalationPlan([mk({ slaDeadline: overdueAt })], now);
    expect(plan.breaches).toHaveLength(1);
    expect(plan.breaches[0].overdueHours).toBe(6);
    expect(plan.nearBreach).toEqual([]);
    expect(plan.healthy).toEqual([]);
  });

  it('request within warn threshold → nearBreach with hoursLeft', () => {
    // Due 2 hours from now, warn-hours 4 → near-breach
    const soon = new Date(now.getTime() + 2 * 3600_000).toISOString();
    const plan = buildEscalationPlan([mk({ slaDeadline: soon })], now, 4);
    expect(plan.nearBreach).toHaveLength(1);
    expect(plan.nearBreach[0].hoursLeft).toBe(2);
    expect(plan.breaches).toEqual([]);
  });

  it('request well past warn threshold → healthy', () => {
    // Due 24 hours from now, warn-hours 4 → healthy
    const later = new Date(now.getTime() + 24 * 3600_000).toISOString();
    const plan = buildEscalationPlan([mk({ slaDeadline: later })], now, 4);
    expect(plan.healthy).toHaveLength(1);
    expect(plan.breaches).toEqual([]);
    expect(plan.nearBreach).toEqual([]);
  });

  it('request without slaDeadline → healthy (cannot be late)', () => {
    const plan = buildEscalationPlan([mk({ slaDeadline: null })], now);
    expect(plan.healthy).toHaveLength(1);
    expect(plan.breaches).toEqual([]);
  });

  it('mix of all three buckets classifies correctly', () => {
    const plan = buildEscalationPlan(
      [
        mk({ id: 'a', slaDeadline: new Date(now.getTime() - 2 * 3600_000).toISOString() }),
        mk({ id: 'b', slaDeadline: new Date(now.getTime() + 1 * 3600_000).toISOString() }),
        mk({ id: 'c', slaDeadline: new Date(now.getTime() + 48 * 3600_000).toISOString() }),
      ],
      now,
      4
    );
    expect(plan.breaches.map(b => b.id)).toEqual(['a']);
    expect(plan.nearBreach.map(n => n.id)).toEqual(['b']);
    expect(plan.healthy.map(h => h.id)).toEqual(['c']);
  });
});

describe('buildEscalationPlan — entry shape', () => {
  it('breach entries carry chain context + currentRole + ageHours', () => {
    const opened = new Date(now.getTime() - 48 * 3600_000).toISOString();
    const plan = buildEscalationPlan(
      [
        mk({
          id: 'x',
          openedAt: opened,
          slaDeadline: new Date(now.getTime() - 3 * 3600_000).toISOString(),
          currentStep: 1,
          role: 'finance_supervisor',
        }),
      ],
      now
    );
    const entry = plan.breaches[0];
    expect(entry).toMatchObject({
      chainId: 'A-12-expense-mid',
      resourceType: 'Expense',
      currentStep: 1,
      currentRole: 'finance_supervisor',
    });
    expect(entry.ageHours).toBe(48);
    expect(entry.id).toBe('x');
  });

  it('falls back to "(unknown)" when currentStep has no matching role', () => {
    const weirdReq = {
      _id: 'w',
      chainId: 'X',
      resourceType: 'Expense',
      resourceId: 'w',
      currentStep: 99,
      steps: [{ role: 'a' }],
      openedAt: now,
      slaDeadline: new Date(now.getTime() - 1000).toISOString(),
    };
    const plan = buildEscalationPlan([weirdReq], now);
    expect(plan.breaches[0].currentRole).toBe('(unknown)');
  });
});

describe('buildEscalationPlan — warnHours boundary', () => {
  it('exactly at warn threshold → nearBreach (inclusive)', () => {
    const at = new Date(now.getTime() + 4 * 3600_000).toISOString();
    const plan = buildEscalationPlan([mk({ slaDeadline: at })], now, 4);
    expect(plan.nearBreach).toHaveLength(1);
    expect(plan.healthy).toEqual([]);
  });

  it('just over warn threshold → healthy (exclusive)', () => {
    const at = new Date(now.getTime() + 4 * 3600_000 + 1).toISOString();
    const plan = buildEscalationPlan([mk({ slaDeadline: at })], now, 4);
    expect(plan.healthy).toHaveLength(1);
    expect(plan.nearBreach).toEqual([]);
  });
});
