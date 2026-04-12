'use strict';
/**
 * HL7Messaging Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddHL7Messaging.js
 */

const {
  DDDHL7Message,
  DDDMessageRoute,
  DDDMessageAck,
  DDDTransmissionLog,
  MESSAGE_TYPES,
  MESSAGE_EVENTS,
  PROCESSING_STATUSES,
  ACK_CODES,
  SEGMENT_TYPES,
  ENCODING_TYPES,
  BUILTIN_MESSAGE_TEMPLATES,
} = require('../models/DddHL7Messaging');

const BaseCrudService = require('./base/BaseCrudService');

class HL7Messaging extends BaseCrudService {
  constructor() {
    super('HL7Messaging', {}, {
      hL7Messages: DDDHL7Message,
      messageRoutes: DDDMessageRoute,
      messageAcks: DDDMessageAck,
      transmissionLogs: DDDTransmissionLog,
    });
  }

  async createMessage(data) { return this._create(DDDHL7Message, data); }
  async listMessages(filter = {}, page = 1, limit = 20) { return this._list(DDDHL7Message, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async getMessage(id) { return this._getById(DDDHL7Message, id); }
  async updateMessageStatus(id, status) {
    return DDDHL7Message.findByIdAndUpdate(
      id,
      { status, processedAt: new Date() },
      { new: true }
    ).lean();
  }

  async createRoute(data) { return this._create(DDDMessageRoute, data); }
  async listRoutes(filter = {}, page = 1, limit = 20) { return this._list(DDDMessageRoute, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateRoute(id, data) { return this._update(DDDMessageRoute, id, data); }

  async createAck(data) { return this._create(DDDMessageAck, data); }
  async listAcks(filter = {}, page = 1, limit = 20) { return this._list(DDDMessageAck, filter, { page: page, limit: limit, sort: { respondedAt: -1 } }); }

  async logTransmission(data) { return this._create(DDDTransmissionLog, data); }
  async listTransmissions(filter = {}, page = 1, limit = 50) { return this._list(DDDTransmissionLog, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async getMessagingStats() {
    const [messages, activeRoutes, successes, failures] = await Promise.all([
      DDDHL7Message.countDocuments(),
      DDDMessageRoute.countDocuments({ isActive: true }),
      DDDTransmissionLog.countDocuments({ status: 'success' }),
      DDDTransmissionLog.countDocuments({ status: 'failure' }),
    ]);
    return {
      totalMessages: messages,
      activeRoutes,
      successfulTransmissions: successes,
      failedTransmissions: failures,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new HL7Messaging();
