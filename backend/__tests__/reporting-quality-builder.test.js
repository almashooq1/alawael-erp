/**
 * reporting-quality-builder.test.js — Phase 10 Commit 7e.
 */

'use strict';

const {
  buildIncidentsDigest,
  buildIncidentsPack,
  buildCbahiEvidence,
  buildRedFlagsDigest,
  rollupIncidents,
  rollupFlags,
  countOverdueActions,
  hoursBetween,
  INCIDENT_SEVERITY_ORDER,
  INCIDENT_OPEN_STATUSES,
  RED_FLAG_SEVERITY_ORDER,
} = require('../services/reporting/builders/qualityReportBuilder');

function incident(overrides = {}) {
  return {
    _id: 'i1',
    incidentNumber: 'INC-2026-0001',
    branchId: 'br1',
    severity: 'minor',
    category: 'patient_safety',
    type: 'fall',
    status: 'reported',
    occurredAt: new Date('2026-04-21T10:00:00Z'),
    createdAt: new Date('2026-04-21T10:05:00Z'),
    reportedToMoh: false,
    rootCause: null,
    rcaDetails: null,
    correctiveActions: [],
    preventiveActions: [],
    ...overrides,
  };
}

function flag(overrides = {}) {
  return {
    _id: 'f1',
    beneficiaryId: 'b1',
    flagId: 'safety.fall.repeat.30d',
    status: 'active',
    severity: 'warning',
    domain: 'safety',
    blocking: false,
    branchId: 'br1',
    raisedAt: new Date('2026-04-22T06:00:00Z'),
    ...overrides,
  };
}

function makeIncidentModel(rows) {
  return {
    model: {
      find: jest.fn(async filter => {
        return rows.filter(r => {
          if (filter.branchId && String(r.branchId) !== String(filter.branchId)) return false;
          const dateField = filter.occurredAt
            ? 'occurredAt'
            : filter.createdAt
              ? 'createdAt'
              : null;
          if (dateField) {
            const d = new Date(r[dateField]).getTime();
            const clause = filter[dateField];
            if (clause.$gte && d < clause.$gte.getTime()) return false;
            if (clause.$lt && d >= clause.$lt.getTime()) return false;
          }
          return true;
        });
      }),
    },
  };
}

function makeFlagModel(rows) {
  return {
    model: {
      find: jest.fn(async filter => {
        return rows.filter(r => {
          if (filter.status && r.status !== filter.status) return false;
          if (filter.branchId && String(r.branchId) !== String(filter.branchId)) return false;
          return true;
        });
      }),
    },
  };
}

// ─── Pure helpers ────────────────────────────────────────────────

describe('constants', () => {
  test('severity order is catastrophic → insignificant', () => {
    expect(INCIDENT_SEVERITY_ORDER).toEqual([
      'catastrophic',
      'major',
      'moderate',
      'minor',
      'insignificant',
    ]);
  });
  test('open statuses excludes "closed"', () => {
    expect(INCIDENT_OPEN_STATUSES).not.toContain('closed');
    expect(INCIDENT_OPEN_STATUSES).toHaveLength(5);
  });
  test('red-flag severity order is critical → info', () => {
    expect(RED_FLAG_SEVERITY_ORDER).toEqual(['critical', 'warning', 'info']);
  });
});

describe('hoursBetween', () => {
  test('returns elapsed hours rounded to 0.1', () => {
    const a = new Date('2026-04-21T10:00:00Z');
    const b = new Date('2026-04-22T04:30:00Z'); // +18.5h
    expect(hoursBetween(a, b)).toBe(18.5);
  });
  test('null inputs → null', () => {
    expect(hoursBetween(null, new Date())).toBeNull();
    expect(hoursBetween(new Date(), undefined)).toBeNull();
  });
});

describe('rollupIncidents', () => {
  test('counts total + open + closed; splits by severity / category / type / status; computes MTTR', () => {
    const occ1 = new Date('2026-04-20T10:00:00Z');
    const closed1 = new Date('2026-04-21T10:00:00Z'); // 24h later
    const occ2 = new Date('2026-04-22T10:00:00Z');
    const closed2 = new Date('2026-04-22T16:00:00Z'); // 6h later
    const rows = [
      incident({
        status: 'closed',
        severity: 'major',
        occurredAt: occ1,
        closedAt: closed1,
        reportedToMoh: true,
        rootCause: 'equipment wear',
      }),
      incident({
        status: 'closed',
        severity: 'minor',
        occurredAt: occ2,
        closedAt: closed2,
        rcaDetails: { cause: 'process gap' },
      }),
      incident({ status: 'investigating', severity: 'catastrophic' }),
      incident({
        status: 'action_plan',
        severity: 'moderate',
        category: 'staff_safety',
        type: 'medication_error',
      }),
    ];
    const out = rollupIncidents(rows);
    expect(out.total).toBe(4);
    expect(out.closed).toBe(2);
    expect(out.open).toBe(2);
    expect(out.reportedToMoh).toBe(1);
    expect(out.rcaDone).toBe(2);
    expect(out.mttrHours).toBe(15); // (24 + 6) / 2
    expect(out.bySeverity.major).toBe(1);
    expect(out.bySeverity.catastrophic).toBe(1);
    expect(out.byCategory.patient_safety).toBe(3);
    expect(out.byCategory.staff_safety).toBe(1);
    expect(out.byType.fall).toBe(3);
    expect(out.byType.medication_error).toBe(1);
    expect(out.byStatus.investigating).toBe(1);
  });

  test('mttrHours is null when no closed incidents', () => {
    const out = rollupIncidents([incident()]);
    expect(out.mttrHours).toBeNull();
  });

  test('empty list → zeros across the board', () => {
    const out = rollupIncidents([]);
    expect(out.total).toBe(0);
    expect(out.open).toBe(0);
    expect(out.closed).toBe(0);
  });
});

describe('countOverdueActions', () => {
  test('counts actions with status=overdue OR deadline<now AND status≠completed', () => {
    const past = new Date('2020-01-01');
    const future = new Date('2099-01-01');
    const rows = [
      incident({
        correctiveActions: [
          { status: 'overdue', deadline: future, action: 'a' },
          { status: 'pending', deadline: past, action: 'b' }, // past+not-completed → overdue
          { status: 'completed', deadline: past, action: 'c' }, // completed, not counted
          { status: 'pending', deadline: future, action: 'd' }, // future, not overdue
        ],
        preventiveActions: [
          { status: 'in_progress', deadline: past, action: 'e' }, // past+in_progress → overdue
        ],
      }),
    ];
    expect(countOverdueActions(rows)).toBe(3);
  });
});

describe('rollupFlags', () => {
  test('tallies severity, domain, topFlags; flags critical + blocking counts', () => {
    const rows = [
      flag({
        severity: 'critical',
        blocking: true,
        domain: 'clinical',
        flagId: 'clinical.seizure.cluster.48h',
      }),
      flag({
        severity: 'critical',
        blocking: true,
        domain: 'clinical',
        flagId: 'clinical.seizure.cluster.48h',
      }),
      flag({ severity: 'warning', domain: 'safety', flagId: 'safety.fall.repeat.30d' }),
      flag({ severity: 'info', domain: 'administrative' }),
    ];
    const out = rollupFlags(rows);
    expect(out.total).toBe(4);
    expect(out.critical).toBe(2);
    expect(out.blocking).toBe(2);
    expect(out.bySeverity).toEqual({ critical: 2, warning: 1, info: 1 });
    expect(out.byDomain.clinical).toBe(2);
    expect(out.topFlags[0]).toEqual({ flagId: 'clinical.seizure.cluster.48h', count: 2 });
  });
});

// ─── buildIncidentsDigest ────────────────────────────────────────

describe('buildIncidentsDigest (weekly)', () => {
  const report = { id: 'quality.incidents.weekly' };

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildIncidentsDigest({ report, periodKey: 'nope' });
    expect(doc.totals.total).toBe(0);
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });

  test('aggregates weekly incidents with severity breakdown + MTTR + headline open count', async () => {
    const rows = [
      incident({
        status: 'closed',
        severity: 'major',
        occurredAt: new Date('2026-04-21T08:00:00Z'),
        closedAt: new Date('2026-04-21T20:00:00Z'),
      }),
      incident({
        status: 'investigating',
        severity: 'moderate',
        occurredAt: new Date('2026-04-22T10:00:00Z'),
      }),
    ];
    const doc = await buildIncidentsDigest({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Incident: makeIncidentModel(rows) } },
    });
    expect(doc.totals.total).toBe(2);
    expect(doc.totals.open).toBe(1);
    expect(doc.totals.closed).toBe(1);
    expect(doc.mttrHours).toBe(12);
    expect(doc.summary.headlineMetric.label).toBe('open incidents');
    expect(doc.summary.headlineMetric.value).toBe('1');
  });

  test('branch scope narrows the filter', async () => {
    const rows = [
      incident({ branchId: 'br1', occurredAt: new Date('2026-04-21T10:00:00Z') }),
      incident({ branchId: 'br2', occurredAt: new Date('2026-04-21T10:00:00Z') }),
    ];
    const doc = await buildIncidentsDigest({
      report,
      periodKey: '2026-W17',
      scopeKey: 'branch:br1',
      ctx: { models: { Incident: makeIncidentModel(rows) } },
    });
    expect(doc.totals.total).toBe(1);
    expect(doc.branch).toEqual({ id: 'br1' });
  });
});

// ─── buildIncidentsPack ──────────────────────────────────────────

describe('buildIncidentsPack (monthly)', () => {
  const report = { id: 'quality.incidents.monthly' };

  test('adds RCA completion + overdue actions + top-10 sorted by severity then recency', async () => {
    const past = new Date('2020-01-01');
    const rows = [
      incident({
        severity: 'catastrophic',
        status: 'closed',
        occurredAt: new Date('2026-04-01T10:00:00Z'),
        closedAt: new Date('2026-04-02T10:00:00Z'),
        rootCause: 'x',
      }),
      incident({
        severity: 'major',
        status: 'closed',
        occurredAt: new Date('2026-04-15T10:00:00Z'),
        closedAt: new Date('2026-04-16T10:00:00Z'),
        rcaDetails: { cause: 'y' },
      }),
      incident({
        severity: 'minor',
        status: 'monitoring',
        occurredAt: new Date('2026-04-20T10:00:00Z'),
        correctiveActions: [{ status: 'pending', deadline: past }],
      }),
    ];
    const doc = await buildIncidentsPack({
      report,
      periodKey: '2026-04',
      ctx: { models: { Incident: makeIncidentModel(rows) } },
    });
    expect(doc.totals.total).toBe(3);
    expect(doc.totals.rcaDone).toBe(2);
    expect(doc.rcaCompletionRate).toBeCloseTo(2 / 3);
    expect(doc.totals.overdueActions).toBe(1);
    expect(doc.topIncidents).toHaveLength(3);
    expect(doc.topIncidents[0].severity).toBe('catastrophic');
    expect(doc.topIncidents[1].severity).toBe('major');
    expect(doc.topIncidents[2].severity).toBe('minor');
  });
});

// ─── buildCbahiEvidence ──────────────────────────────────────────

describe('buildCbahiEvidence (quarterly)', () => {
  const report = { id: 'quality.cbahi.evidence.quarterly' };

  test('computes RCA + MoH reporting on catastrophic/major + evidence completeness', async () => {
    const rows = [
      incident({
        severity: 'catastrophic',
        category: 'patient_safety',
        reportedToMoh: true,
        rootCause: 'root',
        occurredAt: new Date('2026-02-01T10:00:00Z'),
      }),
      incident({
        severity: 'major',
        category: 'patient_safety',
        reportedToMoh: false,
        rcaDetails: { cause: 'r' },
        occurredAt: new Date('2026-03-01T10:00:00Z'),
      }),
      incident({
        severity: 'minor',
        category: 'staff_safety',
        rootCause: 'm',
        occurredAt: new Date('2026-02-15T10:00:00Z'),
      }),
    ];
    const doc = await buildCbahiEvidence({
      report,
      periodKey: '2026-Q1',
      ctx: { models: { Incident: makeIncidentModel(rows) } },
    });
    expect(doc.totals.incidents).toBe(3);
    expect(doc.totals.catastrophicOrMajor).toBe(2);
    expect(doc.totals.patientSafety).toBe(2);
    expect(doc.totals.staffSafety).toBe(1);
    expect(doc.totals.rcaDone).toBe(3);
    expect(doc.rcaCompletionRate).toBe(1);
    expect(doc.mohReportingRate).toBe(0.5); // 1 of 2 cat/maj
    expect(doc.evidenceCompleteness).toBe(0.5);
    expect(doc.summary.headlineMetric.label).toBe('evidence completeness');
  });
});

// ─── buildRedFlagsDigest ─────────────────────────────────────────

describe('buildRedFlagsDigest (daily)', () => {
  const report = { id: 'quality.red_flags.daily' };

  test('tallies active flags, by severity (canonical order), by domain, + raised-in-period', async () => {
    const today = new Date('2026-04-22T08:00:00Z');
    const yesterday = new Date('2026-04-21T08:00:00Z');
    const rows = [
      flag({ severity: 'critical', domain: 'clinical', blocking: true, raisedAt: today }),
      flag({ severity: 'critical', domain: 'clinical', raisedAt: yesterday }),
      flag({ severity: 'warning', domain: 'safety', raisedAt: today }),
      flag({ severity: 'info', domain: 'administrative', raisedAt: yesterday }),
      // cooldown rows should never hit an 'active' query
      flag({ status: 'cooldown', severity: 'warning' }),
    ];
    // Filter active only (our fake already respects filter.status).
    const doc = await buildRedFlagsDigest({
      report,
      periodKey: '2026-04-22',
      ctx: { models: { RedFlagState: makeFlagModel(rows) } },
    });
    expect(doc.totals.active).toBe(4);
    expect(doc.totals.critical).toBe(2);
    expect(doc.totals.blocking).toBe(1);
    expect(doc.totals.raisedToday).toBe(2); // only rows with raisedAt inside 2026-04-22
    expect(doc.bySeverity).toEqual({ critical: 2, warning: 1, info: 1 });
    expect(doc.byDomain.clinical).toBe(2);
    expect(doc.summary.headlineMetric.label).toBe('critical flags active');
  });

  test('empty → null headline, zero totals', async () => {
    const doc = await buildRedFlagsDigest({
      report,
      periodKey: '2026-04-22',
      ctx: { models: { RedFlagState: makeFlagModel([]) } },
    });
    expect(doc.totals.active).toBe(0);
    expect(doc.summary.headlineMetric).toBeNull();
  });

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildRedFlagsDigest({ report, periodKey: 'nope' });
    expect(doc.totals.active).toBe(0);
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });
});
