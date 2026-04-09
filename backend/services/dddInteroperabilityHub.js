'use strict';
/**
 * DDD Interoperability Hub Service
 * ──────────────────────────────────
 * Phase 32 – Integration & Interoperability (Module 4/4)
 *
 * Centralized integration hub managing external system connections,
 * API registrations, webhook subscriptions, event routing,
 * and integration monitoring/health.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const CONNECTION_TYPES = [
  'REST_API',
  'SOAP',
  'GraphQL',
  'gRPC',
  'WebSocket',
  'MLLP',
  'SFTP',
  'Database',
  'Message_Queue',
  'Event_Stream',
  'File_System',
  'Cloud_Storage',
];

const CONNECTION_STATUSES = [
  'active',
  'inactive',
  'connected',
  'disconnected',
  'error',
  'maintenance',
  'degraded',
  'testing',
  'pending_approval',
  'retired',
];

const WEBHOOK_EVENTS = [
  'beneficiary.created',
  'beneficiary.updated',
  'episode.started',
  'episode.completed',
  'assessment.completed',
  'session.scheduled',
  'session.completed',
  'alert.triggered',
  'report.generated',
  'plan.approved',
  'discharge.initiated',
  'referral.received',
];

const AUTH_METHODS = [
  'none',
  'api_key',
  'basic',
  'bearer_token',
  'oauth2_client',
  'oauth2_code',
  'certificate',
  'hmac',
  'saml',
  'custom',
];

const EVENT_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'informational',
  'batch',
  'deferred',
  'real_time',
  'near_real_time',
  'scheduled',
];

const INTEGRATION_CATEGORIES = [
  'EHR',
  'LIS',
  'RIS',
  'PACS',
  'Pharmacy',
  'Billing',
  'Insurance',
  'Government',
  'IoT_Device',
  'Mobile_App',
];

const BUILTIN_CONNECTORS = [
  {
    code: 'EPIC_FHIR',
    name: 'Epic FHIR R4',
    type: 'REST_API',
    category: 'EHR',
    auth: 'oauth2_client',
  },
  {
    code: 'CERNER_FHIR',
    name: 'Cerner FHIR R4',
    type: 'REST_API',
    category: 'EHR',
    auth: 'oauth2_client',
  },
  {
    code: 'NPHIES',
    name: 'NPHIES (Saudi)',
    type: 'REST_API',
    category: 'Insurance',
    auth: 'bearer_token',
  },
  { code: 'SADAD', name: 'SADAD Payment', type: 'REST_API', category: 'Billing', auth: 'api_key' },
  {
    code: 'MOH_SA',
    name: 'MOH Saudi Arabia',
    type: 'REST_API',
    category: 'Government',
    auth: 'certificate',
  },
  { code: 'SEHA', name: 'SEHA Platform', type: 'REST_API', category: 'EHR', auth: 'oauth2_client' },
  {
    code: 'HL7_MLLP',
    name: 'HL7 MLLP Channel',
    type: 'MLLP',
    category: 'EHR',
    auth: 'certificate',
  },
  {
    code: 'DICOM_PACS',
    name: 'DICOM PACS Server',
    type: 'REST_API',
    category: 'PACS',
    auth: 'basic',
  },
  {
    code: 'IOT_GATEWAY',
    name: 'IoT Device Gateway',
    type: 'WebSocket',
    category: 'IoT_Device',
    auth: 'api_key',
  },
  {
    code: 'MOBILE_PUSH',
    name: 'Mobile Push Service',
    type: 'REST_API',
    category: 'Mobile_App',
    auth: 'bearer_token',
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const externalConnectionSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: CONNECTION_TYPES, required: true },
    status: { type: String, enum: CONNECTION_STATUSES, default: 'inactive' },
    category: { type: String, enum: INTEGRATION_CATEGORIES },
    baseUrl: { type: String },
    authMethod: { type: String, enum: AUTH_METHODS, default: 'none' },
    authConfig: { type: Schema.Types.Mixed },
    healthEndpoint: { type: String },
    lastHealthCheck: { type: Date },
    lastHealthStatus: { type: String },
    timeout: { type: Number, default: 30000 },
    retryPolicy: {
      maxRetries: { type: Number, default: 3 },
      delayMs: { type: Number, default: 1000 },
    },
    tags: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
externalConnectionSchema.index({ type: 1, status: 1 });
externalConnectionSchema.index({ category: 1 });

const webhookSubscriptionSchema = new Schema(
  {
    connectionId: { type: Schema.Types.ObjectId, ref: 'DDDExternalConnection', required: true },
    event: { type: String, enum: WEBHOOK_EVENTS, required: true },
    callbackUrl: { type: String, required: true },
    secret: { type: String },
    isActive: { type: Boolean, default: true },
    priority: { type: String, enum: EVENT_PRIORITIES, default: 'medium' },
    filterCriteria: { type: Schema.Types.Mixed },
    lastTriggered: { type: Date },
    failureCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 5 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
webhookSubscriptionSchema.index({ event: 1, isActive: 1 });
webhookSubscriptionSchema.index({ connectionId: 1 });

const integrationEventSchema = new Schema(
  {
    event: { type: String, enum: WEBHOOK_EVENTS, required: true },
    connectionId: { type: Schema.Types.ObjectId, ref: 'DDDExternalConnection' },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'DDDWebhookSubscription' },
    priority: { type: String, enum: EVENT_PRIORITIES, default: 'medium' },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'retrying'],
      default: 'pending',
    },
    responseCode: { type: Number },
    responseBody: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
integrationEventSchema.index({ event: 1, status: 1 });
integrationEventSchema.index({ connectionId: 1, createdAt: -1 });

const apiRegistrationSchema = new Schema(
  {
    name: { type: String, required: true },
    version: { type: String, required: true },
    basePath: { type: String, required: true },
    connectionId: { type: Schema.Types.ObjectId, ref: 'DDDExternalConnection' },
    endpoints: [
      {
        method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: String,
        description: String,
        rateLimit: Number,
      },
    ],
    status: { type: String, enum: ['active', 'deprecated', 'beta', 'retired'], default: 'active' },
    documentation: { type: String },
    rateLimitPerMin: { type: Number, default: 60 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
apiRegistrationSchema.index({ name: 1, version: 1 });
apiRegistrationSchema.index({ status: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDExternalConnection =
  mongoose.models.DDDExternalConnection ||
  mongoose.model('DDDExternalConnection', externalConnectionSchema);
const DDDWebhookSubscription =
  mongoose.models.DDDWebhookSubscription ||
  mongoose.model('DDDWebhookSubscription', webhookSubscriptionSchema);
const DDDIntegrationEvent =
  mongoose.models.DDDIntegrationEvent ||
  mongoose.model('DDDIntegrationEvent', integrationEventSchema);
const DDDApiRegistration =
  mongoose.models.DDDApiRegistration || mongoose.model('DDDApiRegistration', apiRegistrationSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class InteroperabilityHub {
  async createConnection(data) {
    return DDDExternalConnection.create(data);
  }
  async listConnections(filter = {}, page = 1, limit = 20) {
    return DDDExternalConnection.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateConnection(id, data) {
    return DDDExternalConnection.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createSubscription(data) {
    return DDDWebhookSubscription.create(data);
  }
  async listSubscriptions(filter = {}, page = 1, limit = 20) {
    return DDDWebhookSubscription.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createEvent(data) {
    return DDDIntegrationEvent.create(data);
  }
  async listEvents(filter = {}, page = 1, limit = 50) {
    return DDDIntegrationEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async registerApi(data) {
    return DDDApiRegistration.create(data);
  }
  async listApis(filter = {}, page = 1, limit = 20) {
    return DDDApiRegistration.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateApi(id, data) {
    return DDDApiRegistration.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async getHubStats() {
    const [connections, activeWebhooks, events, apis] = await Promise.all([
      DDDExternalConnection.countDocuments({ status: 'active' }),
      DDDWebhookSubscription.countDocuments({ isActive: true }),
      DDDIntegrationEvent.countDocuments(),
      DDDApiRegistration.countDocuments({ status: 'active' }),
    ]);
    return {
      activeConnections: connections,
      activeWebhooks,
      totalEvents: events,
      activeApis: apis,
    };
  }

  async healthCheck() {
    const [connections, subscriptions, events, apis] = await Promise.all([
      DDDExternalConnection.countDocuments(),
      DDDWebhookSubscription.countDocuments(),
      DDDIntegrationEvent.countDocuments(),
      DDDApiRegistration.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'InteroperabilityHub',
      counts: { connections, subscriptions, events, apis },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createInteroperabilityHubRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new InteroperabilityHub();

  router.get('/interoperability-hub/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/interoperability-hub/connections', async (req, res) => {
    try {
      res.status(201).json(await svc.createConnection(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/interoperability-hub/connections', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listConnections(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/interoperability-hub/connections/:id', async (req, res) => {
    try {
      res.json(await svc.updateConnection(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/interoperability-hub/subscriptions', async (req, res) => {
    try {
      res.status(201).json(await svc.createSubscription(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/interoperability-hub/subscriptions', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listSubscriptions(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/interoperability-hub/events', async (req, res) => {
    try {
      res.status(201).json(await svc.createEvent(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/interoperability-hub/events', async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json(await svc.listEvents(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/interoperability-hub/apis', async (req, res) => {
    try {
      res.status(201).json(await svc.registerApi(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/interoperability-hub/apis', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listApis(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/interoperability-hub/stats', async (_req, res) => {
    try {
      res.json(await svc.getHubStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CONNECTION_TYPES,
  CONNECTION_STATUSES,
  WEBHOOK_EVENTS,
  AUTH_METHODS,
  EVENT_PRIORITIES,
  INTEGRATION_CATEGORIES,
  BUILTIN_CONNECTORS,
  DDDExternalConnection,
  DDDWebhookSubscription,
  DDDIntegrationEvent,
  DDDApiRegistration,
  InteroperabilityHub,
  createInteroperabilityHubRouter,
};
