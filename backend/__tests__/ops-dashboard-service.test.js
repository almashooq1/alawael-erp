'use strict';

/**
 * ops-dashboard-service.test.js — Phase 16 Commit 5 (4.0.70).
 *
 * Tests the two board aggregators. Uses in-memory fake models so
 * the suite is hermetic + fast. Also verifies the defensive
 * behaviour: a throwing source must not break the response.
 */

process.env.NODE_ENV = 'test';

const { createOpsDashboardService } = require('../services/operations/opsDashboard.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeModel({ docs = [], name = 'Fake' } = {}) {
  return {
    modelName: name,
    _docs: docs,
    countDocuments: async filter => {
      return docs.filter(d => matches(d, filter)).length;
    },
    find: filter => {
      let rows = docs.filter(d => matches(d, filter));
      const api = {
        sort: () => api,
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    aggregate: async pipeline => {
      // Minimal: handle $match → $group(sum count) → $sort → $limit
      let rows = [...docs];
      for (const stage of pipeline) {
        if (stage.$match) rows = rows.filter(d => matches(d, stage.$match));
        else if (stage.$group) {
          const key = stage.$group._id.startsWith?.('$') ? stage.$group._id.slice(1) : null;
          const map = new Map();
          for (const r of rows) {
            const k = key ? r[key] : 'x';
            const cur = map.get(k) || { _id: k };
            for (const field of Object.keys(stage.$group)) {
              if (field === '_id') continue;
              const op = stage.$group[field];
              if (op.$sum === 1) cur[field] = (cur[field] || 0) + 1;
            }
            map.set(k, cur);
          }
          rows = [...map.values()];
        } else if (stage.$sort) {
          const [field, dir] = Object.entries(stage.$sort)[0];
          rows.sort((a, b) => (a[field] - b[field]) * dir);
        } else if (stage.$limit) rows = rows.slice(0, stage.$limit);
      }
      return rows;
    },
  };
}

function matches(d, filter) {
  for (const [k, v] of Object.entries(filter || {})) {
    if (v == null) {
      if (d[k] !== null && d[k] !== undefined) return false;
      continue;
    }
    if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      if (v.$in && !v.$in.includes(d[k])) return false;
      if (v.$nin && v.$nin.includes(d[k])) return false;
      if (v.$gte !== undefined && !(d[k] >= v.$gte)) return false;
      if (v.$lte !== undefined && !(d[k] <= v.$lte)) return false;
      if (v.$lt !== undefined && !(d[k] < v.$lt)) return false;
      if (v.$gt !== undefined && !(d[k] > v.$gt)) return false;
      if (v.$ne !== undefined && d[k] === v.$ne) return false;
    } else if (d[k] !== v) return false;
  }
  return true;
}

const BRANCH = 'branch-1';
const NOW = new Date('2026-04-24T12:00:00Z');
const YESTERDAY = new Date(NOW.getTime() - 24 * 3600 * 1000);

// ── tests: Branch Ops Board ───────────────────────────────────────

describe('OpsDashboardService — getBranchOpsBoard', () => {
  it('returns null sections when all models are missing', async () => {
    const svc = createOpsDashboardService({ now: () => NOW });
    const board = await svc.getBranchOpsBoard(BRANCH);
    expect(board.branchId).toBe(BRANCH);
    expect(board.sla).toBeNull();
    expect(board.workOrders).toBeNull();
    expect(board.purchaseRequests).toBeNull();
    expect(board.facility).toBeNull();
  });

  it('aggregates SLA counts + topNearBreach + recentBreaches', async () => {
    const slaModel = makeModel({
      name: 'SLA',
      docs: [
        {
          _id: 's1',
          branchId: BRANCH,
          status: 'active',
          warningFired: false,
          startedAt: YESTERDAY,
          policyId: 'x',
          module: 'helpdesk',
          severity: 'high',
          subjectType: 'T',
          subjectRef: 'T-1',
          percentOfTarget: () => 40,
        },
        {
          _id: 's2',
          branchId: BRANCH,
          status: 'active',
          warningFired: true,
          startedAt: YESTERDAY,
          policyId: 'y',
          module: 'maintenance',
          severity: 'critical',
          subjectType: 'WO',
          subjectRef: 'WO-1',
          percentOfTarget: () => 85,
        },
        {
          _id: 's3',
          branchId: BRANCH,
          status: 'breached',
          warningFired: true,
          startedAt: YESTERDAY,
          policyId: 'z',
          module: 'procurement',
          severity: 'high',
          subjectType: 'PR',
          subjectRef: 'PR-1',
          percentOfTarget: () => 120,
        },
      ],
    });
    const slaBreachModel = makeModel({
      name: 'SLABreach',
      docs: [
        {
          slaId: 'sb1',
          branchId: BRANCH,
          kind: 'resolution_breached',
          module: 'maintenance',
          severity: 'high',
          subjectRef: 'WO-1',
          firedAt: new Date(NOW.getTime() - 3600 * 1000),
          pctOfTarget: 105,
        },
      ],
    });
    const svc = createOpsDashboardService({ slaModel, slaBreachModel, now: () => NOW });
    const board = await svc.getBranchOpsBoard(BRANCH);
    expect(board.sla).toBeTruthy();
    expect(board.sla.active).toBe(2);
    expect(board.sla.atRisk).toBe(1);
    expect(board.sla.breached).toBe(1);
    expect(board.sla.topNearBreach).toHaveLength(1);
    expect(board.sla.topNearBreach[0].subjectRef).toBe('WO-1');
    expect(board.sla.recentBreaches).toHaveLength(1);
  });

  it('aggregates WO byStatus / byPriority / overdue / todayScheduled', async () => {
    const laterToday = new Date(NOW);
    laterToday.setHours(20, 0, 0, 0); // future today — counts as scheduled but not overdue
    const workOrderModel = makeModel({
      name: 'MaintenanceWorkOrder',
      docs: [
        {
          _id: 'w1',
          branchId: BRANCH,
          status: 'in_progress',
          priority: 'critical',
          scheduledDate: laterToday,
        },
        {
          _id: 'w2',
          branchId: BRANCH,
          status: 'submitted',
          priority: 'high',
          scheduledDate: YESTERDAY, // overdue
        },
        {
          _id: 'w3',
          branchId: BRANCH,
          status: 'closed',
          priority: 'normal',
          scheduledDate: YESTERDAY,
        },
      ],
    });
    const svc = createOpsDashboardService({ workOrderModel, now: () => NOW });
    const board = await svc.getBranchOpsBoard(BRANCH);
    expect(board.workOrders.byStatus.in_progress).toBe(1);
    expect(board.workOrders.byStatus.submitted).toBe(1);
    expect(board.workOrders.byStatus.closed).toBe(1);
    expect(board.workOrders.byPriority.critical).toBe(1);
    expect(board.workOrders.byPriority.high).toBe(1);
    expect(board.workOrders.overdue).toBe(1); // w2
    expect(board.workOrders.todayScheduled).toBe(1); // w1
  });

  it('aggregates PR pendingApproval + byTier', async () => {
    const purchaseRequestModel = makeModel({
      name: 'PurchaseRequest',
      docs: [
        {
          _id: 'p1',
          branchId: BRANCH,
          status: 'submitted',
          approvalTier: 'simple',
          submittedAt: new Date(NOW.getTime() - 3600 * 1000),
        },
        {
          _id: 'p2',
          branchId: BRANCH,
          status: 'under_review',
          approvalTier: 'standard',
          submittedAt: YESTERDAY,
        },
        {
          _id: 'p3',
          branchId: BRANCH,
          status: 'approved',
          approvalTier: 'simple',
          submittedAt: YESTERDAY,
        },
      ],
    });
    const svc = createOpsDashboardService({ purchaseRequestModel, now: () => NOW });
    const board = await svc.getBranchOpsBoard(BRANCH);
    expect(board.purchaseRequests.pendingApproval).toBe(2);
    expect(board.purchaseRequests.byTier.simple).toBe(1);
    expect(board.purchaseRequests.byTier.standard).toBe(1);
    expect(board.purchaseRequests.byTier.complex).toBe(0);
  });

  it('aggregates facility findings + due inspections', async () => {
    const inspectionModel = makeModel({
      name: 'FacilityInspection',
      docs: [
        {
          _id: 'i1',
          branchId: BRANCH,
          status: 'in_progress',
          scheduledFor: YESTERDAY,
          deleted_at: null,
          findings: [
            { _id: 'f1', severity: 'critical', status: 'open' },
            { _id: 'f2', severity: 'major', status: 'awaiting_vendor' },
            { _id: 'f3', severity: 'minor', status: 'closed' },
          ],
        },
        {
          _id: 'i2',
          branchId: BRANCH,
          status: 'scheduled',
          scheduledFor: YESTERDAY,
          deleted_at: null,
          findings: [],
        },
      ],
    });
    const svc = createOpsDashboardService({
      facilityInspectionModel: inspectionModel,
      now: () => NOW,
    });
    const board = await svc.getBranchOpsBoard(BRANCH);
    expect(board.facility.openFindings).toBe(2);
    expect(board.facility.criticalFindings).toBe(1);
    expect(board.facility.inspectionsDue).toBe(1);
  });

  it('throws if branchId missing', async () => {
    const svc = createOpsDashboardService({ now: () => NOW });
    await expect(svc.getBranchOpsBoard()).rejects.toThrow(/branchId required/);
  });

  it('defensive — section that throws returns null without crashing board', async () => {
    const badModel = {
      modelName: 'Bad',
      countDocuments: async () => {
        throw new Error('DB down');
      },
      find: () => {
        throw new Error('DB down');
      },
    };
    const svc = createOpsDashboardService({
      slaModel: badModel,
      workOrderModel: badModel,
      purchaseRequestModel: badModel,
      facilityInspectionModel: badModel,
      now: () => NOW,
    });
    const board = await svc.getBranchOpsBoard(BRANCH);
    // All sections fall back to null; the board still has the envelope.
    expect(board.branchId).toBe(BRANCH);
    expect(board.sla).toBeNull();
    expect(board.workOrders).toBeNull();
    expect(board.purchaseRequests).toBeNull();
    expect(board.facility).toBeNull();
  });
});

// ── tests: COO Executive Board ────────────────────────────────────

describe('OpsDashboardService — getCooExecutiveBoard', () => {
  it('returns null sections when models are missing', async () => {
    const svc = createOpsDashboardService({ now: () => NOW });
    const board = await svc.getCooExecutiveBoard();
    expect(board.generatedAt).toBeInstanceOf(Date);
    expect(board.windowHours).toBe(24);
    expect(board.slaCompliance).toBeNull();
    expect(board.workOrderBacklog).toBeNull();
    expect(board.procurement).toBeNull();
    expect(board.inspections).toBeNull();
    expect(Array.isArray(board.recentEscalations)).toBe(true);
  });

  it('computes overall SLA compliance + by-module breakdown', async () => {
    const slaModel = makeModel({
      name: 'SLA',
      docs: [
        { status: 'met', module: 'helpdesk', updatedAt: new Date(NOW.getTime() - 3600000) },
        { status: 'met', module: 'helpdesk', updatedAt: new Date(NOW.getTime() - 3600000) },
        { status: 'breached', module: 'maintenance', updatedAt: new Date(NOW.getTime() - 3600000) },
        { status: 'met', module: 'maintenance', updatedAt: new Date(NOW.getTime() - 3600000) },
      ],
    });
    const svc = createOpsDashboardService({ slaModel, now: () => NOW });
    const board = await svc.getCooExecutiveBoard({ windowHours: 24 });
    // 4 resolved, 1 breached → 75% compliance
    expect(board.slaCompliance.overall).toBe(75);
    expect(board.slaCompliance.byModule.helpdesk.resolved).toBe(2);
    expect(board.slaCompliance.byModule.helpdesk.breached).toBe(0);
    expect(board.slaCompliance.byModule.helpdesk.compliancePct).toBe(100);
    expect(board.slaCompliance.byModule.maintenance.compliancePct).toBe(50);
  });

  it('computes WO backlog totalOpen + byBranch', async () => {
    const workOrderModel = makeModel({
      name: 'MaintenanceWorkOrder',
      docs: [
        { status: 'submitted', branchId: 'b1' },
        { status: 'in_progress', branchId: 'b1' },
        { status: 'submitted', branchId: 'b2' },
        { status: 'closed', branchId: 'b1' },
      ],
    });
    const svc = createOpsDashboardService({ workOrderModel, now: () => NOW });
    const board = await svc.getCooExecutiveBoard();
    expect(board.workOrderBacklog.totalOpen).toBe(3);
    expect(board.workOrderBacklog.byBranch.length).toBeGreaterThan(0);
    const b1 = board.workOrderBacklog.byBranch.find(r => r.branchId === 'b1');
    expect(b1.open).toBe(2);
  });

  it('computes procurement pendingValue + avgCycleHours + convertedLast7d', async () => {
    const submittedAt = new Date(NOW.getTime() - 2 * 3600 * 1000);
    const updatedAt = new Date(NOW.getTime() - 1 * 3600 * 1000);
    const convertedAt = new Date(NOW.getTime() - 2 * 24 * 3600 * 1000);
    const prModel = makeModel({
      name: 'PurchaseRequest',
      docs: [
        { status: 'submitted', summary: { estimatedValue: 10000 } },
        { status: 'under_review', summary: { estimatedValue: 5000 } },
        {
          status: 'approved',
          submittedAt,
          updatedAt,
          summary: { estimatedValue: 8000 },
        },
        {
          status: 'converted_to_po',
          convertedAt,
          summary: { estimatedValue: 12000 },
        },
      ],
    });
    const svc = createOpsDashboardService({
      purchaseRequestModel: prModel,
      now: () => NOW,
    });
    const board = await svc.getCooExecutiveBoard({ windowHours: 72 });
    expect(board.procurement.pendingValue).toBe(15000);
    expect(board.procurement.avgCycleHours).toBe(1); // (2h - 1h) window
    expect(board.procurement.convertedLast7d).toBe(1);
  });

  it('computes open critical inspections by branch', async () => {
    const inspectionModel = makeModel({
      name: 'FacilityInspection',
      docs: [
        {
          status: 'in_progress',
          branchId: 'b1',
          deleted_at: null,
          findings: [
            { severity: 'critical', status: 'open' },
            { severity: 'critical', status: 'open' },
          ],
        },
        {
          status: 'scheduled',
          branchId: 'b2',
          deleted_at: null,
          findings: [{ severity: 'critical', status: 'awaiting_vendor' }],
        },
      ],
    });
    const svc = createOpsDashboardService({
      facilityInspectionModel: inspectionModel,
      now: () => NOW,
    });
    const board = await svc.getCooExecutiveBoard();
    expect(board.inspections.openCritical).toBe(3);
    expect(board.inspections.byBranch[0].branchId).toBe('b1');
    expect(board.inspections.byBranch[0].critical).toBe(2);
  });

  it('lists recent escalations within window', async () => {
    const slaBreachModel = makeModel({
      name: 'SLABreach',
      docs: [
        {
          slaId: 'sb1',
          kind: 'escalation_fired',
          module: 'helpdesk',
          severity: 'critical',
          branchId: 'b1',
          escalationStepIndex: 0,
          notifiedRoles: ['helpdesk_lead'],
          firedAt: new Date(NOW.getTime() - 3600 * 1000),
          subjectRef: 'T-1',
        },
        {
          slaId: 'sb2',
          kind: 'escalation_fired',
          module: 'maintenance',
          severity: 'high',
          branchId: 'b1',
          escalationStepIndex: 1,
          notifiedRoles: ['maintenance_supervisor'],
          firedAt: new Date(NOW.getTime() - 10 * 24 * 3600 * 1000), // outside window
          subjectRef: 'WO-1',
        },
      ],
    });
    const svc = createOpsDashboardService({ slaBreachModel, now: () => NOW });
    const board = await svc.getCooExecutiveBoard({ windowHours: 24 });
    expect(board.recentEscalations.length).toBe(1);
    expect(board.recentEscalations[0].subjectRef).toBe('T-1');
  });

  it('custom windowHours is respected', async () => {
    const svc = createOpsDashboardService({ now: () => NOW });
    const board = await svc.getCooExecutiveBoard({ windowHours: 168 });
    expect(board.windowHours).toBe(168);
  });
});
