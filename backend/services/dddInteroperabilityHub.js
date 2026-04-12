'use strict';
/**
 * InteroperabilityHub Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddInteroperabilityHub.js
 */

const {
  DDDExternalConnection,
  DDDWebhookSubscription,
  DDDIntegrationEvent,
  DDDApiRegistration,
  CONNECTION_TYPES,
  CONNECTION_STATUSES,
  WEBHOOK_EVENTS,
  AUTH_METHODS,
  EVENT_PRIORITIES,
  INTEGRATION_CATEGORIES,
  BUILTIN_CONNECTORS,
} = require('../models/DddInteroperabilityHub');

const BaseCrudService = require('./base/BaseCrudService');

class InteroperabilityHub extends BaseCrudService {
  constructor() {
    super('InteroperabilityHub', {}, {
      externalConnections: DDDExternalConnection,
      webhookSubscriptions: DDDWebhookSubscription,
      integrationEvents: DDDIntegrationEvent,
      apiRegistrations: DDDApiRegistration,
    });
  }

  async createConnection(data) { return this._create(DDDExternalConnection, data); }
  async listConnections(filter = {}, page = 1, limit = 20) { return this._list(DDDExternalConnection, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateConnection(id, data) { return this._update(DDDExternalConnection, id, data); }

  async createSubscription(data) { return this._create(DDDWebhookSubscription, data); }
  async listSubscriptions(filter = {}, page = 1, limit = 20) { return this._list(DDDWebhookSubscription, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async createEvent(data) { return this._create(DDDIntegrationEvent, data); }
  async listEvents(filter = {}, page = 1, limit = 50) { return this._list(DDDIntegrationEvent, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async registerApi(data) { return this._create(DDDApiRegistration, data); }
  async listApis(filter = {}, page = 1, limit = 20) { return this._list(DDDApiRegistration, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateApi(id, data) { return this._update(DDDApiRegistration, id, data); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new InteroperabilityHub();
