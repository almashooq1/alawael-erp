/**
 * reporting-crm-builder.test.js — Phase 10 Commit 7g.
 */

'use strict';

const {
  buildParentEngagement,
  buildComplaintsDigest,
  rollupComplaints,
  rollupEngagement,
  COMPLAINT_CLOSED_STATUSES,
  COMPLAINT_ACTIVE_STATUSES,
  COMPLAINT_PRIORITIES,
} = require('../services/reporting/builders/crmReportBuilder');

function complaint(overrides = {}) {
  return {
    _id: 'c1',
    status: 'new',
    priority: 'medium',
    category: 'service',
    branchId: 'br1',
    createdAt: new Date('2026-04-22T10:00:00Z'),
    resolvedAt: null,
    ...overrides,
  };
}

function delivery(overrides = {}) {
  return {
    _id: 'd1',
    recipientId: 'g1',
    recipientRole: 'guardian',
    status: 'READ',
    channel: 'email',
    branchId: 'br1',
    createdAt: new Date('2026-04-10T10:00:00Z'),
    readAt: new Date('2026-04-10T12:00:00Z'),
    ...overrides,
  };
}

function makeModel(rows) {
  return {
    model: {
      async find(filter = {}) {
        return rows.filter(r => {
          if (filter.status && typeof filter.status === 'string' && r.status !== filter.status) {
            return false;
          }
          if (filter.recipientRole && r.recipientRole !== filter.recipientRole) return false;
          if (filter.branchId && String(r.branchId) !== String(filter.branchId)) return false;
          if (filter.createdAt) {
            const d = new Date(r.createdAt).getTime();
            if (filter.createdAt.$gte && d < filter.createdAt.$gte.getTime()) return false;
            if (filter.createdAt.$lt && d >= filter.createdAt.$lt.getTime()) return false;
          }
          return true;
        });
      },
    },
  };
}

// ─── Pure helpers ────────────────────────────────────────────────

describe('constants', () => {
  test('closed + active split is exhaustive over the enum', () => {
    const both = [...COMPLAINT_CLOSED_STATUSES, ...COMPLAINT_ACTIVE_STATUSES];
    // Model enum: new/under_review/in_progress/escalated/resolved/closed/rejected
    const modelEnum = [
      'new',
      'under_review',
      'in_progress',
      'escalated',
      'resolved',
      'closed',
      'rejected',
    ];
    expect(both.sort()).toEqual(modelEnum.sort());
  });
  test('priorities covers 4 levels', () => {
    expect(COMPLAINT_PRIORITIES).toEqual(['critical', 'high', 'medium', 'low']);
  });
});

describe('rollupComplaints', () => {
  test('counts total + active + closed + critical; averages resolution time', () => {
    const rows = [
      complaint({ status: 'new', priority: 'critical' }),
      complaint({
        status: 'resolved',
        createdAt: new Date('2026-04-20T10:00:00Z'),
        resolvedAt: new Date('2026-04-22T10:00:00Z'), // 48h
      }),
      complaint({
        status: 'closed',
        createdAt: new Date('2026-04-20T10:00:00Z'),
        resolvedAt: new Date('2026-04-24T10:00:00Z'), // 96h
      }),
      complaint({ status: 'in_progress' }),
    ];
    const out = rollupComplaints(rows);
    expect(out.total).toBe(4);
    expect(out.active).toBe(2);
    expect(out.closed).toBe(2);
    expect(out.critical).toBe(1);
    expect(out.byPriority.critical).toBe(1);
    expect(out.byPriority.medium).toBe(3);
    expect(out.avgResolutionHours).toBe(72); // avg(48, 96)
  });

  test('empty set yields null avg + zeros', () => {
    const out = rollupComplaints([]);
    expect(out.total).toBe(0);
    expect(out.avgResolutionHours).toBeNull();
  });
});

describe('rollupEngagement', () => {
  test('tallies delivered + read + failed + byChannel + unique/engaged recipients', () => {
    const rows = [
      delivery({ recipientId: 'g1', status: 'READ', channel: 'email' }),
      delivery({ recipientId: 'g1', status: 'DELIVERED', channel: 'whatsapp' }),
      delivery({ recipientId: 'g2', status: 'SENT', channel: 'email' }),
      delivery({ recipientId: 'g3', status: 'FAILED', channel: 'sms' }),
      delivery({ recipientId: 'g4', status: 'READ', channel: 'portal_inbox' }),
    ];
    const out = rollupEngagement(rows);
    expect(out.total).toBe(5);
    expect(out.delivered).toBe(4); // SENT/DELIVERED/READ
    expect(out.read).toBe(2);
    expect(out.failed).toBe(1);
    expect(out.byChannel.email).toBe(2);
    expect(out.uniqueRecipients).toBe(4); // g1, g2, g3, g4
    expect(out.engagedRecipients).toBe(2); // g1 + g4 (read at least once)
  });
});

// ─── buildComplaintsDigest ───────────────────────────────────────

describe('buildComplaintsDigest (weekly)', () => {
  const report = { id: 'crm.complaints.weekly' };

  test('filters by week + branch; emits headline = active count', async () => {
    const rows = [
      complaint({ createdAt: new Date('2026-04-21T10:00:00Z'), status: 'new' }),
      complaint({ createdAt: new Date('2026-04-22T10:00:00Z'), status: 'resolved' }),
      // outside range
      complaint({ createdAt: new Date('2026-04-10T10:00:00Z'), status: 'new' }),
    ];
    const doc = await buildComplaintsDigest({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Complaint: makeModel(rows) } },
    });
    expect(doc.totals.total).toBe(2);
    expect(doc.totals.active).toBe(1);
    expect(doc.totals.closed).toBe(1);
    expect(doc.resolutionRate).toBeCloseTo(0.5);
    expect(doc.summary.headlineMetric.label).toBe('active complaints');
    expect(doc.summary.headlineMetric.value).toBe('1');
  });

  test('degrades on bad periodKey', async () => {
    const doc = await buildComplaintsDigest({ report, periodKey: 'nope' });
    expect(doc.totals.total).toBe(0);
  });
});

// ─── buildParentEngagement ───────────────────────────────────────

describe('buildParentEngagement (monthly)', () => {
  const report = { id: 'crm.parent.engagement.monthly' };

  test('computes readRate + engagementRate from ReportDelivery rows', async () => {
    const rows = [
      delivery({ recipientId: 'g1', status: 'READ', createdAt: new Date('2026-04-05T10:00:00Z') }),
      delivery({
        recipientId: 'g1',
        status: 'DELIVERED',
        createdAt: new Date('2026-04-10T10:00:00Z'),
      }),
      delivery({ recipientId: 'g2', status: 'SENT', createdAt: new Date('2026-04-15T10:00:00Z') }),
      delivery({
        recipientId: 'g3',
        status: 'FAILED',
        createdAt: new Date('2026-04-20T10:00:00Z'),
      }),
      // outside range
      delivery({ recipientId: 'g4', status: 'READ', createdAt: new Date('2026-03-20T10:00:00Z') }),
    ];
    const doc = await buildParentEngagement({
      report,
      periodKey: '2026-04',
      ctx: { models: { ReportDelivery: makeModel(rows) } },
    });
    expect(doc.totals.deliveries).toBe(4);
    expect(doc.totals.delivered).toBe(3); // SENT/DELIVERED/READ
    expect(doc.totals.read).toBe(1);
    expect(doc.totals.failed).toBe(1);
    expect(doc.totals.uniqueRecipients).toBe(3);
    expect(doc.totals.engagedRecipients).toBe(1);
    expect(doc.readRate).toBeCloseTo(1 / 3);
    expect(doc.engagementRate).toBeCloseTo(1 / 3);
    expect(doc.summary.headlineMetric.label).toBe('engagement rate');
  });

  test('no deliveries → null rates, no-throw', async () => {
    const doc = await buildParentEngagement({
      report,
      periodKey: '2026-04',
      ctx: { models: { ReportDelivery: makeModel([]) } },
    });
    expect(doc.totals.deliveries).toBe(0);
    expect(doc.readRate).toBeNull();
    expect(doc.engagementRate).toBeNull();
  });

  test('missing ReportDelivery model → empty doc without throwing', async () => {
    const doc = await buildParentEngagement({
      report,
      periodKey: '2026-04',
      ctx: {},
    });
    expect(doc.totals.deliveries).toBe(0);
  });
});
