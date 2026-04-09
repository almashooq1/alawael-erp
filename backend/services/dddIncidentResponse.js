'use strict';
/**
 * DDD Incident Response Service
 * ──────────────────────────────
 * Phase 33 – Disaster Recovery & Business Continuity (Module 4/4)
 *
 * Manages incident detection, triage, escalation, resolution,
 * post-mortem analysis, and lessons-learned tracking.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const INCIDENT_TYPES = [
  'system_outage',
  'security_breach',
  'data_loss',
  'performance_degradation',
  'network_failure',
  'hardware_failure',
  'software_bug',
  'configuration_error',
  'capacity_issue',
  'third_party_outage',
  'human_error',
  'natural_disaster',
];

const INCIDENT_SEVERITIES = [
  'SEV1_critical',
  'SEV2_high',
  'SEV3_medium',
  'SEV4_low',
  'SEV5_informational',
  'P0_emergency',
  'P1_urgent',
  'P2_normal',
  'P3_low',
  'P4_cosmetic',
];

const INCIDENT_STATUSES = [
  'detected',
  'triaged',
  'investigating',
  'identified',
  'mitigating',
  'resolved',
  'closed',
  'post_mortem',
  'monitoring',
  'reopened',
];

const ESCALATION_PATHS = [
  'on_call_engineer',
  'team_lead',
  'engineering_manager',
  'vp_engineering',
  'cto',
  'incident_commander',
  'security_team',
  'operations_team',
  'vendor_support',
  'executive_team',
];

const RESPONSE_ACTIONS = [
  'acknowledge',
  'investigate',
  'escalate',
  'mitigate',
  'communicate',
  'rollback',
  'patch',
  'restart',
  'failover',
  'restore',
];

const ROOT_CAUSES = [
  'code_defect',
  'config_change',
  'capacity_limit',
  'dependency_failure',
  'network_issue',
  'hardware_fault',
  'security_vulnerability',
  'human_error',
  'data_corruption',
  'unknown',
];

const BUILTIN_RUNBOOKS = [
  {
    code: 'DB_DOWN',
    name: 'Database Down',
    type: 'system_outage',
    severity: 'SEV1_critical',
    steps: 5,
  },
  {
    code: 'HIGH_CPU',
    name: 'High CPU Usage',
    type: 'performance_degradation',
    severity: 'SEV2_high',
    steps: 4,
  },
  { code: 'DISK_FULL', name: 'Disk Full', type: 'capacity_issue', severity: 'SEV2_high', steps: 3 },
  {
    code: 'SEC_BREACH',
    name: 'Security Breach',
    type: 'security_breach',
    severity: 'SEV1_critical',
    steps: 8,
  },
  {
    code: 'NET_OUTAGE',
    name: 'Network Outage',
    type: 'network_failure',
    severity: 'SEV1_critical',
    steps: 5,
  },
  {
    code: 'APP_CRASH',
    name: 'Application Crash',
    type: 'software_bug',
    severity: 'SEV2_high',
    steps: 4,
  },
  {
    code: 'DATA_LOSS',
    name: 'Data Loss Detection',
    type: 'data_loss',
    severity: 'SEV1_critical',
    steps: 6,
  },
  {
    code: 'API_SLOW',
    name: 'API Slow Response',
    type: 'performance_degradation',
    severity: 'SEV3_medium',
    steps: 4,
  },
  {
    code: 'CERT_EXPIRY',
    name: 'Certificate Expiry',
    type: 'configuration_error',
    severity: 'SEV2_high',
    steps: 3,
  },
  {
    code: 'VENDOR_OUT',
    name: 'Vendor Outage',
    type: 'third_party_outage',
    severity: 'SEV2_high',
    steps: 4,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const incidentSchema = new Schema(
  {
    title: { type: String, required: true },
    incidentType: { type: String, enum: INCIDENT_TYPES, required: true },
    severity: { type: String, enum: INCIDENT_SEVERITIES, required: true },
    status: { type: String, enum: INCIDENT_STATUSES, default: 'detected' },
    description: { type: String },
    impactSummary: { type: String },
    affectedSystems: [{ type: String }],
    detectedAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    durationMin: { type: Number },
    rootCause: { type: String, enum: ROOT_CAUSES },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    incidentCommander: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
incidentSchema.index({ severity: 1, status: 1 });
incidentSchema.index({ detectedAt: -1 });

const responseActionSchema = new Schema(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'DDDIncident', required: true },
    action: { type: String, enum: RESPONSE_ACTIONS, required: true },
    description: { type: String, required: true },
    performedAt: { type: Date, default: Date.now },
    durationMin: { type: Number },
    outcome: { type: String },
    escalationPath: { type: String, enum: ESCALATION_PATHS },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
responseActionSchema.index({ incidentId: 1, performedAt: -1 });
responseActionSchema.index({ action: 1 });

const postMortemSchema = new Schema(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'DDDIncident', required: true },
    summary: { type: String, required: true },
    timeline: [{ time: Date, event: String }],
    rootCause: { type: String, enum: ROOT_CAUSES, required: true },
    rootCauseDetail: { type: String },
    contributing: [{ factor: String, description: String }],
    actionItems: [{ title: String, owner: String, dueDate: Date, status: String }],
    lessonsLearned: [{ type: String }],
    status: { type: String, enum: ['draft', 'review', 'published'], default: 'draft' },
    publishedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    authoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
postMortemSchema.index({ incidentId: 1 });
postMortemSchema.index({ rootCause: 1 });

const communicationLogSchema = new Schema(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'DDDIncident', required: true },
    channel: {
      type: String,
      enum: ['email', 'sms', 'slack', 'teams', 'phone', 'status_page', 'pager', 'in_app'],
      required: true,
    },
    audience: {
      type: String,
      enum: ['internal_team', 'management', 'all_staff', 'customers', 'public', 'stakeholders'],
      required: true,
    },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'pending'],
      default: 'sent',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
communicationLogSchema.index({ incidentId: 1, sentAt: -1 });
communicationLogSchema.index({ channel: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDIncident = mongoose.models.DDDIncident || mongoose.model('DDDIncident', incidentSchema);
const DDDResponseAction =
  mongoose.models.DDDResponseAction || mongoose.model('DDDResponseAction', responseActionSchema);
const DDDPostMortem =
  mongoose.models.DDDPostMortem || mongoose.model('DDDPostMortem', postMortemSchema);
const DDDCommunicationLog =
  mongoose.models.DDDCommunicationLog ||
  mongoose.model('DDDCommunicationLog', communicationLogSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class IncidentResponse {
  async createIncident(data) {
    return DDDIncident.create(data);
  }
  async listIncidents(filter = {}, page = 1, limit = 20) {
    return DDDIncident.find(filter)
      .sort({ detectedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateIncident(id, data) {
    return DDDIncident.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async addAction(data) {
    return DDDResponseAction.create(data);
  }
  async listActions(filter = {}, page = 1, limit = 50) {
    return DDDResponseAction.find(filter)
      .sort({ performedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createPostMortem(data) {
    return DDDPostMortem.create(data);
  }
  async listPostMortems(filter = {}, page = 1, limit = 20) {
    return DDDPostMortem.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updatePostMortem(id, data) {
    return DDDPostMortem.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async addCommunication(data) {
    return DDDCommunicationLog.create(data);
  }
  async listCommunications(filter = {}, page = 1, limit = 50) {
    return DDDCommunicationLog.find(filter)
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getIncidentStats() {
    const [active, resolved, postMortems, comms] = await Promise.all([
      DDDIncident.countDocuments({
        status: { $in: ['detected', 'triaged', 'investigating', 'identified', 'mitigating'] },
      }),
      DDDIncident.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      DDDPostMortem.countDocuments({ status: 'published' }),
      DDDCommunicationLog.countDocuments(),
    ]);
    return {
      activeIncidents: active,
      resolvedIncidents: resolved,
      publishedPostMortems: postMortems,
      communicationsSent: comms,
    };
  }

  async healthCheck() {
    const [incidents, actions, postMortems, comms] = await Promise.all([
      DDDIncident.countDocuments(),
      DDDResponseAction.countDocuments(),
      DDDPostMortem.countDocuments(),
      DDDCommunicationLog.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'IncidentResponse',
      counts: { incidents, actions, postMortems, communications: comms },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createIncidentResponseRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new IncidentResponse();

  router.get('/incident-response/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/incident-response/incidents', async (req, res) => {
    try {
      res.status(201).json(await svc.createIncident(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/incident-response/incidents', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listIncidents(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/incident-response/incidents/:id', async (req, res) => {
    try {
      res.json(await svc.updateIncident(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/incident-response/actions', async (req, res) => {
    try {
      res.status(201).json(await svc.addAction(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/incident-response/actions', async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json(await svc.listActions(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/incident-response/post-mortems', async (req, res) => {
    try {
      res.status(201).json(await svc.createPostMortem(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/incident-response/post-mortems', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listPostMortems(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/incident-response/communications', async (req, res) => {
    try {
      res.status(201).json(await svc.addCommunication(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/incident-response/communications', async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json(await svc.listCommunications(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/incident-response/stats', async (_req, res) => {
    try {
      res.json(await svc.getIncidentStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  ESCALATION_PATHS,
  RESPONSE_ACTIONS,
  ROOT_CAUSES,
  BUILTIN_RUNBOOKS,
  DDDIncident,
  DDDResponseAction,
  DDDPostMortem,
  DDDCommunicationLog,
  IncidentResponse,
  createIncidentResponseRouter,
};
