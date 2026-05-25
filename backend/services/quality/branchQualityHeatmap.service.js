'use strict';

/**
 * branchQualityHeatmap.service.js — W350+W351 (Phase 9 dashboard backend).
 *
 * Aggregates per-branch quality metrics into a single heatmap-ready data
 * structure. Cells are color-coded (ok / warning / critical) per metric so
 * the front-end can render a traffic-light grid without business logic.
 *
 * Data sources (data-ready from W337-W349 + W324-W347 drift work):
 *   - CapaItem          (W350: open / overdue / critical-priority counts per branch)
 *   - AuditOccurrence   (W350: open / overdue-by-plannedFor counts per branch)
 *   - RcaInvestigation  (W351: open count = status NOT IN terminal {verified,archived,cancelled})
 *   - FmeaWorksheet     (W351: active count = status NOT IN terminal {verified,archived,cancelled})
 *   - Risk              (W351: critical-level count = riskLevel='critical')
 *
 * Public surface:
 *   createBranchQualityHeatmapService({ logger, capaModel?, auditModel? })
 *     - factory; capaModel + auditModel optional (lazy-loaded if absent)
 *
 *   buildHeatmap({ branchIds?, now? })
 *     - returns { generatedAt, branches: [{ branchId, cells: { metricKey: { value, severity, threshold } } }],
 *                  summary: { totalBranches, criticalBranches, warningBranches } }
 *     - branchIds optional (default: aggregate ALL branches with any data)
 *
 * Severity thresholds (per metric, all configurable):
 *   capa.open:        ok ≤20  / warning ≤50 / critical >50
 *   capa.overdue:     ok 0    / warning ≤10 / critical >10
 *   capa.critical:    ok 0    / warning ≤3  / critical >3
 *   audit.open:       ok ≤5   / warning ≤15 / critical >15
 *   audit.overdue:    ok 0    / warning ≤3  / critical >3
 *
 * Branch-level severity = MAX of its cells. So one critical cell → critical branch.
 */

const THRESHOLDS = Object.freeze({
  // W350 (CAPA + Audit)
  'capa.open': { warning: 20, critical: 50 },
  'capa.overdue': { warning: 0, critical: 10 }, // strict: any overdue is warning
  'capa.critical': { warning: 0, critical: 3 }, // strict: any critical-priority is warning
  'audit.open': { warning: 5, critical: 15 },
  'audit.overdue': { warning: 0, critical: 3 },
  // W351 (RCA + FMEA + Risk)
  'rca.open': { warning: 3, critical: 10 }, // active RCAs (non-terminal)
  'fmea.active': { warning: 5, critical: 15 }, // active FMEA worksheets
  'risk.critical': { warning: 0, critical: 2 }, // critical-level Risks
  // W371 (Clinical safety — bridges W356+W357 onto the operational heatmap)
  'seizures.openEvents': { warning: 0, critical: 5 }, // strict: any unreviewed seizure is a warning
  'safeguarding.openConcerns': { warning: 0, critical: 3 }, // strict: any open safeguarding concern is a warning
  // W372 (Operational safety — bridges W359 AssistiveDevice onto the heatmap)
  'assistiveDevice.maintenanceOverdue': { warning: 0, critical: 5 }, // strict: an overdue device may be unsafe
  // W374 (Accreditation compliance — bridges W360 CbahiAttestation onto the heatmap)
  'cbahi.attestationsExpiringSoon': { warning: 0, critical: 5 }, // strict: any attestation expiring in next 30 days needs action
});

// Terminal-statuses sets (mirror config/{rca,fmea}.registry.js TERMINAL_STATUSES).
// Duplicated here only so the aggregation pipeline can $nin them without a
// jest.unmock('mongoose') dance to load the registry through mongoose mocks.
const RCA_TERMINAL = Object.freeze(['verified', 'archived', 'cancelled']);
const FMEA_TERMINAL = Object.freeze(['verified', 'archived', 'cancelled']);
// W371 — SeizureEvent status enum is ['recorded', 'reviewed'] (binary): open = 'recorded'.
const SEIZURE_OPEN_STATUS = 'recorded';
// W371 — SafeguardingConcern has 7-state lifecycle; "closed" or "unsubstantiated" are terminal.
// Anything else (reported / triaged / investigating / substantiated / escalated_to_authority) is open.
const SAFEGUARDING_CLOSED_STATUSES = Object.freeze(['closed', 'unsubstantiated']);
// W374 — CbahiAttestation STATUSES = [draft, met, partially_met, not_met, not_applicable].
// Active = met|partially_met|not_met (something was assessed; draft/n_a aren't tracked for expiry).
const CBAHI_ACTIVE_STATUSES = Object.freeze(['met', 'partially_met', 'not_met']);
const CBAHI_EXPIRY_WINDOW_DAYS = 30;

const SEVERITY_RANK = Object.freeze({ ok: 0, warning: 1, critical: 2 });

function _severityFor(metricKey, value) {
  const t = THRESHOLDS[metricKey];
  if (!t) return 'ok';
  if (value > t.critical) return 'critical';
  if (value > t.warning) return 'warning';
  return 'ok';
}

function _maxSeverity(severities) {
  let max = 'ok';
  for (const s of severities) {
    if (SEVERITY_RANK[s] > SEVERITY_RANK[max]) max = s;
  }
  return max;
}

function createBranchQualityHeatmapService(opts = {}) {
  const { logger = console } = opts;

  function _CapaModel() {
    if (opts.capaModel) return opts.capaModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('CapaItem');
    } catch {
      require('../../models/quality/CapaItem.model');
      return mongoose.model('CapaItem');
    }
  }

  function _AuditModel() {
    if (opts.auditModel) return opts.auditModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('AuditOccurrence');
    } catch {
      require('../../models/quality/AuditOccurrence.model');
      return mongoose.model('AuditOccurrence');
    }
  }

  function _RcaModel() {
    if (opts.rcaModel) return opts.rcaModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('RcaInvestigation');
    } catch {
      require('../../models/quality/RcaInvestigation.model');
      return mongoose.model('RcaInvestigation');
    }
  }

  function _FmeaModel() {
    if (opts.fmeaModel) return opts.fmeaModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('FmeaWorksheet');
    } catch {
      require('../../models/quality/FmeaWorksheet.model');
      return mongoose.model('FmeaWorksheet');
    }
  }

  function _RiskModel() {
    if (opts.riskModel) return opts.riskModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('Risk');
    } catch {
      require('../../models/quality/Risk.model');
      return mongoose.model('Risk');
    }
  }

  function _SeizureModel() {
    if (opts.seizureModel) return opts.seizureModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('SeizureEvent');
    } catch {
      require('../../models/SeizureEvent');
      return mongoose.model('SeizureEvent');
    }
  }

  function _SafeguardingModel() {
    if (opts.safeguardingModel) return opts.safeguardingModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('SafeguardingConcern');
    } catch {
      require('../../models/SafeguardingConcern');
      return mongoose.model('SafeguardingConcern');
    }
  }

  function _AssistiveDeviceModel() {
    if (opts.assistiveDeviceModel) return opts.assistiveDeviceModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('AssistiveDevice');
    } catch {
      require('../../models/AssistiveDevice');
      return mongoose.model('AssistiveDevice');
    }
  }

  function _CbahiModel() {
    if (opts.cbahiModel) return opts.cbahiModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('CbahiAttestation');
    } catch {
      require('../../models/CbahiAttestation');
      return mongoose.model('CbahiAttestation');
    }
  }

  async function _capaMetricsByBranch({ branchIds, now }) {
    const Capa = _CapaModel();
    const match = { deleted_at: null };
    if (branchIds?.length) match.branchId = { $in: branchIds };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          openCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED']] },
                1,
                0,
              ],
            },
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED']] },
                    { $lt: ['$dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          criticalCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$priority', 'critical'] },
                    { $in: ['$status', ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    return Capa.aggregate(pipeline);
  }

  async function _auditMetricsByBranch({ branchIds, now }) {
    const Audit = _AuditModel();
    const match = { deleted_at: null };
    if (branchIds?.length) match.branchId = { $in: branchIds };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          openCount: {
            $sum: { $cond: [{ $in: ['$status', ['planned', 'in_progress']] }, 1, 0] },
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['planned', 'in_progress']] },
                    { $lt: ['$plannedFor', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    return Audit.aggregate(pipeline);
  }

  async function _rcaMetricsByBranch({ branchIds }) {
    const Rca = _RcaModel();
    const match = {};
    if (branchIds?.length) match.branchId = { $in: branchIds };
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          openCount: {
            $sum: { $cond: [{ $not: [{ $in: ['$status', RCA_TERMINAL] }] }, 1, 0] },
          },
        },
      },
    ];
    return Rca.aggregate(pipeline);
  }

  async function _fmeaMetricsByBranch({ branchIds }) {
    const Fmea = _FmeaModel();
    const match = {};
    if (branchIds?.length) match.branchId = { $in: branchIds };
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          activeCount: {
            $sum: { $cond: [{ $not: [{ $in: ['$status', FMEA_TERMINAL] }] }, 1, 0] },
          },
        },
      },
    ];
    return Fmea.aggregate(pipeline);
  }

  async function _riskMetricsByBranch({ branchIds }) {
    const Risk = _RiskModel();
    const match = {};
    if (branchIds?.length) match.branchId = { $in: branchIds };
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          criticalCount: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] },
          },
        },
      },
    ];
    return Risk.aggregate(pipeline);
  }

  async function _seizureMetricsByBranch({ branchIds }) {
    const Seizure = _SeizureModel();
    const match = { status: SEIZURE_OPEN_STATUS };
    if (branchIds?.length) match.branchId = { $in: branchIds };
    const pipeline = [{ $match: match }, { $group: { _id: '$branchId', openEvents: { $sum: 1 } } }];
    return Seizure.aggregate(pipeline);
  }

  async function _safeguardingMetricsByBranch({ branchIds }) {
    const Safeguarding = _SafeguardingModel();
    const match = { status: { $nin: SAFEGUARDING_CLOSED_STATUSES } };
    if (branchIds?.length) match.branchId = { $in: branchIds };
    const pipeline = [
      { $match: match },
      { $group: { _id: '$branchId', openConcerns: { $sum: 1 } } },
    ];
    return Safeguarding.aggregate(pipeline);
  }

  async function _cbahiMetricsByBranch({ branchIds, now }) {
    const Cbahi = _CbahiModel();
    // Expiring soon = active status AND nextReassessmentDue in the next 30 days.
    // null nextReassessmentDue → not yet scheduled, excluded (separate signal).
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + CBAHI_EXPIRY_WINDOW_DAYS);
    const match = {
      status: { $in: CBAHI_ACTIVE_STATUSES },
      nextReassessmentDue: { $ne: null, $gte: now, $lte: windowEnd },
    };
    if (branchIds?.length) match.branchId = { $in: branchIds };
    const pipeline = [
      { $match: match },
      { $group: { _id: '$branchId', expiringCount: { $sum: 1 } } },
    ];
    return Cbahi.aggregate(pipeline);
  }

  async function _assistiveDeviceMetricsByBranch({ branchIds, now }) {
    const Device = _AssistiveDeviceModel();
    // Overdue = nextMaintenanceDue is set AND in the past AND device is not retired.
    // Devices with nextMaintenanceDue:null are excluded — they haven't been scheduled yet,
    // which is a separate "untracked" signal not modeled here.
    const match = {
      nextMaintenanceDue: { $ne: null, $lt: now },
      retiredAt: null,
    };
    if (branchIds?.length) match.branchId = { $in: branchIds };
    const pipeline = [
      { $match: match },
      { $group: { _id: '$branchId', overdueCount: { $sum: 1 } } },
    ];
    return Device.aggregate(pipeline);
  }

  async function buildHeatmap({ branchIds = null, now = new Date() } = {}) {
    let capaRows = [];
    let auditRows = [];
    let rcaRows = [];
    let fmeaRows = [];
    let riskRows = [];
    let seizureRows = [];
    let safeguardingRows = [];
    let assistiveDeviceRows = [];
    let cbahiRows = [];
    try {
      capaRows = await _capaMetricsByBranch({ branchIds, now });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] capa aggregation failed: ${err.message}`);
    }
    try {
      auditRows = await _auditMetricsByBranch({ branchIds, now });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] audit aggregation failed: ${err.message}`);
    }
    try {
      rcaRows = await _rcaMetricsByBranch({ branchIds });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] rca aggregation failed: ${err.message}`);
    }
    try {
      fmeaRows = await _fmeaMetricsByBranch({ branchIds });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] fmea aggregation failed: ${err.message}`);
    }
    try {
      riskRows = await _riskMetricsByBranch({ branchIds });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] risk aggregation failed: ${err.message}`);
    }
    try {
      seizureRows = await _seizureMetricsByBranch({ branchIds });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] seizure aggregation failed: ${err.message}`);
    }
    try {
      safeguardingRows = await _safeguardingMetricsByBranch({ branchIds });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] safeguarding aggregation failed: ${err.message}`);
    }
    try {
      assistiveDeviceRows = await _assistiveDeviceMetricsByBranch({ branchIds, now });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] assistive-device aggregation failed: ${err.message}`);
    }
    try {
      cbahiRows = await _cbahiMetricsByBranch({ branchIds, now });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] cbahi aggregation failed: ${err.message}`);
    }

    // Merge by branchId
    const byBranch = new Map();
    function _ensure(bid) {
      const key = String(bid);
      if (!byBranch.has(key)) {
        byBranch.set(key, {
          branchId: bid,
          cells: {
            'capa.open': null,
            'capa.overdue': null,
            'capa.critical': null,
            'audit.open': null,
            'audit.overdue': null,
            'rca.open': null,
            'fmea.active': null,
            'risk.critical': null,
            'seizures.openEvents': null,
            'safeguarding.openConcerns': null,
            'assistiveDevice.maintenanceOverdue': null,
            'cbahi.attestationsExpiringSoon': null,
          },
        });
      }
      return byBranch.get(key);
    }

    for (const r of capaRows) {
      const b = _ensure(r._id);
      b.cells['capa.open'] = _cell('capa.open', r.openCount);
      b.cells['capa.overdue'] = _cell('capa.overdue', r.overdueCount);
      b.cells['capa.critical'] = _cell('capa.critical', r.criticalCount);
    }
    for (const r of auditRows) {
      const b = _ensure(r._id);
      b.cells['audit.open'] = _cell('audit.open', r.openCount);
      b.cells['audit.overdue'] = _cell('audit.overdue', r.overdueCount);
    }
    for (const r of rcaRows) {
      const b = _ensure(r._id);
      b.cells['rca.open'] = _cell('rca.open', r.openCount);
    }
    for (const r of fmeaRows) {
      const b = _ensure(r._id);
      b.cells['fmea.active'] = _cell('fmea.active', r.activeCount);
    }
    for (const r of riskRows) {
      const b = _ensure(r._id);
      b.cells['risk.critical'] = _cell('risk.critical', r.criticalCount);
    }
    for (const r of seizureRows) {
      const b = _ensure(r._id);
      b.cells['seizures.openEvents'] = _cell('seizures.openEvents', r.openEvents);
    }
    for (const r of safeguardingRows) {
      const b = _ensure(r._id);
      b.cells['safeguarding.openConcerns'] = _cell('safeguarding.openConcerns', r.openConcerns);
    }
    for (const r of assistiveDeviceRows) {
      const b = _ensure(r._id);
      b.cells['assistiveDevice.maintenanceOverdue'] = _cell(
        'assistiveDevice.maintenanceOverdue',
        r.overdueCount
      );
    }
    for (const r of cbahiRows) {
      const b = _ensure(r._id);
      b.cells['cbahi.attestationsExpiringSoon'] = _cell(
        'cbahi.attestationsExpiringSoon',
        r.expiringCount
      );
    }

    // Compute branch-level severity + tally
    const branches = [];
    let critical = 0;
    let warning = 0;
    for (const b of byBranch.values()) {
      const cellSeverities = Object.values(b.cells)
        .filter(c => c)
        .map(c => c.severity);
      const branchSeverity = _maxSeverity(cellSeverities);
      branches.push({ ...b, severity: branchSeverity });
      if (branchSeverity === 'critical') critical++;
      else if (branchSeverity === 'warning') warning++;
    }

    return {
      generatedAt: new Date(now).toISOString(),
      thresholds: THRESHOLDS,
      branches,
      summary: {
        totalBranches: branches.length,
        criticalBranches: critical,
        warningBranches: warning,
        okBranches: branches.length - critical - warning,
      },
    };
  }

  function _cell(metricKey, value) {
    return {
      value: value || 0,
      severity: _severityFor(metricKey, value || 0),
      threshold: THRESHOLDS[metricKey],
    };
  }

  return {
    buildHeatmap,
    // expose for tests
    _internals: { THRESHOLDS, _severityFor, _maxSeverity, _cell },
  };
}

module.exports = {
  createBranchQualityHeatmapService,
  THRESHOLDS,
};
