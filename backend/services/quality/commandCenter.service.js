'use strict';

/**
 * commandCenter.service.js — World-Class QMS Executive Command Center.
 *
 * Single aggregator that walks every Phase 29 module's `getDashboard()`
 * + `predictiveRisk.getRiskReport()` and returns one consolidated
 * payload for the executive landing page.
 *
 * Defensive by design: any module that fails or isn't wired in this
 * deployment is silently omitted (with the key set to null). The whole
 * call must NEVER throw — that would blank the executive dashboard.
 *
 * Returned shape (every section is optional):
 *
 *   {
 *     computedAt,
 *     branchId,
 *     risk: { score, band, signals },
 *     standards: [ { standard, coveragePercent, openGaps } ],
 *     modules: {
 *       fmea: { total, byStatus, highPriorityWorksheets },
 *       rca:  { total, byStatus, bySeverity },
 *       spc:  { total, active, byType },
 *       paretoA3: { total, byStatus },
 *       documents: { totalDocs, effective, drafts },
 *       suppliers: { total, byStatus, bySeverity, overdue },
 *       calibration: { total, active, overdue, failedCount },
 *       changeControl: { total, byStatus, byRisk },
 *       audits: { total, overdue, dueIn30, openMajorNc },
 *       coq: { currentYear, total, paafShare, shiftLeft },
 *       inspections: { total, fails, failRate, avgScore },
 *     },
 *     attention: [ { kind, label, severity, count, href } ],
 *   }
 */

class CommandCenterService {
  constructor(deps = {}) {
    this.deps = deps;
    this.logger = deps.logger || console;
  }

  async _safe(label, fn) {
    try {
      return await fn();
    } catch (err) {
      this.logger.warn(`[CommandCenter] ${label} failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Build the consolidated executive payload.
   *
   * @param {object} [opts]
   * @param {string|null} [opts.branchId]
   */
  async build({ branchId = null } = {}) {
    const params = branchId ? { branchId } : {};

    const [
      risk,
      standardsDashboard,
      fmea,
      rca,
      spc,
      paretoA3,
      documents,
      suppliers,
      calibration,
      changeControl,
      audits,
      coq,
      inspections,
    ] = await Promise.all([
      this._safe('predictive_risk', () => this._getRisk(branchId)),
      this._safe('standards', () => this._getStandards(branchId)),
      this._safe('fmea', () => this._getDash('fmea.service', params)),
      this._safe('rca', () => this._getDash('rca.service', params)),
      this._safe('spc', () => this._getDash('spc.service', params)),
      this._safe('pareto_a3', () => this._getDash('paretoA3.service', params)),
      this._safe('documents', () => this._getDash('controlledDocument.service', params)),
      this._safe('suppliers', () => this._getDash('supplierQuality.service', params)),
      this._safe('calibration', () => this._getDash('calibration.service', params)),
      this._safe('change_control', () => this._getDash('changeControl.service', params)),
      this._safe('audits', () => this._getDash('auditScheduler.service', params)),
      this._safe('coq', () => this._getDash('coq.service', params)),
      this._safe('inspections', () => this._getInspections(branchId)),
    ]);

    const attention = this._buildAttentionList({
      risk,
      fmea,
      rca,
      suppliers,
      calibration,
      audits,
      inspections,
      coq,
      standardsDashboard,
    });

    return {
      computedAt: new Date(),
      branchId: branchId ? String(branchId) : null,
      risk,
      standards: standardsDashboard,
      modules: {
        fmea,
        rca,
        spc,
        paretoA3,
        documents,
        suppliers,
        calibration,
        changeControl,
        audits,
        coq,
        inspections,
      },
      attention,
    };
  }

  async _getRisk(branchId) {
    if (this.deps.predictiveRiskService) {
      return this.deps.predictiveRiskService.getRiskReport({ branchId });
    }
    const mod = this._tryRequire('./predictiveRisk.service');
    if (!mod) return null;
    return mod.getDefault().getRiskReport({ branchId });
  }

  async _getStandards(branchId) {
    if (this.deps.standardsService) {
      return this.deps.standardsService.getDashboard({ branchId });
    }
    const mod = this._tryRequire('./standardsTraceability.service');
    if (!mod) return null;
    return mod.getDefault().getDashboard({ branchId });
  }

  async _getDash(serviceName, params) {
    const explicit = this.deps[serviceName.replace(/\.service$/, 'Service')];
    if (explicit && typeof explicit.getDashboard === 'function') {
      return explicit.getDashboard(params);
    }
    const mod = this._tryRequire(`./${serviceName}`);
    if (!mod) return null;
    const svc = mod.getDefault();
    if (typeof svc.getDashboard !== 'function') return null;
    return svc.getDashboard(params);
  }

  async _getInspections(branchId) {
    if (this.deps.inspectionService) {
      return this.deps.inspectionService.getDashboard({ branchId, days: 30 });
    }
    const mod = this._tryRequire('./inspectionSubmission.service');
    if (!mod) return null;
    return mod.getDefault().getDashboard({ branchId, days: 30 });
  }

  _tryRequire(rel) {
    try {
      return require(rel);
    } catch (_) {
      return null;
    }
  }

  /**
   * Turn the raw counts into a prioritised "what needs my attention NOW"
   * list. Returns items in descending severity. Each item has a stable
   * `kind` so the UI can route the click to the right page.
   */
  _buildAttentionList({
    risk,
    fmea,
    rca,
    suppliers,
    calibration,
    audits,
    inspections,
    coq,
    standardsDashboard,
  }) {
    const items = [];

    if (risk && risk.band === 'critical') {
      items.push({
        kind: 'risk_critical',
        label: 'نتيجة المخاطر التنبؤية حرجة',
        severity: 'critical',
        count: Math.round(risk.score),
        href: '/quality/predictive-risk',
      });
    } else if (risk && risk.band === 'high') {
      items.push({
        kind: 'risk_high',
        label: 'نتيجة المخاطر التنبؤية عالية',
        severity: 'high',
        count: Math.round(risk.score),
        href: '/quality/predictive-risk',
      });
    }

    if (suppliers && suppliers.overdue > 0) {
      items.push({
        kind: 'scar_overdue',
        label: 'SCARs متأخرة',
        severity: 'high',
        count: suppliers.overdue,
        href: '/quality/supplier-quality',
      });
    }

    if (calibration && calibration.overdue > 0) {
      items.push({
        kind: 'calibration_overdue',
        label: 'معايرات متأخرة',
        severity: 'high',
        count: calibration.overdue,
        href: '/quality/calibration',
      });
    }
    if (calibration && calibration.failedCount > 0) {
      items.push({
        kind: 'calibration_failed',
        label: 'معدات فشلت معايرتها',
        severity: 'critical',
        count: calibration.failedCount,
        href: '/quality/calibration',
      });
    }

    if (audits && audits.overdue > 0) {
      items.push({
        kind: 'audit_overdue',
        label: 'تدقيقات متأخرة',
        severity: 'high',
        count: audits.overdue,
        href: '/quality/audit-scheduler',
      });
    }
    if (audits && audits.openMajorNc > 0) {
      items.push({
        kind: 'audit_major_nc',
        label: 'عدم مطابقة كبير مفتوحة',
        severity: 'critical',
        count: audits.openMajorNc,
        href: '/quality/audit-scheduler',
      });
    }

    if (fmea && fmea.highPriorityWorksheets > 0) {
      items.push({
        kind: 'fmea_high_priority',
        label: 'ورقات FMEA بأولوية عالية',
        severity: 'high',
        count: fmea.highPriorityWorksheets,
        href: '/quality/fmea',
      });
    }

    if (inspections && inspections.failRate > 20) {
      items.push({
        kind: 'inspection_high_fail_rate',
        label: `معدل فشل الفحوصات ${inspections.failRate}%`,
        severity: 'high',
        count: inspections.fails,
        href: '/quality/inspections',
      });
    }

    if (standardsDashboard) {
      for (const s of standardsDashboard) {
        if (s.coveragePercent < 50) {
          items.push({
            kind: 'standard_low_coverage',
            label: `${s.standard.nameAr} — تغطية ${s.coveragePercent}%`,
            severity: s.coveragePercent < 25 ? 'critical' : 'high',
            count: s.openGaps,
            href: `/quality/standards/${encodeURIComponent(s.standard.code)}`,
          });
        }
      }
    }

    if (coq && !coq.shiftLeft && coq.total > 0) {
      items.push({
        kind: 'coq_shift_right',
        label: 'إنفاق على الفشل > الوقاية',
        severity: 'medium',
        count: coq.total,
        href: '/quality/coq',
      });
    }

    // Severity-order: critical, high, medium, low.
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    items.sort((a, b) => rank[a.severity] - rank[b.severity]);
    return items;
  }
}

function createCommandCenterService(deps) {
  return new CommandCenterService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) _defaultInstance = new CommandCenterService({});
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = { CommandCenterService, createCommandCenterService, getDefault, _replaceDefault };
