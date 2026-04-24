'use strict';

/**
 * opsDashboard.service.js — Phase 16 Commit 5 (4.0.70).
 *
 * The Ops Control Tower read-side. Aggregates data from every
 * Phase-16 subject (SLA engine, Work Orders, Facility Inspections,
 * Purchase Requests) plus the existing maintenance + procurement
 * models, and returns two board shapes:
 *
 *   • `getBranchOpsBoard(branchId)` — single-branch real-time view
 *     for the branch manager + ops supervisor. Answers: what's
 *     happening right now, what's about to miss its SLA, what's
 *     overdue.
 *
 *   • `getCooExecutiveBoard({ window })` — cross-branch rollup for
 *     the COO / CEO. Answers: which branches are best/worst on SLA
 *     compliance, where is the WO backlog piling up, what's the
 *     average PR cycle time.
 *
 * Design principles:
 *
 *   1. **Defensive aggregation.** Every data source is optional —
 *      if a collection is missing or a query throws, that section
 *      returns `null` and the rest of the board still renders. No
 *      single bad source can blank the screen.
 *
 *   2. **Cheap at any cadence.** The board is built from
 *      `countDocuments` + small `find().limit(N)` queries. Safe
 *      to hit every 15–30 seconds from a browser.
 *
 *   3. **No side effects.** Strict read-only. Never calls into the
 *      state-machine or SLA engine's mutating methods.
 *
 *   4. **Dependency injection.** The bootstrap wires real models +
 *      engine; tests inject fakes.
 *
 * Response shape — `getBranchOpsBoard`:
 *   {
 *     branchId,
 *     generatedAt,
 *     sla: { active, atRisk, breached, topNearBreach: [...], recentBreaches: [...] },
 *     workOrders: { byStatus, byPriority, overdue, todayScheduled },
 *     purchaseRequests: { pendingApproval, submittedToday, byTier },
 *     facility: { openFindings, criticalFindings, inspectionsDue },
 *   }
 *
 * Response shape — `getCooExecutiveBoard`:
 *   {
 *     generatedAt,
 *     windowHours,
 *     slaCompliance: { overall, byModule, worstBranches: [...] },
 *     workOrderBacklog: { totalOpen, byBranch: [...] },
 *     procurement: { pendingValue, avgCycleHours, convertedLast7d },
 *     inspections: { openCritical, byBranch: [...] },
 *     recentEscalations: [...],
 *   }
 */

const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_NEAR_BREACH_LIMIT = 10;
const DEFAULT_RECENT_BREACH_LIMIT = 20;

class OpsDashboardService {
  constructor({
    slaEngine = null,
    slaModel = null,
    slaBreachModel = null,
    workOrderModel = null,
    purchaseRequestModel = null,
    facilityInspectionModel = null,
    facilityModel = null,
    logger = console,
    now = () => new Date(),
  } = {}) {
    this.slaEngine = slaEngine;
    this.slaModel = slaModel;
    this.slaBreachModel = slaBreachModel;
    this.workOrderModel = workOrderModel;
    this.prModel = purchaseRequestModel;
    this.inspectionModel = facilityInspectionModel;
    this.facilityModel = facilityModel;
    this.logger = logger;
    this.now = now;
  }

  // ── safe wrappers ────────────────────────────────────────────────

  async _safe(label, fn, fallback = null) {
    try {
      return await fn();
    } catch (err) {
      this.logger.warn(`[OpsDashboard] ${label} failed: ${err.message}`);
      return fallback;
    }
  }

  /**
   * Count wrapper — intentionally NOT wrapped in `_safe`. We want
   * a failure here to propagate up to the section's outer `_safe`,
   * so the whole section falls back to `null` rather than returning
   * a misleading mix of zeros + real counts.
   */
  async _count(Model, filter) {
    if (!Model) return null;
    return Model.countDocuments(filter);
  }

  // ── Branch Ops Board ─────────────────────────────────────────────

  async getBranchOpsBoard(branchId) {
    if (!branchId) throw new Error('getBranchOpsBoard: branchId required');
    const generatedAt = this.now();

    const [sla, workOrders, purchaseRequests, facility] = await Promise.all([
      this._branchSlaSection(branchId),
      this._branchWorkOrdersSection(branchId),
      this._branchPurchaseRequestsSection(branchId),
      this._branchFacilitySection(branchId),
    ]);

    return {
      branchId: String(branchId),
      generatedAt,
      sla,
      workOrders,
      purchaseRequests,
      facility,
    };
  }

  async _branchSlaSection(branchId) {
    if (!this.slaModel) return null;
    return this._safe('branch SLA section', async () => {
      const filter = { branchId };
      const [active, atRisk, breached] = await Promise.all([
        this.slaModel.countDocuments({ ...filter, status: 'active' }),
        this.slaModel.countDocuments({
          ...filter,
          status: 'active',
          warningFired: true,
        }),
        this.slaModel.countDocuments({ ...filter, status: 'breached' }),
      ]);

      const activeList = await this.slaModel
        .find({ ...filter, status: 'active', warningFired: true })
        .limit(DEFAULT_NEAR_BREACH_LIMIT);

      const topNearBreach = activeList.map(s => ({
        slaId: String(s._id),
        policyId: s.policyId,
        module: s.module,
        severity: s.severity,
        subjectType: s.subjectType,
        subjectRef: s.subjectRef,
        startedAt: s.startedAt,
        pctOfTarget: typeof s.percentOfTarget === 'function' ? s.percentOfTarget() : null,
      }));

      let recentBreaches = [];
      if (this.slaBreachModel) {
        const since = new Date(this.now().getTime() - 24 * 3600 * 1000);
        const rows = await this.slaBreachModel
          .find({ branchId, firedAt: { $gte: since } })
          .sort({ firedAt: -1 })
          .limit(DEFAULT_RECENT_BREACH_LIMIT);
        recentBreaches = rows.map(b => ({
          slaId: String(b.slaId),
          kind: b.kind,
          module: b.module,
          severity: b.severity,
          subjectRef: b.subjectRef,
          firedAt: b.firedAt,
          pctOfTarget: b.pctOfTarget,
        }));
      }

      return {
        active: active || 0,
        atRisk: atRisk || 0,
        breached: breached || 0,
        topNearBreach,
        recentBreaches,
      };
    });
  }

  async _branchWorkOrdersSection(branchId) {
    if (!this.workOrderModel) return null;
    return this._safe('branch WO section', async () => {
      const statuses = [
        'draft',
        'submitted',
        'triaged',
        'approved',
        'scheduled',
        'in_progress',
        'on_hold',
        'blocked',
        'completed',
        'verified',
        'closed',
      ];
      const byStatus = {};
      for (const s of statuses) {
        byStatus[s] = (await this._count(this.workOrderModel, { branchId, status: s })) || 0;
      }
      const priorities = ['critical', 'high', 'normal', 'low'];
      const byPriority = {};
      for (const p of priorities) {
        const openStatuses = ['submitted', 'triaged', 'approved', 'scheduled', 'in_progress'];
        byPriority[p] =
          (await this._count(this.workOrderModel, {
            branchId,
            priority: p,
            status: { $in: openStatuses },
          })) || 0;
      }
      const now = this.now();
      const overdue =
        (await this._count(this.workOrderModel, {
          branchId,
          status: { $in: ['submitted', 'triaged', 'approved', 'scheduled', 'in_progress'] },
          scheduledDate: { $lt: now },
        })) || 0;
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const todayScheduled =
        (await this._count(this.workOrderModel, {
          branchId,
          scheduledDate: { $gte: startOfDay, $lte: endOfDay },
        })) || 0;

      return { byStatus, byPriority, overdue, todayScheduled };
    });
  }

  async _branchPurchaseRequestsSection(branchId) {
    if (!this.prModel) return null;
    return this._safe('branch PR section', async () => {
      const pendingApproval =
        (await this._count(this.prModel, {
          branchId,
          status: { $in: ['submitted', 'under_review', 'returned_for_clarification'] },
        })) || 0;
      const now = this.now();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const submittedToday =
        (await this._count(this.prModel, {
          branchId,
          submittedAt: { $gte: startOfDay },
        })) || 0;

      const byTier = {};
      for (const tier of ['simple', 'standard', 'complex', 'special']) {
        byTier[tier] =
          (await this._count(this.prModel, {
            branchId,
            approvalTier: tier,
            status: { $in: ['submitted', 'under_review'] },
          })) || 0;
      }
      return { pendingApproval, submittedToday, byTier };
    });
  }

  async _branchFacilitySection(branchId) {
    if (!this.inspectionModel) return null;
    return this._safe('branch facility section', async () => {
      const openFilter = {
        branchId,
        status: { $in: ['scheduled', 'in_progress', 'completed'] },
        deleted_at: null,
      };
      const inspectionsDue =
        (await this._count(this.inspectionModel, {
          branchId,
          status: 'scheduled',
          scheduledFor: { $lte: this.now() },
          deleted_at: null,
        })) || 0;

      // Aggregate open-findings counts via a find().
      let openFindings = 0;
      let criticalFindings = 0;
      const insps = await this.inspectionModel.find(openFilter);
      for (const i of insps) {
        for (const f of i.findings || []) {
          if (['open', 'in_progress', 'awaiting_vendor'].includes(f.status)) {
            openFindings++;
            if (f.severity === 'critical') criticalFindings++;
          }
        }
      }
      return { openFindings, criticalFindings, inspectionsDue };
    });
  }

  // ── COO Executive Board ──────────────────────────────────────────

  async getCooExecutiveBoard({ windowHours = DEFAULT_WINDOW_HOURS } = {}) {
    const generatedAt = this.now();
    const since = new Date(generatedAt.getTime() - windowHours * 3600 * 1000);

    const [slaCompliance, workOrderBacklog, procurement, inspections, recentEscalations] =
      await Promise.all([
        this._cooSlaSection(since),
        this._cooWorkOrderBacklog(),
        this._cooProcurementSection(since),
        this._cooInspectionsSection(),
        this._cooRecentEscalations(since),
      ]);

    return {
      generatedAt,
      windowHours,
      slaCompliance,
      workOrderBacklog,
      procurement,
      inspections,
      recentEscalations,
    };
  }

  async _cooSlaSection(since) {
    if (!this.slaModel) return null;
    return this._safe('coo SLA section', async () => {
      const totalResolved = await this.slaModel.countDocuments({
        status: { $in: ['met', 'breached'] },
        updatedAt: { $gte: since },
      });
      const breachedCount = await this.slaModel.countDocuments({
        status: 'breached',
        updatedAt: { $gte: since },
      });
      const overall =
        totalResolved > 0 ? Math.round((1 - breachedCount / totalResolved) * 10000) / 100 : null;

      const modules = [
        'helpdesk',
        'maintenance',
        'procurement',
        'appointment',
        'session',
        'transport',
        'meeting',
        'inventory',
        'correspondence',
        'facility',
      ];
      const byModule = {};
      for (const m of modules) {
        const [resolved, breached] = await Promise.all([
          this.slaModel.countDocuments({
            module: m,
            status: { $in: ['met', 'breached'] },
            updatedAt: { $gte: since },
          }),
          this.slaModel.countDocuments({
            module: m,
            status: 'breached',
            updatedAt: { $gte: since },
          }),
        ]);
        byModule[m] = {
          resolved: resolved || 0,
          breached: breached || 0,
          compliancePct: resolved
            ? Math.round((1 - (breached || 0) / resolved) * 10000) / 100
            : null,
        };
      }

      // Worst branches — aggregate breach counts per branch.
      let worstBranches = [];
      if (this.slaBreachModel) {
        try {
          const agg = await this.slaBreachModel.aggregate?.([
            { $match: { firedAt: { $gte: since }, branchId: { $ne: null } } },
            { $group: { _id: '$branchId', breaches: { $sum: 1 } } },
            { $sort: { breaches: -1 } },
            { $limit: 5 },
          ]);
          if (Array.isArray(agg)) {
            worstBranches = agg.map(r => ({
              branchId: r._id ? String(r._id) : null,
              breaches: r.breaches,
            }));
          }
        } catch {
          worstBranches = [];
        }
      }

      return { overall, byModule, worstBranches };
    });
  }

  async _cooWorkOrderBacklog() {
    if (!this.workOrderModel) return null;
    return this._safe('coo WO backlog', async () => {
      const openStatuses = [
        'submitted',
        'triaged',
        'approved',
        'scheduled',
        'in_progress',
        'on_hold',
        'blocked',
      ];
      const totalOpen =
        (await this._count(this.workOrderModel, { status: { $in: openStatuses } })) || 0;

      let byBranch = [];
      try {
        const agg = await this.workOrderModel.aggregate?.([
          { $match: { status: { $in: openStatuses }, branchId: { $ne: null } } },
          { $group: { _id: '$branchId', open: { $sum: 1 } } },
          { $sort: { open: -1 } },
          { $limit: 10 },
        ]);
        if (Array.isArray(agg)) {
          byBranch = agg.map(r => ({
            branchId: r._id ? String(r._id) : null,
            open: r.open,
          }));
        }
      } catch {
        byBranch = [];
      }

      return { totalOpen, byBranch };
    });
  }

  async _cooProcurementSection(since) {
    if (!this.prModel) return null;
    return this._safe('coo procurement section', async () => {
      const pendingList = await this.prModel.find({
        status: { $in: ['submitted', 'under_review'] },
      });
      let pendingValue = 0;
      for (const pr of pendingList) {
        pendingValue += pr.summary?.estimatedValue || 0;
      }

      // Avg cycle time over recently-approved PRs (submit → approved).
      let avgCycleHours = null;
      try {
        const approvedRecent = await this.prModel.find({
          status: { $in: ['approved', 'converted_to_po'] },
          updatedAt: { $gte: since },
        });
        const samples = approvedRecent.filter(pr => pr.submittedAt && pr.updatedAt);
        if (samples.length > 0) {
          const sumMs = samples.reduce(
            (acc, pr) =>
              acc + (new Date(pr.updatedAt).getTime() - new Date(pr.submittedAt).getTime()),
            0
          );
          avgCycleHours = Math.round((sumMs / samples.length / 3600000) * 100) / 100;
        }
      } catch {
        avgCycleHours = null;
      }

      const convertedLast7d =
        (await this._count(this.prModel, {
          status: 'converted_to_po',
          convertedAt: { $gte: new Date(this.now().getTime() - 7 * 24 * 3600 * 1000) },
        })) || 0;

      return { pendingValue, avgCycleHours, convertedLast7d };
    });
  }

  async _cooInspectionsSection() {
    if (!this.inspectionModel) return null;
    return this._safe('coo inspections section', async () => {
      let openCritical = 0;
      const insps = await this.inspectionModel.find({
        status: { $in: ['scheduled', 'in_progress', 'completed'] },
        deleted_at: null,
      });
      const byBranchMap = {};
      for (const i of insps) {
        for (const f of i.findings || []) {
          if (
            f.severity === 'critical' &&
            ['open', 'in_progress', 'awaiting_vendor'].includes(f.status)
          ) {
            openCritical++;
            const key = i.branchId ? String(i.branchId) : 'unknown';
            byBranchMap[key] = (byBranchMap[key] || 0) + 1;
          }
        }
      }
      const byBranch = Object.entries(byBranchMap)
        .map(([branchId, critical]) => ({ branchId, critical }))
        .sort((a, b) => b.critical - a.critical)
        .slice(0, 10);

      return { openCritical, byBranch };
    });
  }

  async _cooRecentEscalations(since) {
    if (!this.slaBreachModel) return [];
    return this._safe(
      'coo recent escalations',
      async () => {
        const rows = await this.slaBreachModel
          .find({ firedAt: { $gte: since }, kind: 'escalation_fired' })
          .sort({ firedAt: -1 })
          .limit(DEFAULT_RECENT_BREACH_LIMIT);
        return rows.map(b => ({
          slaId: String(b.slaId),
          module: b.module,
          severity: b.severity,
          branchId: b.branchId ? String(b.branchId) : null,
          stepIndex: b.escalationStepIndex,
          notifiedRoles: b.notifiedRoles,
          firedAt: b.firedAt,
          subjectRef: b.subjectRef,
        }));
      },
      []
    );
  }
}

// ── factory + lazy singleton ────────────────────────────────────────

function createOpsDashboardService(deps) {
  return new OpsDashboardService(deps);
}

let _default = null;
function getDefault() {
  if (!_default) _default = new OpsDashboardService();
  return _default;
}

function _replaceDefault(instance) {
  _default = instance;
}

module.exports = {
  OpsDashboardService,
  createOpsDashboardService,
  getDefault,
  _replaceDefault,
  DEFAULT_WINDOW_HOURS,
  DEFAULT_NEAR_BREACH_LIMIT,
};
